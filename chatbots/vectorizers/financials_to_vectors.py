import os
from typing import List, Dict, Tuple
from dotenv import load_dotenv
from google.oauth2 import service_account
from googleapiclient.discovery import build
import psycopg2
from psycopg2.extras import Json
import json
from openai import OpenAI
import pandas as pd
from datetime import datetime
import logging
import re

# Set up logging
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(levelname)s - %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

def init_alloydb_connection() -> psycopg2.extensions.connection:
    """Initialize connection to AlloyDB."""
    try:
        # Get credentials from environment variables
        host = os.getenv('ALLOYDB_HOST', '35.188.89.30')  # Default to the public IP
        target_db = os.getenv('ALLOYDB_DB', 'farmers_market')  # Database to create/connect to
        db_user = os.getenv('ALLOYDB_USER', 'postgres')
        db_password = os.getenv('ALLOYDB_PASSWORD')
        
        if not db_password:
            raise ValueError("ALLOYDB_PASSWORD environment variable is not set")
        
        # Connection parameters
        conn_params = {
            "host": host,
            "port": 5432,
            "database": "postgres",  # Connect to default postgres database first
            "user": db_user,
            "password": db_password
        }
        
        # Connect to postgres database
        conn = psycopg2.connect(**conn_params)
        
        # Create the target database if it doesn't exist
        conn.autocommit = True  # Required for creating database
        with conn.cursor() as cur:
            # Check if database exists
            cur.execute("SELECT 1 FROM pg_database WHERE datname = %s", (target_db,))
            exists = cur.fetchone()
            
            if not exists:
                # Close existing connections to the database if any
                cur.execute("""
                    SELECT pg_terminate_backend(pg_stat_activity.pid)
                    FROM pg_stat_activity
                    WHERE pg_stat_activity.datname = %s
                    AND pid <> pg_backend_pid()
                """, (target_db,))
                # Create the database
                cur.execute(f"CREATE DATABASE \"{target_db}\"")
        
        # Switch to the target database
        conn_params["database"] = target_db
        conn = psycopg2.connect(**conn_params)
        return conn
        
    except Exception as e:
        raise

