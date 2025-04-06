
import sys
sys.path.append('/Users/saragarner/farmers-market/chatbots')
from chatbots.financial_chatbot import get_chat_response

# Get the query from command line arguments
query = """tell me which vendor is doing the best"""

# Call the chatbot function and print the response
response = get_chat_response(query)
print(response)
    