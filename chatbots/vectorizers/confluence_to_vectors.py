import os
from typing import List, Dict, Optional
from dotenv import load_dotenv
from atlassian import Confluence
import psycopg2
from psycopg2.extras import Json
import json
from openai import OpenAI
from langchain_text_splitters import RecursiveCharacterTextSplitter
import tiktoken
import logging
import numpy as np
from google.cloud import alloydb_v1
from google.cloud.alloydb_v1.types import Instance

# Set up logging
logging.basicConfig(level=logging.INFO)
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

class ConfluenceVectorizer:
    def __init__(self):
        # Initialize Confluence clientdo w 
        self.confluence = Confluence(
            url=os.getenv('CONFLUENCE_URL'),
            username=os.getenv('CONFLUENCE_USERNAME'),
            password=os.getenv('CONFLUENCE_API_TOKEN')
        )
        
        # Initialize OpenAI client
        self.openai_client = OpenAI(api_key=os.getenv('OPENAI_API_KEY'))
        
        # Initialize database connection to AlloyDB
        self.db_conn = init_alloydb_connection()
        
        # Initialize text splitter with HTML-aware settings
        self.text_splitter = RecursiveCharacterTextSplitter.from_language(
            language="html",
            chunk_size=1000,
            chunk_overlap=200,
            length_function=len
        )
        
        # Ensure database table exists
        self._create_vectors_table()

    def _create_vectors_table(self):
        """Create the vectors table if it doesn't exist."""
        try:
            with self.db_conn.cursor() as cur:
                # Create vector extension if it doesn't exist
                cur.execute("CREATE EXTENSION IF NOT EXISTS vector;")
                
                # Create the vectors table
                cur.execute("""
                    CREATE TABLE IF NOT EXISTS vectors (
                        id SERIAL PRIMARY KEY,
                        embedding vector(1536),  -- OpenAI embeddings are 1536 dimensions
                        metadata JSONB,
                        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
                    );
                """)
            self.db_conn.commit()
            logger.info("Ensured vectors table and required extensions exist")
        except Exception as e:
            logger.error(f"Error creating vectors table: {e}")
            self.db_conn.rollback()
            raise

    def get_confluence_content(self, page_url: str) -> str:
        """Fetch content from Confluence page using full URL."""
        try:
            # Remove any @ symbol prefix if present
            if page_url.startswith('@'):
                page_url = page_url[1:]

            # Remove any query parameters and trailing slashes
            clean_url = page_url.split('?')[0].rstrip('/')
            
            # Parse the URL components
            url_parts = clean_url.split('/spaces/')
            if len(url_parts) != 2:
                raise ValueError("Invalid Confluence URL format")
            
            # Get space key and remaining path
            space_and_path = url_parts[1]
            space_parts = space_and_path.split('/pages/')
            if len(space_parts) != 2:
                raise ValueError("Invalid Confluence URL format")
            
            space_key = space_parts[0]
            page_path = space_parts[1]
            
            # Extract page ID (this is stable even if title changes)
            page_id = page_path.split('/')[0]
            
            logger.info(f"Fetching content for page ID: {page_id} in space: {space_key}")
            
            # Get content using the REST API with page ID
            content = self.confluence.get(
                'rest/api/content/' + page_id,
                params={
                    'expand': 'body.storage,space'
                }
            )
            
            if content:
                page_content = content.get('body', {}).get('storage', {}).get('value', '')
                
                # Store metadata about the source
                self.page_metadata = {
                    'title': content.get('title', ''),
                    'id': content.get('id', ''),
                    'url': page_url,
                    'space': content.get('space', {}).get('key', '')
                }
                
                return page_content
            else:
                raise Exception(f"Page not found or no access. Page ID: {page_id}")
                
        except Exception as e:
            logger.error(f"Error fetching Confluence content: {e}")
            raise

    def chunk_text(self, text: str) -> List[str]:
        """Split text into chunks."""
        return self.text_splitter.split_text(text)

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

    def store_vector(self, embedding: List[float], metadata: Dict):
        """Store or update vector in PostgreSQL based on content changes."""
        try:
            # Check if this chunk exists and get its content and metadata
            with self.db_conn.cursor() as cur:
                logger.debug("Checking for existing vector...")
                cur.execute(
                    """
                    SELECT id, metadata->>'chunk_text' as chunk_text, metadata 
                    FROM vectors 
                    WHERE metadata->>'id' = %s 
                    AND metadata->>'chunk_index' = %s;
                    """,
                    (metadata['id'], str(metadata['chunk_index']))
                )
                existing = cur.fetchone()
                
                if existing:
                    existing_id, existing_text, existing_metadata = existing
                    # Check if either content or metadata (like title) has changed
                    content_changed = existing_text != metadata['chunk_text']
                    metadata_changed = existing_metadata.get('title') != metadata.get('title')
                    
                    if content_changed or metadata_changed:
                        logger.info(f"Updates detected for page ID {metadata['id']}, chunk {metadata['chunk_index']}:")
                        if content_changed:
                            logger.info("- Content has changed")
                        if metadata_changed:
                            logger.info(f"- Title changed from '{existing_metadata.get('title')}' to '{metadata.get('title')}'")
                        
                        logger.info(f"Updating vector ID {existing_id} in database...")
                        cur.execute(
                            """
                            UPDATE vectors 
                            SET embedding = %s, metadata = %s, created_at = CURRENT_TIMESTAMP
                            WHERE id = %s;
                            """,
                            (embedding, Json(metadata), existing_id)
                        )
                        self.db_conn.commit()
                        logger.info(f"Successfully updated vector ID {existing_id}")
                    else:
                        logger.info(f"Content and metadata unchanged for page ID {metadata['id']}, chunk {metadata['chunk_index']}. Skipping...")
                    return

            # If no existing vector found, insert new one
            logger.info(f"No existing vector found. Inserting new vector with metadata: {json.dumps(metadata, indent=2)}")
            with self.db_conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO vectors (embedding, metadata)
                    VALUES (%s, %s)
                    RETURNING id;
                    """,
                    (embedding, Json(metadata))
                )
                inserted_id = cur.fetchone()[0]
                self.db_conn.commit()
                logger.info(f"Successfully inserted new vector with ID: {inserted_id}")
            
        except Exception as e:
            logger.error(f"Error storing vector: {e}")
            logger.error(f"Embedding length: {len(embedding)}")
            logger.error("Rolling back transaction...")
            self.db_conn.rollback()
            raise

    def process_page(self, page_url: str):
        """Process a Confluence page and store its vector embeddings."""
        try:
            # Get content
            logger.info(f"Fetching content from {page_url}")
            content = self.get_confluence_content(page_url)
            
            # Chunk content
            logger.info("Chunking content")
            chunks = self.chunk_text(content)
            logger.info(f"Created {len(chunks)} chunks")
            
            # Process each chunk
            for i, chunk in enumerate(chunks):
                logger.info(f"Processing chunk {i+1}/{len(chunks)}")
                
                # Create embedding
                embedding = self.create_embedding(chunk)
                
                # Prepare metadata
                metadata = {
                    **self.page_metadata,
                    'chunk_index': i,
                    'total_chunks': len(chunks),
                    'chunk_text': chunk
                }
                
                # Store in database
                self.store_vector(embedding, metadata)
                
            logger.info("Successfully processed all chunks")
            
        except Exception as e:
            logger.error(f"Error processing page: {e}")
            raise
        
    def close(self):
        """Close database connection."""
        self.db_conn.close()

def main():
    # Get page URL from command line or environment
    page_url = input("Enter Confluence page URL: ")
    
    vectorizer = ConfluenceVectorizer()
    try:
        vectorizer.process_page(page_url)
    finally:
        vectorizer.close()

if __name__ == "__main__":
    main() 