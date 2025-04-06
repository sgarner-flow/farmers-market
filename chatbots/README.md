# Market Chatbot System

This system provides two chatbots:
- A vendor management chatbot for helping market organizers find and vet vendors
- A financial chatbot for analyzing market performance and trends using weather and event data.

## Setup Instructions

### 1. Environment Setup

Create a `.env` file in the root directory with your configuration:

```env
# Database Configuration
ALLOYDB_HOST=35.188.89.30
ALLOYDB_PORT=5432
ALLOYDB_DB=farmers_market
ALLOYDB_USER=postgres
ALLOYDB_PASSWORD=your_password_here

# API Keys
OPENAI_API_KEY=your_openai_api_key
WEATHER_API_KEY=your_weather_api_key
PREDICTHQ_TOKEN=your_predicthq_token
GOOGLE_MAPS_API_KEY=your_google_maps_api_key
```

### 2. Install Dependencies

Install the required Python packages:

```bash
# Create and activate a virtual environment (recommended)
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

### 3. Running the Chatbots

You can use either chatbot through their Python interface:

```python
# For vendor-related queries
from chatbots.vendor_chatbot import get_chat_response as get_vendor_response

response = get_vendor_response("What types of vendors should I look for?")
print(response)

# For financial analysis queries
from chatbots.financial_chatbot import get_chat_response as get_financial_response

response = get_financial_response("How are sales trending for produce vendors?")
print(response)
```

Or run them interactively:

```bash
# Run vendor chatbot
python chatbots/vendor_chatbot.py

# Run financial chatbot
python chatbots/financial_chatbot.py
```

### Database Schema

The system uses two main tables for vector storage:

1. `vectors` - For vendor-related content:
   - Stores embeddings and metadata for vendor documentation
   - Used by the vendor chatbot

2. `financial_vectors` - For financial analysis:
   - Stores embeddings and metadata for financial data
   - Used by the financial chatbot

## Notes

- The system connects to a hosted AlloyDB instance at 35.188.89.30:5432
- Default database name: farmers_market
- Make sure your IP is authorized before connecting (see Troubleshooting section)
- Make sure to properly secure your credentials in a production environment

## Troubleshooting

### AlloyDB Connectivity Issues

If you're having trouble connecting to AlloyDB, follow these debugging steps:

1. Check if port 5432 is reachable:
```bash
nc -vz 35.188.89.30 5432
```