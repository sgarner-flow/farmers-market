
import sys
sys.path.append('/Users/saragarner/farmers-market/chatbots')
from chatbots.financial_chatbot import get_chat_response

# Get the query from command line arguments
query = """which vendor is doing well"""

# Call the chatbot function and print the response
response = get_chat_response(query)
print(response)
    