from flask import Flask, request, jsonify
from flask_cors import CORS
import sys
import os
import json

# Import directly from the same directory
from financial_chatbot import MarketAnalyzer

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Initialize the chatbot
analyzer = MarketAnalyzer()

@app.route('/api/chat', methods=['POST'])
def chat():
    try:
        data = request.json
        if not data or 'message' not in data:
            return jsonify({'error': 'No message provided'}), 400
        
        message = data['message']
        
        # Get response from the chatbot
        response = analyzer.get_response(message)
        
        return jsonify({'response': response})
    except Exception as e:
        print(f"Error processing request: {str(e)}")
        return jsonify({'error': f'Failed to process request: {str(e)}'}), 500

@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok'})

if __name__ == '__main__':
    print("Starting Financial Chatbot API server on port 5001...")
    print("Access the API at http://localhost:5001/api/chat")
    print("Send POST requests with JSON body: {'message': 'your question here'}")
    app.run(host='0.0.0.0', port=5001, debug=True) 