class FinancialVectorizer:
    def __init__(self):
        # Initialize Google Docs client
        self.docs_service = self._initialize_google_docs()
        
        # Initialize OpenAI client
        self.openai_client = OpenAI(api_key=os.getenv('OPENAI_API_KEY'))
        
        # Initialize database connection to AlloyDB
        self.db_conn = init_alloydb_connection()
        
        # Ensure database table exists
        self._create_table()

    def _initialize_google_docs(self):
        """Initialize and return Google Docs service using service account."""
        SCOPES = ['https://www.googleapis.com/auth/documents.readonly']
        
        # Get the path to service account file from environment variable
        service_account_file = os.getenv('GOOGLE_SERVICE_ACCOUNT_FILE')
        if not service_account_file:
            raise ValueError("GOOGLE_SERVICE_ACCOUNT_FILE environment variable not set")
            
        try:
            credentials = service_account.Credentials.from_service_account_file(
                service_account_file,
                scopes=SCOPES
            )
            return build('docs', 'v1', credentials=credentials)
        except Exception as e:
            logger.error(f"Error initializing Google Docs service: {e}")
            raise

    def _create_table(self):
        """Create the financial vectors table if it doesn't exist."""
        try:
            with self.db_conn.cursor() as cur:
                # Create vector extension if it doesn't exist
                cur.execute("CREATE EXTENSION IF NOT EXISTS vector;")
                
                # Create the financial_vectors table
                cur.execute("""
                    CREATE TABLE IF NOT EXISTS financial_vectors (
                        id SERIAL PRIMARY KEY,
                        embedding vector(1536),  -- OpenAI embeddings are 1536 dimensions
                        metadata JSONB,
                        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
                    );
                """)
            self.db_conn.commit()
            logger.info("Ensured financial_vectors table and required extensions exist")
        except Exception as e:
            logger.error(f"Error creating table: {e}")
            self.db_conn.rollback()
            raise

    def _extract_doc_id(self, url: str) -> str:
        """Extract document ID from Google Docs URL."""
        if '/document/d/' in url:
            doc_id = url.split('/document/d/')[1].split('/')[0]
        else:
            raise ValueError("Invalid Google Docs URL format")
        return doc_id

    def get_doc_content(self, doc_url: str) -> Tuple[str, str]:
        """Fetch content from Google Doc using document URL."""
        try:
            # Extract document ID from URL
            doc_id = self._extract_doc_id(doc_url)
            
            try:
                # Get document content
                document = self.docs_service.documents().get(documentId=doc_id).execute()
            except Exception as e:
                if 'permission' in str(e).lower() or 'access' in str(e).lower():
                    service_account_email = self.docs_service._http.credentials.service_account_email
                    logger.error(f"Permission denied. Please share the document with: {service_account_email}")
                    raise ValueError(f"Permission denied. Please share the document with: {service_account_email}")
                raise
            
            # Extract text content
            content = ""
            for element in document.get('body', {}).get('content', []):
                if 'paragraph' in element:
                    for para_element in element['paragraph']['elements']:
                        if 'textRun' in para_element:
                            content += para_element['textRun']['content']
                
                elif 'table' in element:
                    for row in element['table'].get('tableRows', []):
                        row_content = []
                        for cell in row.get('tableCells', []):
                            cell_content = ""
                            for cell_element in cell.get('content', []):
                                if 'paragraph' in cell_element:
                                    for text_element in cell_element['paragraph']['elements']:
                                        if 'textRun' in text_element:
                                            cell_content += text_element['textRun']['content'].strip()
                            row_content.append(cell_content)
                        content += "\t".join(row_content) + "\n"
            
            return content.strip(), document.get('title', '')
            
        except Exception as e:
            logger.error(f"Error fetching Google Doc content: {e}")
            raise

    def parse_financial_data(self, data: str) -> pd.DataFrame:
        """Parse the financial data from string format into a DataFrame."""
        try:
            # Split into lines and clean
            lines = [line.strip() for line in data.split('\n') if line.strip()]
            
            # Find the header row (contains 'Vendor' and 'Sales')
            header_idx = -1
            for i, line in enumerate(lines):
                if 'Vendor' in line and 'Sales' in line:
                    header_idx = i
                    break

            if header_idx == -1:
                raise ValueError("Could not find header row with 'Vendor' and 'Sales' columns")

            # Parse headers and clean thoroughly
            headers = [h.strip() for h in lines[header_idx].split('\t') if h.strip()]
            logger.info(f"Processing financial data with columns: {', '.join(headers)}")

            # Parse data rows
            data_rows = []
            for line in lines[header_idx + 1:]:
                # Split by tabs and clean each cell thoroughly
                row = [cell.strip() for cell in line.split('\t')]
                
                # Skip empty rows or rows without enough columns
                if len(row) != len(headers) or not any(row):
                    continue

                # Clean up dollar values
                cleaned_row = []
                for i, value in enumerate(row):
                    if i == 0:  # Vendor name
                        cleaned_row.append(value.strip())
                    else:  # Sales values
                        # Remove $, commas, and all whitespace, then convert to float
                        try:
                            clean_value = value.replace('$', '').replace(',', '').strip()
                            cleaned_row.append(float(clean_value))
                        except ValueError:
                            logger.warning(f"Invalid sales value for {row[0]}: {value}")
                            cleaned_row.append(0.0)
                
                data_rows.append(cleaned_row)

            # Create DataFrame
            df = pd.DataFrame(data_rows, columns=headers)
            
            # Ensure numeric columns are clean
            for col in df.columns:
                if col != 'Vendor':
                    df[col] = pd.to_numeric(df[col], errors='coerce').fillna(0.0)
            
            logger.info(f"Successfully parsed {len(df)} vendor records")
            return df

        except Exception as e:
            logger.error(f"Error parsing financial data: {e}")
            raise

    def create_financial_context(self, df: pd.DataFrame, vendor: str, doc_title: str) -> Dict:
        """Create financial context and metadata from DataFrame."""
        try:
            # Get vendor's data
            vendor_data = df[df['Vendor'] == vendor]
            if vendor_data.empty:
                return {}
            
            # Extract sales data
            sales_data = []
            for col in vendor_data.columns:
                if col != 'Vendor' and 'total' not in col.lower():  # Skip vendor and total columns
                    if 'sales' in col.lower():
                        date_str = col.split(' ')[1] if ' ' in col else col
                        try:
                            sales = float(vendor_data[col].iloc[0])
                            sales_data.append({
                                'date': date_str,
                                'sales': sales
                            })
                        except (ValueError, TypeError) as e:
                            logger.warning(f"Could not convert sales value for {vendor} on {date_str}: {e}")
            
            if not sales_data:
                logger.warning(f"No valid sales data found for vendor {vendor}")
                return {}
            
            # Create natural language context
            context = f"Sales data for {vendor} from {doc_title}:\n"
            for data in sales_data:
                context += f"{data['date']}: ${data['sales']:.2f}\n"
            
            # Create metadata
            metadata = {
                'vendor': vendor,
                'doc_title': doc_title,
                'sales_data': sales_data,
                'last_updated': datetime.now().isoformat(),
                'context': context
            }
            
            return metadata
            
        except Exception as e:
            logger.error(f"Error creating financial context for {vendor}: {e}")
            raise

    def create_embedding(self, text: str) -> List[float]:
        """Create embedding using OpenAI API."""
        try:
            response = self.openai_client.embeddings.create(
                model="text-embedding-3-small",
                input=text
            )
            return response.data[0].embedding
        except Exception as e:
            logger.error(f"Error creating embedding: {e}")
            raise

    def store_vector(self, metadata: Dict):
        """Store or update vector in PostgreSQL."""
        try:
            # Create embedding for the context
            embedding = self.create_embedding(metadata['context'])
            
            # Store in database
            with self.db_conn.cursor() as cur:
                # Check if vector exists for this vendor/month/year
                cur.execute("""
                    SELECT id FROM financial_vectors 
                    WHERE metadata->>'vendor' = %s 
                    AND metadata->>'month' = %s 
                    AND (metadata->>'year')::int = %s;
                """, (metadata['vendor'], metadata['month'], metadata['year']))
                
                existing = cur.fetchone()
                
                if existing:
                    # Update existing vector
                    cur.execute("""
                        UPDATE financial_vectors 
                        SET embedding = %s,
                            metadata = %s,
                            created_at = CURRENT_TIMESTAMP
                        WHERE id = %s;
                    """, (embedding, Json(metadata), existing[0]))
                else:
                    # Insert new vector
                    cur.execute("""
                        INSERT INTO financial_vectors 
                        (embedding, metadata)
                        VALUES (%s, %s);
                    """, (embedding, Json(metadata)))
            
            self.db_conn.commit()
            logger.info(f"Successfully stored vector for {metadata['vendor']} - {metadata['month']} {metadata['year']}")
        except Exception as e:
            logger.error(f"Error storing vector: {e}")
            self.db_conn.rollback()
            raise

    def _extract_month_year(self, content: str, doc_title: str) -> Tuple[str, int]:
        """Extract month and year from document content or title."""
        # List of all months for matching
        months = ['January', 'February', 'March', 'April', 'May', 'June',
                 'July', 'August', 'September', 'October', 'November', 'December']
        
        # First try to find in the title
        title_text = doc_title.lower()
        for month in months:
            if month.lower() in title_text:
                # Look for year in title
                year_match = re.search(r'20\d{2}', doc_title)
                if year_match:
                    return month, int(year_match.group())
        
        # If not in title, look in content
        content_text = content.lower()
        for month in months:
            if month.lower() in content_text:
                # Look for year in nearby context
                year_match = re.search(r'20\d{2}', content)
                if year_match:
                    return month, int(year_match.group())
        
        # If still not found, try to extract from sales dates
        sales_match = re.search(r'Sales\s+(\d{1,2})/\d{1,2}', content)
        if sales_match:
            month_num = int(sales_match.group(1))
            if 1 <= month_num <= 12:
                # Use current year if no year found
                current_year = datetime.now().year
                return months[month_num - 1], current_year
        
        # If all attempts fail, raise an error
        raise ValueError("Could not determine month and year from document. Please ensure the document includes this information.")

    def process_document(self, doc_url: str):
        """Process a Google Doc and store its vector embeddings."""
        try:
            # Get content
            logger.info(f"Fetching content from {doc_url}")
            content, doc_title = self.get_doc_content(doc_url)

            # Vendor Sales 3/2 Sales 3/9 Sales 3/16 Sales 3/23 Sales 3/30 Total
            # MammaMia Florals $570.00 $700.89 $689.00 $930.00 $604.00 $3,493.89





            # Extract month and year
            month, year = self._extract_month_year(content, doc_title)
            logger.info(f"Detected period: {month} {year}")
            
            # Parse the data
            logger.info("Parsing financial data")
            df = self.parse_financial_data(content)
            
            # Process each vendor
            for vendor in df['Vendor'].unique():
                if pd.isna(vendor) or not str(vendor).strip():
                    logger.warning("Skipping empty vendor name")
                    continue
                    
                logger.info(f"Processing vendor: {vendor}")
                
                # Create context and metadata
                metadata = self.create_financial_context(df, vendor, doc_title)
                if not metadata:
                    logger.warning(f"No context generated for {vendor}")
                    continue
                
                # Add month and year to metadata
                metadata['month'] = month
                metadata['year'] = year
                
                # Store vector
                self.store_vector(metadata)
            
            logger.info("Successfully processed all vendors")
            
        except Exception as e:
            logger.error(f"Error processing document: {e}")
            raise
        
    def close(self):
        """Close database connection."""
        self.db_conn.close()

def main():
    # Get document URL
    doc_url = input("Enter Google Doc URL: ")
    
    vectorizer = FinancialVectorizer()
    try:
        vectorizer.process_document(doc_url)
        print("Successfully processed financial data!")
    finally:
        vectorizer.close()

if __name__ == "__main__":
    main() 