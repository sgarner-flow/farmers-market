import http.server
import socketserver
import json
import urllib.parse
import os
import sys
from datetime import datetime
import random
import openai
import csv

# Configure OpenAI API key
openai_api_key = os.environ.get('OPENAI_API_KEY')
if not openai_api_key:
    print("WARNING: OPENAI_API_KEY environment variable not set. OpenAI integration will not work.")
else:
    openai.api_key = openai_api_key
    
# Path to the sales data CSV file
SALES_CSV_PATH = "../src/sales.csv"

# Load sales data from CSV
def load_sales_data():
    try:
        with open(SALES_CSV_PATH, 'r') as file:
            return file.read()
    except Exception as e:
        print(f"Error loading sales data: {e}")
        return "Error: Could not load sales data"

# Mock data for the vendor responses
VENDOR_RESPONSES = [
    "Based on our vendor selection criteria, which focuses on local, sustainable farming practices within 100 miles, I recommend the following vendors for the Flow Farmers Market:\n\n1. Fresh Harvest Farms - Email: info@freshharvest.com\n2. Artisan Cheese Co. - Website: www.artisancheese.com\n3. Green Valley Bakery - Email: contact@greenvalleybakery.com",
    
    "I've analyzed our vendor database and found several high-quality vendors that match Flow's emphasis on organic and sustainable practices:\n\n1. Sunny Meadows Organic - Email: hello@sunnymeadows.org\n2. Happy Hen Farm (free-range eggs) - Website: happyhenfarm.com\n3. Mountain Fresh Dairy - Email: orders@mountainfreshdairy.com\n4. Wildflower Honey Co. - Website: wildflowerhoney.net",
    
    "For Flow Farmers Market, I recommend these vendors who align with our quality standards and sustainability focus:\n\n1. Heritage Farms (heritage vegetables) - Email: contact@heritagefarms.com\n2. Sweet Acres Berries - Website: sweetacresberries.com\n3. Artisanal Bread Company - Email: info@artisanalbread.com"
]

def parse_vendors_from_response(response):
    """Parse vendor information from the response text."""
    vendors = []
    lines = response.split('\n')
    current_vendor = {}
    
    for line in lines:
        line = line.strip()
        if not line:
            # Empty line might separate vendors
            if current_vendor and 'name' in current_vendor:
                vendors.append(current_vendor)
                current_vendor = {}
            continue
            
        # Check for vendor name patterns
        if line.startswith(('1.', '2.', '3.', '4.', '5.', '- ', '* ')) or line.lower().startswith(('vendor:', 'business:', 'name:')):
            # If we were already processing a vendor, save it before starting a new one
            if current_vendor and 'name' in current_vendor:
                vendors.append(current_vendor)
                current_vendor = {}
            
            # Extract the name
            if ':' in line:
                parts = line.split(':', 1)
                if len(parts) > 1:
                    name = parts[1].strip()
                else:
                    # Handle cases where there's a colon but no content after it
                    name = line.lstrip('1234567890.- *').strip()
            else:
                name = line.lstrip('1234567890.- *').strip()
                # If there's a description in parentheses, extract just the name
                if '(' in name:
                    name = name.split('(')[0].strip()
            
            current_vendor = {'name': name}
            continue
            
        # Look for email and website
        if 'email' in line.lower() and ':' in line:
            email = line.split(':', 1)[1].strip()
            current_vendor['email'] = email
        elif 'website' in line.lower() and ':' in line:
            website = line.split(':', 1)[1].strip()
            current_vendor['website'] = website
        elif '@' in line and 'email' not in current_vendor:
            # Assume this is an email if it contains @ and we don't have an email yet
            current_vendor['email'] = line.strip()
        elif any(domain in line.lower() for domain in ['.com', '.org', '.net', 'http']) and 'website' not in current_vendor:
            # Assume this is a website
            current_vendor['website'] = line.strip()
    
    # Add the last vendor if not already added
    if current_vendor and 'name' in current_vendor and current_vendor not in vendors:
        vendors.append(current_vendor)
    
    return vendors

