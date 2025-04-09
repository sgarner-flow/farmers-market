import os
from typing import List, Dict
from dotenv import load_dotenv
import psycopg2
from psycopg2.extras import Json
import numpy as np
from openai import OpenAI
from urllib.parse import unquote
from google.cloud.sql.connector import Connector
import google.auth
from google.auth import credentials
import logging

# Load environment variables
load_dotenv()

logger = logging.getLogger(__name__)

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

class VectorSearcher:
    def __init__(self):
        # Initialize OpenAI client
        self.openai_client = OpenAI(api_key=os.getenv('OPENAI_API_KEY'))
        
        # Initialize database connection to AlloyDB
        self.db_conn = init_alloydb_connection()
        
        # Initialize conversation history with max length
        self.conversation_history = []
        self.max_history = 5  # Keep only last 5 exchanges

    def _parse_confluence_url(self, url: str) -> Dict[str, str]:
        """Parse a Confluence URL into its components."""
        try:
            # Remove any @ symbol prefix if present
            if url.startswith('@'):
                url = url[1:]
                
            # Split the URL into parts
            parts = url.split('/wiki/spaces/')
            if len(parts) != 2:
                raise ValueError("Invalid Confluence URL format")
            
            base_url = parts[0]
            remaining = parts[1]
            
            # Extract space key (handles personal space format with ~)
            space_parts = remaining.split('/pages/')
            space_key = space_parts[0]
            
            # Extract page ID and title
            page_parts = space_parts[1].split('/', 1)
            page_id = page_parts[0]
            page_title = page_parts[1] if len(page_parts) > 1 else ""
            
            # Clean up the page title - handle URL encoding while preserving special characters
            page_title = unquote(page_title.replace('+', ' ')).strip()
            
            return {
                'base_url': base_url,
                'space_key': space_key,
                'page_id': page_id,
                'page_title': page_title,
                'full_url': url
            }
        except Exception as e:
            raise ValueError(f"Invalid Confluence URL format: {url}")

    def create_embedding(self, text: str) -> List[float]:
        """Create embedding using OpenAI API."""
        try:
            response = self.openai_client.embeddings.create(
                model="text-embedding-3-small",
                input=text
            )
            return response.data[0].embedding
        except Exception as e:
            raise

    def search(self, query: str, num_results: int = 3, similarity_threshold: float = 0.5) -> List[Dict]:
        """Search for similar content using cosine similarity."""
        try:
            # Create embedding for the query
            query_embedding = self.create_embedding(query)
            
            # Convert the embedding to a PostgreSQL vector format
            embedding_array = f"[{','.join(map(str, query_embedding))}]"
            
            # Perform similarity search using cosine similarity
            with self.db_conn.cursor() as cur:
                cur.execute(
                    """
                    WITH similarities AS (
                        SELECT 
                            metadata->>'chunk_text' as content,
                            metadata->>'title' as title,
                            metadata->>'url' as url,
                            1 - (embedding <=> %s::vector) as similarity
                        FROM vectors
                    )
                    SELECT *
                    FROM similarities
                    WHERE similarity > %s
                    ORDER BY similarity DESC
                    LIMIT %s;
                    """,
                    (embedding_array, similarity_threshold, num_results)
                )
                
                results = []
                for row in cur.fetchall():
                    content, title, url, similarity = row
                    results.append({
                        'content': content,
                        'title': title,
                        'url': url,
                        'similarity': float(similarity)
                    })
                
                return results
                
        except Exception as e:
            raise

    def generate_ai_response(self, query: str, results: List[Dict]) -> str:
        """Generate a natural language response using GPT-4 based on search results."""
        try:
            # Use consistent similarity threshold
            similarity_threshold = 0.5
            filtered_results = [r for r in results if r['similarity'] > similarity_threshold]
            
            # Take top 3 results max
            filtered_results = filtered_results[:3]
            
            # Prepare the context from filtered results
            context = "\n\n".join([
                f"Content (similarity {r['similarity']:.2f}): {r['content']}"
                for r in filtered_results
            ])
            
            # Maintain limited conversation history
            if len(self.conversation_history) > self.max_history * 2:
                self.conversation_history = self.conversation_history[-self.max_history * 2:]
            
            # Dynamically set max tokens based on query complexity
            query_words = len(query.split())
            if query_words < 5:  # Short queries like "What are the hours?"
                max_tokens = 500
            elif query_words < 10:  # Medium queries
                max_tokens = 750
            else:  # Complex queries needing more detailed responses
                max_tokens = 1500
                
            # Adjust temperature based on query type
            temperature = 0.3 if any(word in query.lower() for word in ['requirements', 'rules', 'must', 'policy']) else 0.5
            
            # Create the base system message
            system_message = {
                "role": "system", 
                "content": """You are an expert farmers' market consultant and AI assistant, specializing in vendor management, market diversity, and local food systems. Your role is to help market organizers find new vendors, vet their applications, and ensure they are a good fit for the market.

IMPORTANT: Never create, fabricate vendor names, contact information, or other vendor-specific details. Instead, focus on:

1. Vendor Categories to Consider:
   - Search for and verify real vendors in these categories:
   - Fresh produce vendors (farms, orchards, growers)
   - Artisanal food producers (bakeries, confectioners)
   - Specialty vendors (fishmongers, butchers, dairy farms)
   - Value-added product makers (preserves, sauces, condiments)
   - Prepared food vendors (food trucks, caterers)
   - Craft/non-food vendors (artisans, craftspeople)

3. Market Balance Insights:
   - Recommended mix of vendor types
   - Space allocation guidelines
   - Seasonal considerations
   - Market flow and layout suggestions

4. Compliance Focus:
   - Food safety requirements
   - Local regulations
   - Insurance needs
   - Documentation requirements

5. Evaluation Criteria:
   - Quality standards
   - Product diversity considerations
   - Operational capability requirements
   - Track record indicators to look for

Remember:
- Try not to be too verbose or generalized.
- Provide the names of actual vendors that exist if you can, but don't make them up. Make an effort to provide contactinformation and URLs if you can.
- Be direct and factual in your responses.

When suggesting vendors:
- Only reference real, verifiable businesses
- Include location and market experience when available
- Provide links or sources to verify vendor information
- Cross-reference against our market requirements
- DO NOT fabricate or hallucinate vendor details."""
            }
            
            # Combine system message, conversation history, and new query
            messages = [system_message] + self.conversation_history + [
                {"role": "user", "content": f"Based on the following content:\n\n{context}\n\nQuestion: {query}\n\nPlease provide a focused response following the guidelines above."}
            ]
            
            # Get response from GPT-4
            response = self.openai_client.chat.completions.create(
                model="gpt-4-turbo-preview",  # Using GPT-4 Turbo
                messages=messages,
                temperature=temperature,
                max_tokens=max_tokens,
                top_p=0.9,
                presence_penalty=0.3,
                frequency_penalty=0.3,
                store=False
            )
            
            # Update conversation history
            self.conversation_history.extend([
                {"role": "user", "content": query},
                {"role": "assistant", "content": response.choices[0].message.content}
            ])
            
            return response.choices[0].message.content
            
        except Exception as e:
            return "Sorry, I couldn't generate a response at this time."

    def chat(self):
        """Interactive chat interface."""
        print("\nWelcome to the AI Chat! Type 'quit' to exit or 'clear' to start a new conversation.\n")
        
        # Define consistent parameters
        similarity_threshold = 0.5
        max_results = 10
        
        while True:
            # Get user input
            query = input("\nYou: ").strip()
            
            # Check for special commands
            if query.lower() == 'quit':
                break
            elif query.lower() == 'clear':
                self.conversation_history = []
                print("\nConversation history cleared. Starting fresh!")
                continue
            
            try:
                # Perform search
                results = self.search(query, num_results=max_results, similarity_threshold=similarity_threshold)
                
                # Generate and display AI response
                print("\nGenerating response...")
                ai_response = self.generate_ai_response(query, results)
                print("\nAI: ", ai_response)
                print("\n" + "-" * 80 + "\n")  # Add a clear separator line
                
            except Exception as e:
                print("\nSorry, I encountered an error. Please try again.")

    def close(self):
        """Close database connection."""
        self.db_conn.close()

def get_chat_response(query: str) -> str:
    """
    Get a response from the vendor chatbot for a given query.
    
    Args:
        query (str): The user's question or prompt
        
    Returns:
        str: The AI's response to the query
    """
    searcher = VectorSearcher()
    try:
        results = searcher.search(query)
        return searcher.generate_ai_response(query, results)
    finally:
        searcher.close()

def main():
    searcher = VectorSearcher()
    try:
        searcher.chat()
    finally:
        searcher.close()

if __name__ == "__main__":
    main() 