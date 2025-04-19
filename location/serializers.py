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
    
    logger.info(f"🔍 Attempting to geocode address: {address}")
    logger.info(f"🔑 Using API key: {os.getenv('GOOGLE_API_KEY')[:5]}...")

    try:
        response = requests.get(url, params=params)
        data = response.json()
        
        logger.info(f"📡 Geocoding API Response Status: {data.get('status')}")
        if data.get('status') != 'OK':
            logger.error(f"❌ Geocoding Error: {data.get('status')} - {data.get('error_message', 'No details provided')}")
            return None, None
            
        location = data['results'][0]['geometry']['location']
        logger.info(f"✅ Successfully got coordinates: {location}")
        return location['lat'], location['lng']

    except Exception as e:
        logger.error(f"❌ Exception in `get_coordinates()`: {str(e)}")
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
    raise serializers.ValidationError({
     "image": "Please upload a famous or iconic landmark image with the proper angle ensuring it's cropped appropriately."
    })


class LocationImageSerializer(serializers.ModelSerializer):
    home_address = serializers.CharField(write_only=True, required=False)
    image = serializers.ImageField(required=False)
    image_url = serializers.SerializerMethodField()

    class Meta:
        model = LocationImage
        fields = ['id', 'image', 'image_url', 'uploaded_at', 'latitude', 'longitude', 'distance_km', 'home_address']

    def get_image_url(self, obj):
        if obj.image:
            request = self.context.get('request')
            if request is not None:
                return request.build_absolute_uri(obj.image.url)
            return obj.image.url
        return None

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
            raise serializers.ValidationError({
                "image": "❗ This image already exists in the database and cannot be uploaded again."
            })


        # Add hash to validated data to avoid recalculation in `create()`
        data['image_hash'] = image_hash
        logger.info(f"✅ Validation Passed - Data: {data}")
        return data

    def create(self, validated_data):
        logger.info(f"🔍 Before Create - Data Received: {validated_data}")
        image = validated_data.get('image')

        if not image:
            raise serializers.ValidationError({"image": "Image is required for creation."})

        # ✅ First: validate landmark
        try:
            landmark_data = detect_landmark(image)
        except serializers.ValidationError as e:
            raise e

        # ✅ Then: calculate hash and check for duplicate
        image_instance = LocationImage(image=image)
        image_hash = image_instance.calculate_image_hash()

        if LocationImage.objects.filter(image_hash=image_hash).exists():
            logger.warning(f"❗ Duplicate Image Found - Hash: {image_hash}")
            raise serializers.ValidationError({
                "image": "❗ This image already exists in the database and cannot be uploaded again."
            })

        # Proceed with rest
        home_address = validated_data.pop('home_address', "Davean Dr, North York, ON, Canada M2L 2R6")
        home_lat, home_lng = get_coordinates(home_address)
        if not home_lat or not home_lng:
            raise serializers.ValidationError("Invalid home address. Could not fetch coordinates.")

        validated_data.update({
            'latitude': home_lat,
            'longitude': home_lng,
            'home_address': home_address,
            'image_hash': image_hash,
            'distance_km': haversine(home_lat, home_lng, landmark_data['landmark_lat'], landmark_data['landmark_lng']),
        })

        return super().create(validated_data)

    
    
    def update(self, instance, validated_data):
        """ Improved Update Logic: Retrieve Data for Existing `home_address` + `image` """

        # Handle `home_address` updates independently
        if 'home_address' in validated_data:
            home_address = validated_data['home_address']

            # Get new coordinates for the updated address
            home_lat, home_lng = get_coordinates(home_address)

            if home_lat and home_lng:
                instance.latitude = home_lat
                instance.longitude = home_lng
                instance.home_address = home_address
                
                try:
                    # Recalculate distance with the new coordinates
                    landmark_data = detect_landmark(instance.image)
                    landmark_lat = landmark_data['landmark_lat']
                    landmark_lng = landmark_data['landmark_lng']
                    instance.distance_km = haversine(home_lat, home_lng, landmark_lat, landmark_lng)
                except serializers.ValidationError as e:
                    raise e
                except Exception as e:
                    logger.error(f"❌ Error during landmark detection: {str(e)}")
                    raise serializers.ValidationError("An error occurred while processing the image. Please try again.")
                    
                logger.info(f"✅ [ADDRESS UPDATE] Address updated to: {home_address} and distance recalculated")
            else:
                logger.error(f"❗ [ERROR] Invalid address provided: {home_address}")
                raise serializers.ValidationError({
                    "home_address": "Invalid home address. Could not fetch coordinates."
                })

        # Handle `image` updates (Optional in PUT requests)
        new_image = validated_data.get('image')
        if new_image:
            new_image_instance = LocationImage(image=new_image)
            new_image_hash = new_image_instance.calculate_image_hash()

            # Prevent duplicate image updates
            if LocationImage.objects.filter(image_hash=new_image_hash).exists():
                logger.warning(f"❗ [DUPLICATE IMAGE] Attempt to update with duplicate image - Hash: {new_image_hash}")
                raise serializers.ValidationError({
                    "image": "❗ This image already exists. Please upload a different image."
                })

            instance.image = new_image
            instance.image_hash = new_image_hash
            logger.info(f"✅ [IMAGE UPDATE] Image updated successfully for Image ID: {instance.id}")

            try:
                # Landmark detection and distance calculation for new image
                landmark_data = detect_landmark(new_image)
                landmark_lat = landmark_data['landmark_lat']
                landmark_lng = landmark_data['landmark_lng']
                instance.distance_km = haversine(instance.latitude, instance.longitude, landmark_lat, landmark_lng)
            except serializers.ValidationError as e:
                raise e
            except Exception as e:
                logger.error(f"❌ Error during landmark detection: {str(e)}")
                raise serializers.ValidationError("An error occurred while processing the image. Please try again.")

        # Save the updated instance
        instance.save()
        logger.info(f"✅ [SUCCESS] Successfully Updated Image Record with ID: {instance.id}")
        return instance


    

    
    
    def to_representation(self, instance):
        """ Ensures GET, POST, and PUT return the desired response format """
        try:
            landmark_data = detect_landmark(instance.image)
        except Exception as e:
            logger.error(f"Error detecting landmark: {str(e)}")
            landmark_data = None

        return {
            "id": instance.id,
            "Address": instance.home_address,
            "Latitude": instance.latitude,
            "Longitude": instance.longitude,
            "Landmark": landmark_data["landmark_name"] if landmark_data else "Unknown",
            "Confidence Score": f"{landmark_data['confidence_score']}%" if landmark_data else "0.0%",
            "Coordinates": f"{landmark_data['landmark_lat']}, {landmark_data['landmark_lng']}" if landmark_data else "0.0, 0.0",
            "Distance (Haversine Formula)": f"{instance.distance_km} km",
            "Image_URL": self.get_image_url(instance)
        }