# Function to get response from OpenAI
def get_openai_response(user_query, sales_data):
    if not openai_api_key:
        return "Error: OpenAI API key not configured. Please set the OPENAI_API_KEY environment variable."
    
    # Prepare the system prompt with instructions
    system_prompt = """You are an expert financial analyst for farmers' market vendors. Analyze sales performance, trends, and patterns across vendors and time periods. Focus on:
1. Sales patterns and trends
2. Vendor performance comparisons
3. Market insights and seasonal variations
4. Data interpretation and metrics

When events data is provided in the context (marked by "=== Upcoming Events"), use this real-time information about upcoming events in your analysis. Similarly, when weather data is provided (marked by "=== Weather Forecast" or "Historical Weather"), incorporate this information into your analysis.

Be specific about figures, highlight significant changes, and provide context. Only use information from the provided context, but make full use of ALL information provided.

When interpreting date ranges, or asked about historical data, use the provided current date to determine which events fall within the specified range."""
    
    try:
        # Initialize OpenAI client
        client = openai.OpenAI(api_key=openai_api_key)
        
        # Call the OpenAI API
        response = client.chat.completions.create(
            model="gpt-4-turbo",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"Sales data in CSV format:\n\n{sales_data}\n\nQuestion: {user_query}"}
            ],
            temperature=0.3,  # Lower temperature for more factual responses
            max_tokens=1500   # Adjust as needed
        )
        
        # Extract and return the response
        return response.choices[0].message.content
    except Exception as e:
        print(f"Error calling OpenAI API: {e}")
        return f"Error: Could not process request. {str(e)}"

class ChatbotHandler(http.server.SimpleHTTPRequestHandler):
    def _set_headers(self, status_code=200, content_type='application/json'):
        self.send_response(status_code)
        self.send_header('Content-type', content_type)
        self.send_header('Access-Control-Allow-Origin', '*')  # Allow CORS
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'X-Requested-With, Content-Type')
        self.end_headers()
        
    def do_OPTIONS(self):
        # Handle preflight requests for CORS
        self._set_headers()
        
    def do_GET(self):
        if self.path == '/health':
            # Health check endpoint
            self._set_headers()
            self.wfile.write(json.dumps({'status': 'ok'}).encode())
        else:
            # Handle 404 for other GET paths
            self._set_headers(404)
            self.wfile.write(json.dumps({'error': 'Not found'}).encode())
            
    def do_POST(self):
        content_length = int(self.headers['Content-Length'])
        post_data = self.rfile.read(content_length)
        
        try:
            data = json.loads(post_data.decode('utf-8'))
            
            if self.path == '/api/chat':
                # Financial chatbot endpoint
                if 'message' not in data:
                    self._set_headers(400)
                    self.wfile.write(json.dumps({'error': 'No message provided'}).encode())
                    return
                    
                # Log the request
                timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
                print(f"[{timestamp}] Chat request: {data['message'][:50]}...")
                
                # Load the sales data
                sales_data = load_sales_data()
                
                # Get response from OpenAI
                response = get_openai_response(data['message'], sales_data)
                
                # Send response
                self._set_headers()
                self.wfile.write(json.dumps({'response': response}).encode())
                
            elif self.path == '/api/vendor-recommendations':
                # Vendor recommendations endpoint
                if 'location' not in data:
                    self._set_headers(400)
                    self.wfile.write(json.dumps({'error': 'No location provided'}).encode())
                    return
                    
                # Log the request
                timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
                print(f"[{timestamp}] Vendor recommendation request for location: {data['location']}")
                
                # Generate response
                response = random.choice(VENDOR_RESPONSES)
                vendors = parse_vendors_from_response(response)
                
                # Send response
                self._set_headers()
                self.wfile.write(json.dumps({
                    'response': response,
                    'vendors': vendors
                }).encode())
                
            else:
                # Handle 404 for other POST paths
                self._set_headers(404)
                self.wfile.write(json.dumps({'error': 'Endpoint not found'}).encode())
                
        except json.JSONDecodeError:
            self._set_headers(400)
            self.wfile.write(json.dumps({'error': 'Invalid JSON'}).encode())
        except Exception as e:
            self._set_headers(500)
            self.wfile.write(json.dumps({'error': f'Server error: {str(e)}'}).encode())

def run(port=5001):
    # Set up the server
    handler = ChatbotHandler
    
    try:
        with socketserver.TCPServer(("", port), handler) as httpd:
            print(f"Starting Chatbot API server on port {port}...")
            print(f"Access the financial chatbot at http://localhost:{port}/api/chat")
            print(f"Access the vendor recommendations at http://localhost:{port}/api/vendor-recommendations")
            print("Send POST requests with JSON body: {'message': 'your question here'} or {'location': 'your location'}")
            
            # Start the server
            httpd.serve_forever()
    except KeyboardInterrupt:
        print("Server stopped by user")
    except Exception as e:
        print(f"Server error: {e}")

if __name__ == "__main__":
    # Get port from command line argument or environment variable, or use default
    port = int(sys.argv[1]) if len(sys.argv) > 1 else int(os.environ.get('PORT', 5001))
    run(port) 