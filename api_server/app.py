from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

@app.route('/', methods=['GET'])
def home():
    return jsonify({"status": "API server is running"})

@app.route('/api/send-invitations', methods=['POST'])
def send_invitations():
    try:
        data = request.json
        # Process invitation data (would connect to email service)
        print(f"Sending invitations to {len(data.get('vendors', []))} vendors")
        
        # In a real app, this would connect to an email sending service
        # For now, just simulate success
        return jsonify({"success": True, "message": f"Invitations sent to {len(data.get('vendors', []))} vendors"})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/vendor-recommendations', methods=['POST'])
def vendor_recommendations():
    try:
        data = request.json
        market_location = data.get('market_location')
        
        if not market_location:
            return jsonify({"success": False, "error": "Market location is required"}), 400
        
        # Import the vendor chatbot
        from vendor_chatbot import get_vendor_recommendations, extract_vendor_emails
        
        # Get recommendations from the chatbot
        chatbot_response = get_vendor_recommendations(market_location)
        
        # Extract vendor information from the response
        vendors = extract_vendor_emails(chatbot_response)
        
        return jsonify({
            "success": True,
            "response": chatbot_response,
            "vendors": vendors
        })
    except Exception as e:
        print(f"Error in vendor recommendations: {str(e)}")
        return jsonify({"success": False, "error": str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5005, debug=True) 