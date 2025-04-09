# Farmers Market API Server

This Flask API server handles vendor recommendations and invitation emails for the Farmers Market dashboard.

## Setup

1. Create a virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Run the server:
```bash
python app.py
```

The server will run on http://localhost:5000 by default.

## API Endpoints

### GET /
Returns a status message indicating that the API server is running.

### POST /api/vendor-recommendations
Gets AI-powered recommendations for vendors based on market location.

**Request:**
```json
{
  "market_location": "Miami"
}
```

**Response:**
```json
{
  "success": true,
  "response": "Text response from AI...",
  "vendors": [
    {
      "name": "Vendor Name",
      "email": "vendor@example.com",
      "description": "Description of vendor"
    }
  ]
}
```

### POST /api/send-invitations
Sends invitation emails to vendors.

**Request:**
```json
{
  "vendors": [
    {
      "name": "Vendor Name",
      "email": "vendor@example.com" 
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Invitations sent to 5 vendors"
}
``` 