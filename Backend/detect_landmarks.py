
# import math
# import requests
# from google.cloud import vision
# import googlemaps
# import os

# # Set Google Application Credentials
# os.environ['GOOGLE_APPLICATION_CREDENTIALS'] = '../Location_cost_finder/wired-method-453715-g1-a7e6d26ef294.json'

# # Initialize Google Maps client
# gmaps = googlemaps.Client(key=os.getenv('GOOGLE_GEOCODING_API_KEY'))

# # Function to Convert Address to Latitude and Longitude
# def get_coordinates(address):
#     """Convert an address to latitude and longitude using Google Geocoding API."""
#     url = "https://maps.googleapis.com/maps/api/geocode/json"
#     params = {"address": address, "key": os.getenv('GOOGLE_GEOCODING_API_KEY')}

#     try:
#         response = requests.get(url, params=params)
#         data = response.json()

#         if data['status'] == 'OK':
#             location = data['results'][0]['geometry']['location']
#             latitude, longitude = location['lat'], location['lng']

#             print(f"✅ Address: {address}")
#             print(f"✅ Latitude: {latitude}")
#             print(f"✅ Longitude: {longitude}")
#             return latitude, longitude
#         else:
#             return None, None

#     except Exception:
#         return None, None

# # Haversine Formula for Distance Calculation
# def haversine(lat1, lon1, lat2, lon2):
#     """Calculate the great-circle distance between two points (in km) using Haversine formula."""
#     R = 6371.0  # Earth radius in km

#     # Convert degrees to radians
#     lat1, lon1, lat2, lon2 = map(math.radians, [lat1, lon1, lat2, lon2])

#     # Haversine formula
#     dlat = lat2 - lat1
#     dlon = lon2 - lon1

#     a = math.sin(dlat / 2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon / 2)**2
#     c = 2 * math.asin(math.sqrt(a))

#     # Final distance in km
#     distance_km = R * c
#     return round(distance_km, 2)

# def reverse_geocode(latitude, longitude):
#     """Convert coordinates to a readable address."""
#     try:
#         result = gmaps.reverse_geocode((latitude, longitude))
#         if result:
#             address = result[0]['formatted_address']
#             print(f"Reverse Geocode Result: {address}")
#             return address
#         else:
#             return None
#     except Exception:
#         return None

# def calculate_distance_via_haversine(home_lat, home_lng, destination_lat, destination_lng):
#     """Calculate the direct distance using the Haversine formula."""
#     distance = haversine(home_lat, home_lng, destination_lat, destination_lng)
#     print(f"Distance (Haversine Formula): {distance} km")

# def detect_landmarks(image_path, home_address):
#     """Detect landmarks and retrieve coordinates, address, and distance."""
#     try:
#         if not os.path.exists(image_path):
#             return

#         # Convert Home Address to Coordinates
#         home_lat, home_lng = get_coordinates(home_address)
#         if home_lat is None or home_lng is None:
#             return
        
#         # Vision API Client Setup
#         client = vision.ImageAnnotatorClient()

#         # Read image
#         with open(image_path, "rb") as image_file:
#             content = image_file.read()

#         image = vision.Image(content=content)
#         response = client.landmark_detection(image=image)

#         if response.error.message:
#             raise Exception(f"Vision API Error: {response.error.message}")

#         landmarks = response.landmark_annotations
#         if landmarks:
#             for landmark in landmarks:
#                 print(f"Landmark: {landmark.description}")
#                 print(f"Confidence Score: {landmark.score * 100:.2f}%")
#                 for location in landmark.locations:
#                     lat_lng = location.lat_lng
#                     print(f"Coordinates: {lat_lng.latitude}, {lat_lng.longitude}")

#                     # Reverse Geocode for Address
#                     address = reverse_geocode(lat_lng.latitude, lat_lng.longitude)

#                     # Calculate Distance using Haversine
#                     calculate_distance_via_haversine(home_lat, home_lng, lat_lng.latitude, lat_lng.longitude)
#         else:
#             print("No landmarks detected. Try a clearer image or different landmark.")

#     except Exception as e:
#         print(f"Error: {e}")

# # Example Usage
# home_address = "35 Davean Dr, North York, ON, Canada M2L 2R6"
# detect_landmarks('/Users/shivammaniya/Projects/Location_cost_finder/effil_tower.jpg', home_address)
