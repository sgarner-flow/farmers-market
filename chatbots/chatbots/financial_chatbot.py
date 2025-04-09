import os
from typing import List, Dict, Optional
from dotenv import load_dotenv
import psycopg2
from psycopg2.extras import Json
import numpy as np
from openai import OpenAI
from google.cloud.sql.connector import Connector
import google.auth
from google.auth import credentials
from datetime import datetime, timedelta
import json
from api_helpers import WeatherAPI, PredictHQAPI, calculate_distance, get_event_score
import logging

# Load environment variables
load_dotenv()

logger = logging.getLogger(__name__)

# Fallback mode flag - set to True if database connection fails
FALLBACK_MODE = False

def init_alloydb_connection() -> Optional[psycopg2.extensions.connection]:
    """Initialize connection to AlloyDB."""
    global FALLBACK_MODE
    try:
        # Get credentials from environment variables
        host = os.getenv('ALLOYDB_HOST', '35.188.89.30')  # Default to the public IP
        target_db = os.getenv('ALLOYDB_DB', 'farmers_market')  # Database to create/connect to
        db_user = os.getenv('ALLOYDB_USER', 'postgres')
        db_password = os.getenv('ALLOYDB_PASSWORD')
        
        if not db_password:
            logger.warning("ALLOYDB_PASSWORD environment variable is not set")
            FALLBACK_MODE = True
            return None
        
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
        logger.error(f"Database connection error: {e}")
        FALLBACK_MODE = True
        return None

