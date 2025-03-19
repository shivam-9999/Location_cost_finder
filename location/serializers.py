import requests
import hashlib
import math
from google.cloud import vision
from rest_framework import serializers
from .models import LocationImage
from PIL import Image
import os
import logging

# Configure logger
logger = logging.getLogger(__name__)

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
    params = {"address": address, "key": os.getenv('GOOGLE_API_KEY')}

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
        """Check for duplicate image in the database, regardless of address."""

        image = data.get('image')
        home_address = data.get('home_address', '').strip()

        # Calculate the image hash
        image_instance = LocationImage(image=image)
        image_hash = image_instance.calculate_image_hash()

        logger.info(f"🔍 Image Hash Calculated: {image_hash}")

        # Check if the image already exists in the database
        if LocationImage.objects.filter(image_hash=image_hash).exists():
            logger.warning(f"❗ Duplicate Image Found - Hash: {image_hash}")
            raise serializers.ValidationError("❗ This image already exists in the database and cannot be uploaded again.")

        # Add hash to validated data to avoid recalculation in `create()`
        data['image_hash'] = image_hash
        logger.info(f"✅ Validation Passed - Data: {data}")
        return data

    def create(self, validated_data):
        """Create method for saving validated data."""
        logger.info(f"🔍 Before Create - Data Received: {validated_data}")

        # Handle home_address
        home_address = validated_data.pop('home_address', "35 Davean Dr, North York, ON, Canada M2L 2R6")
        home_lat, home_lng = get_coordinates(home_address)

        if not home_lat or not home_lng:
            logger.error(f"❗ Invalid Address - {home_address}")
            raise serializers.ValidationError("Invalid home address. Could not fetch coordinates.")

        # Detect Landmark
        landmark_data = detect_landmark(validated_data['image'])

        # Calculate Distance
        if landmark_data:
            landmark_lat = landmark_data['landmark_lat']
            landmark_lng = landmark_data['landmark_lng']
            validated_data['distance_km'] = haversine(home_lat, home_lng, landmark_lat, landmark_lng)
        else:
            validated_data['distance_km'] = 0.0  # Default if no landmark found

        # Save Coordinates and Home Address
        validated_data.update({
            'latitude': home_lat,
            'longitude': home_lng,
            'home_address': home_address,
        })
        
        logger.info(f"✅ Final Data Before Save: {validated_data}")

        # Save Image Record
        image_instance = super().create(validated_data)
        logger.info(f"✅ Successfully Created Image Record with ID: {image_instance.id}")
        return image_instance

    def update(self, instance, validated_data):
        """ Update logic: 
        - ✅ Allow `home_address` updates independently
        - ✅ Check for duplicate image **only if provided**
        """

        logger.info(f"🔄 Update Request for Image ID: {instance.id}")

        # Handle `home_address` update (Allowed without image requirement)
        if 'home_address' in validated_data:
            home_address = validated_data.pop('home_address')
            home_lat, home_lng = get_coordinates(home_address)

            if home_lat and home_lng:
                instance.latitude = home_lat
                instance.longitude = home_lng
                instance.home_address = home_address
                logger.info(f"✅ Address Updated: {home_address}")
            else:
                logger.error(f"❗ Invalid Address - {home_address}")
                raise serializers.ValidationError("Invalid home address. Could not fetch coordinates.")

        # Handle `image` update (Optional - Only check if provided)
        new_image = validated_data.get('image')
        if new_image:
            new_image_instance = LocationImage(image=new_image)
            new_image_hash = new_image_instance.calculate_image_hash()

            logger.info(f"🔍 New Image Hash Calculated: {new_image_hash}")

            # Check if new image already exists in the database
            if LocationImage.objects.filter(image_hash=new_image_hash).exists():
                logger.warning(f"❗ Attempted to update with duplicate image - Hash: {new_image_hash}")
                raise serializers.ValidationError("❗ This image already exists in the database. Image update denied.")

            # If not a duplicate, proceed with updating the image
            instance.image = new_image
            instance.image_hash = new_image_hash  # Ensure hash is updated if image changes

            # Update landmark data if a new image is detected
            landmark_data = detect_landmark(new_image)
            if landmark_data:
                landmark_lat = landmark_data['landmark_lat']
                landmark_lng = landmark_data['landmark_lng']
                instance.distance_km = haversine(instance.latitude, instance.longitude, landmark_lat, landmark_lng)
                logger.info(f"✅ Landmark Data Updated: {landmark_data}")
            else:
                instance.distance_km = 0.0
                logger.info("ℹ️ No Landmark Detected for New Image")

        # Save the updated instance
        instance.save()
        logger.info(f"✅ Successfully Updated Image Record with ID: {instance.id}")
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