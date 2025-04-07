from flask import Flask, request, jsonify
from flask_cors import CORS
import sys
import os
import json

# Import directly from the same directory
from financial_chatbot import MarketAnalyzer
from vendor_chatbot import VectorSearcher

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Initialize the chatbots
financial_analyzer = MarketAnalyzer()
vendor_recommender = VectorSearcher()

@app.route('/api/chat', methods=['POST'])
def chat():
    try:
        data = request.json
        if not data or 'message' not in data:
            return jsonify({'error': 'No message provided'}), 400
        
        message = data['message']
        
        # Get response from the chatbot
        response = financial_analyzer.get_response(message)
        
        return jsonify({'response': response})
    except Exception as e:
        print(f"Error processing request: {str(e)}")
        return jsonify({'error': f'Failed to process request: {str(e)}'}), 500

@app.route('/api/vendor-recommendations', methods=['POST'])
def vendor_recommendations():
    try:
        data = request.json
        if not data or 'location' not in data:
            return jsonify({'error': 'No location provided'}), 400
        
        location = data['location']
        
        # Create a query based on location
        query = f"Recommend real vendors for {location} farmers market who might be interested in joining. Include their name, email, and website if known."
        
        # Search for relevant content
        results = vendor_recommender.search(query, num_results=5)
        
        # Generate response using the chatbot
        response = vendor_recommender.generate_ai_response(query, results)
        
        # Parse the response to extract vendor information
        vendors = parse_vendors_from_response(response)
        
        return jsonify({
            'response': response,
            'vendors': vendors
        })
    except Exception as e:
        print(f"Error processing vendor recommendations: {str(e)}")
        return jsonify({'error': f'Failed to process request: {str(e)}'}), 500

def parse_vendors_from_response(response):
    """
    Parse vendor information from the AI response.
    Looks for patterns like:
    - Name: ABC Bakery
    - Email: contact@abcbakery.com
    - Website: www.abcbakery.com
    """
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
        if line.startswith('- ') or line.startswith('* ') or line.startswith('1. ') or any(line.lower().startswith(x) for x in ['vendor:', 'business:', 'name:']):
            # If we were already processing a vendor, save it before starting a new one
            if current_vendor and 'name' in current_vendor:
                vendors.append(current_vendor)
                current_vendor = {}
            
            # Extract the name
            if ':' in line:
                name = line.split(':', 1)[1].strip()
            else:
                name = line.lstrip('- *123456789. ').strip()
            
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

@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok'})

if __name__ == '__main__':
    print("Starting Chatbot API server on port 5001...")
    print("Access the financial chatbot at http://localhost:5001/api/chat")
    print("Access the vendor recommendations at http://localhost:5001/api/vendor-recommendations")
    print("Send POST requests with JSON body: {'message': 'your question here'}")
    app.run(host='0.0.0.0', port=5001, debug=True) 