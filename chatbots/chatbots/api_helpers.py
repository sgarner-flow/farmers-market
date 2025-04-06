import os
import requests
from datetime import datetime, timedelta
from typing import List, Dict, Optional, Tuple
from math import radians, sin, cos, sqrt, atan2

def calculate_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate distance between two points using the Haversine formula."""
    # Validate inputs
    if lat1 is None or lon1 is None or lat2 is None or lon2 is None:
        return float('inf')
    
    # Convert coordinates to radians
    R = 3959  # Earth's radius in miles
    lat1, lon1, lat2, lon2 = map(radians, [lat1, lon1, lat2, lon2])
    
    # Haversine formula
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
    c = 2 * atan2(sqrt(a), sqrt(1-a))
    distance = R * c
    
    return distance

class WeatherAPI:
    def __init__(self, api_key: str, location: str):
        self.api_key = api_key
        self.location = location
        self.cache = {}

    def get_historical_data(self, date_str: str) -> Optional[Dict]:
        """Fetch historical weather data from WeatherAPI.com."""
        try:
            # Check cache first
            cache_key = f"{self.location}:{date_str}"
            if cache_key in self.cache:
                return self.cache[cache_key]
            
            url = f"http://api.weatherapi.com/v1/history.json"
            params = {
                'key': self.api_key,
                'q': self.location,
                'dt': date_str
            }
            
            response = requests.get(url, params=params)
            response.raise_for_status()
            
            weather_data = response.json()
            
            # Extract relevant weather information
            day_data = weather_data['forecast']['forecastday'][0]['day']
            result = {
                'condition': day_data['condition']['text'],
                'max_temp_f': day_data['maxtemp_f'],
                'min_temp_f': day_data['mintemp_f'],
                'avg_temp_f': day_data['avgtemp_f'],
                'max_wind_mph': day_data['maxwind_mph'],
                'total_precip_in': day_data['totalprecip_in'],
                'avghumidity': day_data['avghumidity']
            }
            
            # Cache the result
            self.cache[cache_key] = result
            return result
            
        except Exception as e:
            return None

    def get_forecast(self, days: int = 14) -> Optional[List[Dict]]:
        """Fetch weather forecast data from WeatherAPI.com."""
        try:
            # Check cache first
            cache_key = f"{self.location}:forecast:{days}"
            if cache_key in self.cache:
                return self.cache[cache_key]
            
            url = f"http://api.weatherapi.com/v1/forecast.json"
            params = {
                'key': self.api_key,
                'q': self.location,
                'days': days
            }
            
            response = requests.get(url, params=params)
            response.raise_for_status()
            
            weather_data = response.json()
            forecast_days = []
            
            for day in weather_data['forecast']['forecastday']:
                day_data = day['day']
                forecast_days.append({
                    'date': day['date'],
                    'condition': day_data['condition']['text'],
                    'max_temp_f': day_data['maxtemp_f'],
                    'min_temp_f': day_data['mintemp_f'],
                    'avg_temp_f': day_data['avgtemp_f'],
                    'max_wind_mph': day_data['maxwind_mph'],
                    'total_precip_in': day_data['totalprecip_in'],
                    'avghumidity': day_data['avghumidity']
                })
            
            # Cache the result
            self.cache[cache_key] = forecast_days
            return forecast_days
            
        except Exception as e:
            return None

def extract_coordinates(location_data) -> Tuple[float, float]:
    """Extract latitude and longitude from location data.
    
    Args:
        location_data: Location data from PredictHQ API.
        
    Returns:
        Tuple of (latitude, longitude)
    """
    if isinstance(location_data, list) and len(location_data) >= 2:
        # PredictHQ location format is [longitude, latitude]
        lon = float(location_data[0])
        lat = float(location_data[1])
        return lat, lon
    return None, None

def get_event_score(event: Dict, market_lat: float, market_lon: float) -> float:
    """Calculate event score based on local rank and distance.
    
    Args:
        event: Event data.
        market_lat: Market latitude.
        market_lon: Market longitude.
        
    Returns:
        Score value (higher is better).
    """
    local_rank = event.get('local_rank', 0)
    event_lat = event.get('latitude')
    event_lon = event.get('longitude')
    
    if event_lat and event_lon:
        distance = calculate_distance(market_lat, market_lon, event_lat, event_lon)
        # Normalize distance (closer is better) and combine with local rank
        distance_score = 1 / (1 + distance)  # Convert distance to 0-1 scale
        return (local_rank * 0.4) + (distance_score * 0.6)  # Weight distance more heavily
    
    # If no coordinates, just use local_rank
    return local_rank * 0.4

class PredictHQAPI:
    def __init__(self, token: str, market_lat: float, market_lon: float):
        self.token = token
        self.market_lat = market_lat
        self.market_lon = market_lon
        self.cache = {}

    def get_suggested_radius(self) -> str:
        """Get suggested radius for the market location from PredictHQ API."""
        try:
            # Check cache
            cache_key = f"suggested_radius:{self.market_lat},{self.market_lon}"
            if cache_key in self.cache:
                return self.cache[cache_key]
                
            url = "https://api.predicthq.com/v1/suggested-radius/"
            headers = {
                'Authorization': f'Bearer {self.token}',
                'Accept': 'application/json'
            }
            params = {
                # Suggested Radius API requires location.origin in lat,lon format
                'location.origin': f"{self.market_lat},{self.market_lon}",  # Format: lat,lon
            }
            
            response = requests.get(url, headers=headers, params=params)
            
            if response.status_code != 200:
                return "30mi"  # Default fallback
                
            radius_data = response.json()
            suggested_radius = radius_data.get('radius', {}).get('suggested', '30mi')
            
            # Cache the result
            self.cache[cache_key] = suggested_radius
            return suggested_radius
            
        except Exception:
            return "30mi"  # Default fallback
            
    def get_events(self, days: int = 7) -> Optional[List[Dict]]:
        """Fetch events data from PredictHQ API."""
        try:
            # Check cache first
            cache_key = f"events:{days}"
            if cache_key in self.cache:
                return self.cache[cache_key]
            
            # Calculate date range
            start_date = (datetime.now() - timedelta(days=30)).strftime('%Y-%m-%d')  # Start from 30 days ago
            end_date = (datetime.now() + timedelta(days=days)).strftime('%Y-%m-%d')  # Look forward by specified days
            
            url = "https://api.predicthq.com/v1/events/"
            headers = {
                'Authorization': f'Bearer {self.token}',
                'Accept': 'application/json'
            }
            params = {
                'geo.within': f"30mi@{self.market_lon},{self.market_lat}",
                'active.gte': start_date,
                'active.lte': end_date,
                'category': 'community,concerts,sports,festivals',
                'sort': 'local_rank',
                'limit': 100
            }
            
            response = requests.get(url, headers=headers, params=params)
            
            if response.status_code != 200:
                return None
                
            events_data = response.json()
            
            events_list = []
            for event in events_data.get('results', []):
                # Extract coordinates from location
                location = event.get('location', [])
                
                lat, lon = extract_coordinates(location)
                
                # Use market coordinates if event has no valid coordinates
                if lat is None or lon is None:
                    lat = self.market_lat
                    lon = self.market_lon
                
                # Process event data
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
                
                # Check if this is a market event
                is_market = any([
                    # Check title and description for market terms
                    any(term in title_lower or term in description_lower for term in market_terms),
                    # Check labels for market-related terms
                    any(term in ' '.join(labels) for term in ['market', 'farmers', 'local', 'artisan']),
                    # Check if it's a recurring community event (likely a regular market)
                    'recurring' in labels and 'community' in event.get('category', '').lower() and local_rank > 50
                ])
                
                # Calculate distance from market
                distance = calculate_distance(self.market_lat, self.market_lon, lat, lon)
                
                events_list.append({
                    'title': event.get('title'),
                    'category': event.get('category'),
                    'start': event.get('start').split('T')[0] if event.get('start') else None,
                    'end': event.get('end').split('T')[0] if event.get('end') else None,
                    'description': event.get('description'),
                    'is_market': is_market,
                    'local_rank': local_rank,
                    'labels': event.get('labels', []),
                    'latitude': lat,
                    'longitude': lon,
                    'distance': distance
                })
            
            # Sort events by distance first, then by market status, and finally by local rank
            events_list.sort(key=lambda x: (x['distance'], 0 if x['is_market'] else 1, -x['local_rank']))
            
            # Filter events within 25 miles
            events_list = [event for event in events_list if event['distance'] <= 5]
            
            # Cache the result
            self.cache[cache_key] = events_list
            return events_list
            
        except requests.exceptions.RequestException:
            return None
        except Exception:
            return None 