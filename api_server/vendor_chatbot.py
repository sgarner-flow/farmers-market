import re
import random
import requests
import os
from typing import List, Dict, Any

# Mock data for demonstration - replace with real AI calls
MOCK_VENDORS = {
    "Miami": [
        {"name": "Sunset Organic Farms", "description": "Local organic produce provider", "email": "contact@sunsetorganics.com"},
        {"name": "Ocean Breeze Seafood", "description": "Fresh caught seafood from Miami waters", "email": "sales@oceanbreezeseafood.com"},
        {"name": "Tropical Delights Bakery", "description": "Artisan breads and pastries", "email": "hello@tropicaldelights.com"},
        {"name": "Miami Honey Co.", "description": "Local honey and bee products", "email": "info@miamihoney.com"},
        {"name": "Sunshine Citrus Growers", "description": "Fresh Florida citrus", "email": "orders@sunshinecitrus.com"}
    ],
    "Fort Lauderdale": [
        {"name": "Coastal Harvest Farm", "description": "Sustainable vegetable farm", "email": "info@coastalharvest.com"},
        {"name": "Lauderdale Cheese Co.", "description": "Artisanal cheese maker", "email": "cheese@lauderdalecheese.com"},
        {"name": "Beachside Bakery", "description": "Fresh baked goods daily", "email": "orders@beachsidebakery.com"},
        {"name": "Garden Fresh Herbs", "description": "Organic herbs and microgreens", "email": "sales@gardenfreshherbs.com"}
    ],
    "Brickell": [
        {"name": "Urban Greens", "description": "Vertical farm in downtown Miami", "email": "grow@urbangreens.com"},
        {"name": "Brickell Roasters", "description": "Specialty coffee roaster", "email": "beans@brickellroasters.com"},
        {"name": "City Farm Collective", "description": "Community supported agriculture", "email": "members@cityfarmcollective.org"}
    ],
    "Aventura": [
        {"name": "Aventura Farmers Collective", "description": "Group of local small farms", "email": "join@aventurafarmers.org"},
        {"name": "Golden Acres Orchard", "description": "Heirloom fruit varieties", "email": "fruit@goldenacres.com"},
        {"name": "Sunshine Apiaries", "description": "Locally produced honey", "email": "bees@sunshineapiaries.com"}
    ],
    "El Portal": [
        {"name": "Village Greens Farm", "description": "Family-owned produce farm", "email": "hello@villagegreens.farm"},
        {"name": "Portal Provisions", "description": "Artisanal preserves and pickles", "email": "jars@portalprovisions.com"}
    ],
    "Granada": [
        {"name": "Granada Groves", "description": "Historic citrus producer", "email": "citrus@granadagroves.com"},
        {"name": "Heritage Meats", "description": "Ethically raised local meats", "email": "butcher@heritagemeats.com"},
        {"name": "Granada Gardens", "description": "Ornamental plants and flowers", "email": "plants@granadagardens.com"}
    ]
}

def get_vendor_recommendations(location: str) -> str:
    """
    Get vendor recommendations for a specific market location.
    In a real implementation, this would use an actual AI/LLM service.
    
    Args:
        location: The market location to get recommendations for
        
    Returns:
        A formatted string with the AI's recommendations
    """
    # Check if we have mock data for this location
    if location in MOCK_VENDORS:
        vendors = MOCK_VENDORS[location]
    else:
        # Generate some random vendors if location not in our mock data
        vendors = [
            {"name": f"{location} Farm #{i}", "description": "Local produce vendor", "email": f"vendor{i}@example.com"}
            for i in range(1, 4)
        ]
    
    # Format the response as if it came from an AI
    response = f"Here are some potential vendors for the {location} farmers market:\n\n"
    
    for i, vendor in enumerate(vendors, 1):
        response += f"{i}. {vendor['name']} - {vendor['description']}\n"
        response += f"   Contact: {vendor['email']}\n\n"
    
    response += f"\nThese vendors would be great additions to your {location} market. They offer products that match local preferences and would complement your existing vendor mix."
    
    return response

def extract_vendor_emails(response: str) -> List[Dict[str, str]]:
    """
    Extract vendor information from the AI response.
    
    Args:
        response: The formatted response from the AI
        
    Returns:
        A list of vendor dictionaries with name and email
    """
    vendors = []
    
    # Extract information using regex - in a real app, this might need to be more robust
    # Look for lines with email addresses
    lines = response.split('\n')
    current_vendor = None
    
    for line in lines:
        # Look for vendor name in format "1. Vendor Name - Description"
        name_match = re.match(r'\d+\.\s+([^-]+)(?:\s+-\s+(.+))?', line)
        if name_match:
            current_vendor = {"name": name_match.group(1).strip()}
            if name_match.group(2):
                current_vendor["description"] = name_match.group(2).strip()
        
        # Look for email in format "Contact: email@example.com"
        email_match = re.search(r'contact:\s*([^\s]+@[^\s]+)', line, re.IGNORECASE)
        if email_match and current_vendor:
            current_vendor["email"] = email_match.group(1).strip()
            vendors.append(current_vendor)
            current_vendor = None
    
    return vendors

# For future implementation: Connect to a real AI/LLM API
def get_ai_recommendations(location: str) -> str:
    """
    Connect to an actual AI service (like OpenAI) to get vendor recommendations.
    This is a placeholder for future implementation.
    """
    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        raise ValueError("OpenAI API key not found in environment variables")
    
    # This would be replaced with actual API call code
    prompt = f"""
    Act as a farmers market expert.
    I'm looking for new vendor recommendations for our {location} farmers market.
    Please suggest 5 specific local vendors that would be a good fit, including:
    - Business name
    - Brief description of their products
    - A potential contact email
    
    Format each recommendation as a numbered list item.
    """
    
    # Placeholder for real implementation
    # response = openai.ChatCompletion.create(
    #     model="gpt-4",
    #     messages=[
    #         {"role": "system", "content": "You are a farmers market consultant specializing in vendor curation."},
    #         {"role": "user", "content": prompt}
    #     ]
    # )
    # return response.choices[0].message.content
    
    # Instead return mock data
    return get_vendor_recommendations(location) 