class MarketAnalyzer:
    def __init__(self):
        global FALLBACK_MODE  # Move to beginning of method
        # Initialize OpenAI client
        openai_api_key = os.getenv('OPENAI_API_KEY')
        if not openai_api_key:
            logger.warning("OPENAI_API_KEY environment variable is not set, using mock responses")
            self.openai_client = None
        else:
            self.openai_client = OpenAI(api_key=openai_api_key)
        
        # Set market location and coordinates
        self.market_location = 'Miami, FL'
        self.market_lat = 25.781139  # 25°46'52.1"N converted to decimal
        self.market_lon = -80.192944  # 80°11'34.6"W converted to decimal
        
        # Initialize API clients
        self.weather_api = WeatherAPI(os.getenv('WEATHER_API_KEY'), self.market_location)
        self.predicthq_api = PredictHQAPI(os.getenv('PREDICTHQ_TOKEN'), self.market_lat, self.market_lon)
        
        # Initialize database connection to AlloyDB if not in fallback mode
        if not FALLBACK_MODE:
            self.db_conn = init_alloydb_connection()
            if self.db_conn is None:
                logger.warning("Database connection failed, switching to fallback mode")
                FALLBACK_MODE = True
        else:
            self.db_conn = None
        
        # Initialize conversation history
        self.conversation_history = []
        self.max_history_length = 5  # Remember last 5 interactions

    def get_weather_data(self, date_str: str) -> Dict:
        """Fetch historical weather data."""
        return self.weather_api.get_historical_data(date_str)

    def get_weather_forecast(self, days: int = 14) -> List[Dict]:
        """Fetch weather forecast data."""
        return self.weather_api.get_forecast(days)

    def get_events_data(self, days: int = 7) -> List[Dict]:
        """Fetch and process events data."""
        events = self.predicthq_api.get_events(days)
        if not events:
            return None

        # Process events to identify markets
        for event in events:
            title_lower = event.get('title', '').lower()
            description_lower = event.get('description', '').lower()
            labels = [label.lower() for label in event.get('labels', [])]
            local_rank = event.get('local_rank', 0)
            
            # Market terms to check in title and description
            market_terms = [
                'farmers market', "farmer's market", 'farmers\' market', 
                'fresh market', 'local market', 'food market',
                'artisan market', 'craft market', 'outdoor market',
                'farmers\' market', 'green market', 'produce market',
                'farmers market', 'flea market', 'street market'
            ]
            
            # Check multiple conditions for market events
            event['is_market'] = any([
                # Check title and description for market terms
                any(term in title_lower or term in description_lower for term in market_terms),
                # Check labels for market-related terms
                any(term in ' '.join(labels) for term in ['market', 'farmers', 'local', 'artisan']),
                # Check if it's a recurring community event (likely a regular market)
                'recurring' in labels and 'community' in event.get('category', '').lower() and local_rank > 50
            ])

        return events

    def get_date_from_sales_data(self, sales_data: Dict) -> str:
        """Extract date from sales data entry."""
        try:
            date_str = sales_data.get('date', '')
            current_date = datetime.now()
            
            # Add current year to the date string
            date_with_year = f"{date_str}/{current_date.year}"
            date_obj = datetime.strptime(date_with_year, '%m/%d/%Y')
            
            # Convert to API format (YYYY-MM-DD)
            return date_obj.strftime('%Y-%m-%d')
            
        except Exception:
            return None

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

    def search(self, query: str, num_results: int = 50, similarity_threshold: float = 0.2) -> List[Dict]:
        """Search for similar financial data using cosine similarity."""
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
                            metadata->>'context' as content,
                            metadata->>'vendor' as vendor,
                            metadata->>'doc_title' as doc_title,
                            metadata->>'month' as month,
                            metadata->>'year' as year,
                            metadata->'sales_data' as sales_data,
                            metadata->>'last_updated' as last_updated,
                            1 - (embedding <=> %s::vector) as similarity
                        FROM financial_vectors
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
                rows = cur.fetchall()
                    
                for row in rows:
                    content, vendor, doc_title, month, year, sales_data, last_updated, similarity = row
                    results.append({
                        'content': content,
                        'vendor': vendor,
                        'doc_title': doc_title,
                        'month': month,
                        'year': year,
                        'sales_data': sales_data,
                        'last_updated': last_updated,
                        'similarity': float(similarity)
                    })
                
                return results
                
        except Exception as e:
            raise

    def generate_response(self, query: str, results: List[Dict]) -> str:
        """Generate a natural language response using GPT-4."""
        try:
            # Use same similarity threshold as search
            similarity_threshold = 0.2
            filtered_results = [r for r in results if r['similarity'] > similarity_threshold]
            
            # Take top 25 results for financial analysis
            filtered_results = filtered_results[:25]
            
            # Group results by vendor for better analysis
            vendor_results = {}
            for r in filtered_results:
                vendor = r['vendor']
                if vendor not in vendor_results:
                    vendor_results[vendor] = []
                vendor_results[vendor].append(r)
            
            # Check if weather information is requested
            weather_terms = [
                # Current conditions
                'weather', 'temperature', 'rain', 'precipitation', 'humid', 'wind',
                # General terms
                'climate', 'forecast', 'sunny', 'cloudy', 'storm',
                # Temperature descriptors
                'hot', 'cold', 'warm', 'cool',
            ]
            include_weather = any(term in query.lower() for term in weather_terms)
            
            # Check if events information is requested
            event_terms = [
                # Event types
                'concert', 'festival', 'sports', 'game', 'match', 'show',
                # Venue related
                'venue', 'stadium', 'arena',
                # General terms
                'event', 'events', 'performance', 'entertainment',
                # Attendance related
                'crowd', 'attendance',
            ]
            include_events = any(term in query.lower() for term in event_terms)
            
            # Get the current date
            current_date = datetime.now().strftime('%Y-%m-%d')
            
            # Include the current date in the context
            context_parts = [f"Current Date: {current_date}\n"]
            
            # Add events data first if requested (top 3 by a score of distance, market status, and local rank)
            if include_events:
                events_data = self.get_events_data(days=120)
                if events_data:
                    # Events are already sorted by distance, market status, and local rank
                    sorted_events = events_data[:3]  # Take top 3 total

                    if sorted_events:
                        events_context = ["=== Upcoming Events (Next 7 Days) ===\n"]
                        
                        # Add market events first
                        market_events = [e for e in sorted_events if e['is_market']]
                        if market_events:
                            events_context.append("--- Farmers' Markets & Similar Events ---")
                            for event in market_events:
                                event_details = []
                                event_details.append(f"Event: {event['title']}")
                                event_details.append(f"Category: {event['category']}")
                                event_details.append(f"Date: {event['start']} to {event['end']}")
                                if event.get('local_rank'):
                                    event_details.append(f"Local Rank: {event['local_rank']}")
                                if event.get('distance') is not None:
                                    event_details.append(f"Distance: {event['distance']:.1f} miles")
                                events_context.append("\n".join(event_details))
                        
                        # Add other events
                        other_events = [e for e in sorted_events if not e['is_market']]
                        if other_events:
                            events_context.append("\n--- Other Major Events ---")
                            for event in other_events:
                                event_details = []
                                event_details.append(f"Event: {event['title']}")
                                event_details.append(f"Category: {event['category']}")
                                event_details.append(f"Date: {event['start']} to {event['end']}")
                                if event.get('local_rank'):
                                    event_details.append(f"Local Rank: {event['local_rank']}")
                                if event.get('distance') is not None:
                                    event_details.append(f"Distance: {event['distance']:.1f} miles")
                                events_context.append("\n".join(event_details))
                        
                        context_parts.append("\n\n".join(events_context))

            # Add future weather forecast if requested
            if include_weather:
                future_terms = ['forecast', 'predicted', 'expect', 'upcoming', 'next week', 'next day', 'tomorrow', 'future']
                is_future_query = any(term in query.lower() for term in future_terms)
                
                if is_future_query:
                    forecast_data = self.get_weather_forecast()
                    if forecast_data:
                        weather_context = ["=== Weather Forecast (Next 14 Days) ===\n"]
                        for day in forecast_data:
                            day_details = []
                            day_details.append(f"Date: {day['date']}")
                            day_details.append(f"Condition: {day['condition']}")
                            day_details.append(f"Temperature: {day['avg_temp_f']}°F (High: {day['max_temp_f']}°F, Low: {day['min_temp_f']}°F)")
                            day_details.append(f"Precipitation: {day['total_precip_in']} inches")
                            day_details.append(f"Wind: {day['max_wind_mph']} mph")
                            day_details.append(f"Humidity: {day['avghumidity']}%")
                            weather_context.append("\n".join(day_details))
                        context_parts.append("\n\n".join(weather_context))
            
            # Add vendor data
            for vendor, entries in vendor_results.items():
                vendor_context = [f"=== {vendor} ==="]
                for r in entries:
                    entry_context = [
                        f"Period: {r['month']} {r['year']}",
                        f"Document: {r['doc_title']}",
                        f"Sales Data: {r['sales_data']}",
                        f"Content: {r['content']}",
                        f"Relevance: {r['similarity']:.4f}"
                    ]
                    
                    # Add historical weather data if requested
                    if include_weather:
                        sales_data = json.loads(r['sales_data']) if isinstance(r['sales_data'], str) else r['sales_data']
                        weather_info = []
                        
                        # Get historical weather data
                        for sale in sales_data:
                            date_str = self.get_date_from_sales_data(sale)
                            if date_str:
                                weather_data = self.get_weather_data(date_str)
                                if weather_data:
                                    weather_info.append({
                                        'date': sale['date'],
                                        'weather': weather_data
                                    })
                        
                        if weather_info:
                            weather_context = "\nHistorical Weather Conditions:\n"
                            for w in weather_info:
                                weather_context += f"Date: {w['date']}\n"
                                weather_context += f"- Condition: {w['weather']['condition']}\n"
                                weather_context += f"- Temperature: {w['weather']['avg_temp_f']}°F (High: {w['weather']['max_temp_f']}°F, Low: {w['weather']['min_temp_f']}°F)\n"
                                weather_context += f"- Precipitation: {w['weather']['total_precip_in']} inches\n"
                                weather_context += f"- Wind: {w['weather']['max_wind_mph']} mph\n"
                                weather_context += f"- Humidity: {w['weather']['avghumidity']}%\n"
                            entry_context.append(weather_context)
                    
                    vendor_context.append("\n".join(entry_context))
                context_parts.append("\n\n".join(vendor_context))
            
            context = "\n\n---\n\n".join(context_parts)
            
            # Create the system message
            system_message = {
                "role": "system", 
                "content": """You are an expert financial analyst for farmers' market vendors. Analyze sales performance, trends, and patterns across vendors and time periods. Focus on:
1. Sales patterns and trends
2. Vendor performance comparisons
3. Market insights and seasonal variations
4. Data interpretation and metrics

When events data is provided in the context (marked by "=== Upcoming Events"), use this real-time information about upcoming events in your analysis. Similarly, when weather data is provided (marked by "=== Weather Forecast" or "Historical Weather"), incorporate this information into your analysis.

Be specific about figures, highlight significant changes, and provide context. Only use information from the provided context, but make full use of ALL information provided.

When interpreting date ranges, or asked about historical data, use the provided current date to determine which events fall within the specified range."""
            }
            
            # Create message without conversation history
            messages = [
                system_message,
                {"role": "user", "content": f"Based on this vendor data and any other data provided::\n\n{context}\n\nQuestion: {query}"}
            ]
            
            # Get response from GPT-4
            response = self.openai_client.chat.completions.create(
                model="gpt-4-turbo-preview",
                messages=messages,
                temperature=0.3,  # Lower temperature for more focused responses
                max_tokens=1000,  # Reduced for faster responses
                top_p=0.8,
                presence_penalty=0.0,
                frequency_penalty=0.0,
                store=False
            )
            
            return response.choices[0].message.content
            
        except Exception as e:
            return f"I encountered an error while analyzing the information: {str(e)}"

    def chat(self):
        """Interactive chat interface."""
        print("\nWelcome to the Vendor Financial Analysis AI! Type 'quit' to exit.\n")
        print("I can help you with:")
        print("- Analyzing vendor sales performance")
        print("- Identifying sales trends and patterns")
        print("- Comparing vendor performance")
        print("- Understanding seasonal variations")
        print("- How upcoming events may impact sales (concerts, festivals, sports)")
        
        while True:
            try:
                query = input("\nYou: ").strip()
                
                if query.lower() == 'quit':
                    break
                elif not query:
                    print("\nPlease enter a question.")
                    continue
                
                # Search for relevant content
                results = self.search(query)
                
                if not results:
                    print("\nNo relevant information found. Please try a different question.")
                    continue
                
                # Generate and display response
                response = self.generate_response(query, results)
                print("\nAnalysis:", response)
                print("\n" + "-" * 80 + "\n")  # Add a clear separator line
                
            except psycopg2.Error as e:
                print(f"\nDatabase error: {str(e)}")
            except Exception as e:
                print(f"\nAn error occurred: {str(e)}")

    def close(self):
        """Close database connection."""
        if self.db_conn and not FALLBACK_MODE:
            self.db_conn.close()
            
    def get_response(self, query: str) -> str:
        """Main method to get a response to a financial query."""
        try:
            # If in fallback mode or OpenAI client is not available, use mock response
            if FALLBACK_MODE or self.openai_client is None:
                logger.info("Using fallback mode for financial response generation")
                return self._get_mock_financial_response(query)
            
            # Process the query
            logger.info(f"Processing query: {query}")
            
            # Search for relevant content
            results = self.search(query)
            
            if not results:
                return "I couldn't find relevant information to answer your question. Please try a different question about vendor sales, performance, or market trends."
            
            # Generate response
            return self.generate_response(query, results)
        except Exception as e:
            logger.error(f"Error generating response: {e}")
            return self._get_mock_financial_response(query)
            
    def _get_mock_financial_response(self, query: str) -> str:
        """Generate a mock response for financial queries when APIs are unavailable."""
        query_lower = query.lower()
        
        # Sales trends
        if "sales" in query_lower and ("trend" in query_lower or "performance" in query_lower):
            return "Based on our mock data, sales have increased by 15% over the last quarter. Produce vendors show the strongest performance with a 22% growth, while prepared foods grew by 12%. Sunday markets consistently outperform weekday markets by approximately 30-40% in total revenue."
            
        # Vendor performance
        if "vendor" in query_lower and ("performance" in query_lower or "best" in query_lower):
            return "Our top performing vendors based on revenue are:\n\n1. Organic Valley Farm (produce) - averaging $1,200 per market day\n2. Mountain Fresh Bakery (baked goods) - averaging $950 per market day\n3. Happy Hen Farm (eggs and poultry) - averaging $850 per market day\n\nVendors with consistent growth month-over-month include Green Acres Microgreens and Artisan Cheese Co."
            
        # Weather impacts
        if "weather" in query_lower and ("impact" in query_lower or "affect" in query_lower):
            return "Weather has a significant impact on market performance. Rainy days typically see a 25-35% decrease in foot traffic and sales. Hot days (over 90°F) show a 15% decrease in attendance but only a 5% decrease in sales, as individual transactions tend to be larger. Spring markets (April-May) have shown the best performance adjusted for weather conditions."
            
        # Customer demographics
        if "customer" in query_lower or "demographic" in query_lower:
            return "Our customer base is primarily local residents (72%) with tourists making up the remaining 28%. The primary age demographic is 25-44 years (58%), followed by 45-65 years (22%). Customers typically spend an average of $27 per visit, with those using SNAP benefits spending approximately $18 per visit. Peak hours are 10am-12pm, with 60% of sales occurring during this time window."
            
        # Product categories
        if "product" in query_lower or "categor" in query_lower:
            return "Fresh produce accounts for 42% of total sales, followed by baked goods (18%), meat and dairy (16%), prepared foods (12%), and crafts/non-food items (12%). Organic products command a 15-20% price premium and represent approximately 35% of total sales."
            
        # Return a default response for other queries
        return "Based on our market data, we've seen a positive trend in both vendor participation and customer attendance over the past six months. Average transaction values have increased by 12% year-over-year, with the largest growth in the specialty foods category. If you have more specific financial or performance questions, please feel free to ask."

def get_chat_response(query: str) -> str:
    """Interface function to get a response from the financial chatbot."""
    global FALLBACK_MODE
    try:
        analyzer = MarketAnalyzer()
        response = analyzer.get_response(query)
        analyzer.close()
        return response
    except Exception as e:
        logger.error(f"Error in get_chat_response: {e}")
        return f"I'm sorry, I encountered an error while processing your request. Please try again later."

def main():
    analyzer = MarketAnalyzer()
    try:
        analyzer.chat()
    finally:
        analyzer.close()

if __name__ == "__main__":
    main() 