import requests
import hashlib
import math
from google.cloud import vision
from rest_framework import serializers
from .models import LocationImage
from PIL import Image
import os

# Haversine Formula for Distance Calculation
def haversine(lat1, lon1, lat2, lon2):
    R = 6371.0  # Earth radius in km
    lat1, lon1, lat2, lon2 = map(math.radians, [lat1, lon1, lat2, lon2])

    dlat = lat2 - lat1
    dlon = lon2 - lon1

    a = math.sin(dlat / 2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon / 2)**2
    c = 2 * math.asin(math.sqrt(a))

    return round(R * c, 2)

# Function to Convert Address to Coordinates
def get_coordinates(address):
    url = "https://maps.googleapis.com/maps/api/geocode/json"
    params = {"address": address, "key": os.getenv('GOOGLE_GEOCODING_API_KEY')}

    try:
        response = requests.get(url, params=params)
        data = response.json()

        if data['status'] == 'OK':
            location = data['results'][0]['geometry']['location']
            return location['lat'], location['lng']
        else:
            print(f"❗ Geocoding Error: {data['status']} - {data.get('error_message', 'No details provided')}")
            return None, None

    except Exception as e:
        print(f"❗ Exception in `get_coordinates()`: {e}")
        return None, None

# Vision API Landmark Detection
def detect_landmark(image_file):
    """Detect landmark dynamically using Vision API with in-memory file support."""
    client = vision.ImageAnnotatorClient()

    # Read file content directly instead of using .path
    image_file.seek(0)  # Move the cursor to the start of the file
    content = image_file.read()

    image = vision.Image(content=content)
    response = client.landmark_detection(image=image)

    landmarks = response.landmark_annotations
    if landmarks:
        landmark = landmarks[0]  # Assume the most confident detection
        return {
            "landmark_name": landmark.description,
            "confidence_score": round(landmark.score * 100, 2),
            "landmark_lat": landmark.locations[0].lat_lng.latitude,
            "landmark_lng": landmark.locations[0].lat_lng.longitude
        }
    return None


class LocationImageSerializer(serializers.ModelSerializer):
    home_address = serializers.CharField(write_only=True, required=False)

    class Meta:
        model = LocationImage
        fields = ['id', 'image', 'uploaded_at', 'latitude', 'longitude', 'distance_km', 'home_address']

    def validate(self, data):
        """Check for duplicate image + home_address combination"""

        # Calculate the hash for uploaded image
        image = data.get('image')
        image_instance = LocationImage(image=image)
        image_hash = image_instance.calculate_image_hash()

        # Check for duplicate record
        home_address = data.get('home_address', '')
        if LocationImage.objects.filter(image_hash=image_hash, home_address=home_address).exists():
            raise serializers.ValidationError("❗ This image with the same address has already been uploaded.")

        # Return validated data if no duplicates found
        return data


    def create(self, validated_data):
        # Handle home_address
        home_address = validated_data.pop('home_address', "35 Davean Dr, North York, ON, Canada M2L 2R6")
        home_lat, home_lng = get_coordinates(home_address)

        if not home_lat or not home_lng:
            raise serializers.ValidationError("Invalid home address. Could not fetch coordinates.")

        # Detect Landmark
        landmark_data = detect_landmark(validated_data['image'])

        # Calculate Distance
        if landmark_data:
            landmark_lat = landmark_data['landmark_lat']
            landmark_lng = landmark_data['landmark_lng']
            validated_data['distance_km'] = haversine(home_lat, home_lng, landmark_lat, landmark_lng)
        else:
            landmark_data = {
                "landmark_name": "Unknown",
                "confidence_score": "0.0%",
                "landmark_lat": 0.0,
                "landmark_lng": 0.0
            }

        # Save Coordinates and Home Address
        validated_data['latitude'] = home_lat
        validated_data['longitude'] = home_lng
        validated_data['home_address'] = home_address

        # Save Image Record
        image_instance = super().create(validated_data)

        return image_instance

    def update(self, instance, validated_data):
        """ Update logic for updating home_address or image """
        if 'home_address' in validated_data:
            home_address = validated_data.pop('home_address')
            home_lat, home_lng = get_coordinates(home_address)
            instance.latitude = home_lat
            instance.longitude = home_lng
            instance.home_address = home_address  # ✅ Save the updated address

        if 'image' in validated_data:
            landmark_data = detect_landmark(validated_data['image'])
            if landmark_data:
                landmark_lat = landmark_data['landmark_lat']
                landmark_lng = landmark_data['landmark_lng']
                instance.distance_km = haversine(instance.latitude, instance.longitude, landmark_lat, landmark_lng)

        instance.save()
        return instance

    def to_representation(self, instance):
        """ Ensures GET, POST, and PUT return the desired response format """
        landmark_data = detect_landmark(instance.image)

        return {
            "id": instance.id,
            "Address": instance.home_address,  #  Show dynamic address from model
            "Latitude": instance.latitude,
            "Longitude": instance.longitude,
            "Landmark": landmark_data["landmark_name"] if landmark_data else "Unknown",
            "Confidence Score": f"{landmark_data['confidence_score']}%" if landmark_data else "0.0%",
            "Coordinates": f"{landmark_data['landmark_lat']}, {landmark_data['landmark_lng']}" if landmark_data else "0.0, 0.0",
            "Distance (Haversine Formula)": f"{instance.distance_km} km"
        }
