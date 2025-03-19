# version3 
from rest_framework import status, generics
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from .models import LocationImage
from .serializers import LocationImageSerializer, detect_landmark, get_coordinates, haversine
import logging
logger = logging.getLogger(__name__)

class LocationImageUploadView(generics.CreateAPIView):
    queryset = LocationImage.objects.all()
    serializer_class = LocationImageSerializer
    parser_classes = (MultiPartParser, FormParser)
    
    def create(self, request, *args, **kwargs):
        # ✅ Enforce `home_address` before passing to serializer
        if 'home_address' not in request.data:
            request.data['home_address'] = "35 Davean Dr, North York, ON, Canada M2L 2R6"

        serializer = self.get_serializer(data=request.data)

        if serializer.is_valid():
            image_instance = serializer.save()
            response_data = LocationImageSerializer(image_instance).data
            return Response(response_data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# ✅ Create + List
class LocationImageListCreateView(generics.ListCreateAPIView):
    queryset = LocationImage.objects.all()
    serializer_class = LocationImageSerializer
    parser_classes = (MultiPartParser, FormParser)

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():
            image_instance = serializer.save()

            # Retrieve saved entry for list display
            queryset = self.get_queryset()
            response_data = LocationImageSerializer(queryset, many=True).data

            return Response(response_data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

# ✅ Retrieve (Get Details of One Image)
class LocationImageDetailView(generics.RetrieveAPIView):
    queryset = LocationImage.objects.all()
    serializer_class = LocationImageSerializer
    lookup_field = 'pk'  # Ensure this matches your URL pattern

# ✅ Update (Edit Image Details)
class LocationImageUpdateView(generics.UpdateAPIView):
    queryset = LocationImage.objects.all()
    serializer_class = LocationImageSerializer
    lookup_field = 'pk'

    def perform_update(self, serializer):
        """Improved logic for updating records."""
        instance = serializer.instance

        # ✅ Handle `home_address` updates even without an image
        new_home_address = self.request.data.get('home_address')
        if new_home_address:
            logger.info(f"🔍 Updating Home Address for Image ID: {instance.id}")
            home_lat, home_lng = get_coordinates(new_home_address)
            if home_lat and home_lng:
                instance.latitude = home_lat
                instance.longitude = home_lng
                instance.home_address = new_home_address
                logger.info(f"✅ Address Updated to: {new_home_address}")

        # ✅ Handle `image` updates only if provided
        new_image = self.request.data.get('image')
        if new_image:
            logger.info(f"🔍 Checking for Duplicate Image during Update for Image ID: {instance.id}")
            new_image_instance = LocationImage(image=new_image)
            new_image_hash = new_image_instance.calculate_image_hash()

            if LocationImage.objects.filter(image_hash=new_image_hash).exists():
                logger.warning(f"❗ Duplicate Image Detected - Hash: {new_image_hash}")
                raise serializers.ValidationError("❗ This image already exists in the database. Image update denied.")

            # Update image data
            instance.image = new_image
            instance.image_hash = new_image_hash
            logger.info(f"✅ Image Successfully Updated for Image ID: {instance.id}")

        # ✅ Save the updated instance
        instance.save()
        logger.info(f"✅ Successfully Updated Image Record with ID: {instance.id}")



# ✅ Delete (Remove an Image)
class LocationImageDeleteView(generics.DestroyAPIView):
    queryset = LocationImage.objects.all()
    serializer_class = LocationImageSerializer
    lookup_field = 'pk'
    

# ✅ Delete all images (Remove all Images)
class DeleteAllLocationImagesView(generics.DestroyAPIView):
    queryset = LocationImage.objects.all()
    serializer_class = LocationImageSerializer

    def delete(self, request, *args, **kwargs):
        total_images = self.get_queryset().count()

        if total_images == 0:
            return Response({"message": "No images found to delete."}, status=status.HTTP_404_NOT_FOUND)

        # Delete all records
        self.get_queryset().delete()
        return Response({"message": f"✅ Successfully deleted {total_images} images."}, status=status.HTTP_200_OK)
    
    
    
    
    
    
    
    
    
    
    

# ✅ Update (Edit Image Details)
# class LocationImageUpdateView(generics.UpdateAPIView):
#     queryset = LocationImage.objects.all()
#     serializer_class = LocationImageSerializer
#     lookup_field = 'pk'



#     def perform_update(self, serializer):
#         """Improved logic for updating `home_address` and `image`."""
        
#         # Log the incoming request data
#         logger.info(f"Incoming Request Data: {self.request.data}")
        
#         # Verify correct instance is fetched
#         instance = self.get_object()  
#         logger.info(f"Fetched Instance ID: {instance.pk}")

#         updated_data = {}

#         # Handle `home_address` updates
#         new_home_address = self.request.data.get('Address')
#         logger.info(f"new_home_address {new_home_address}")
        
#         if new_home_address:
#             home_lat, home_lng = get_coordinates(new_home_address)
#             updated_data['home_address'] = new_home_address
#             logger.info(f"updated_data:{updated_data}")
#             logger.info(f"New Coordinates: Lat={home_lat}, Lng={home_lng}")
#             if home_lat and home_lng:
#                 updated_data['latitude'] = home_lat
                
#                 logger.info(f"updated_data:{updated_data}")
#                 updated_data['longitude'] = home_lng
#                 logger.info(f"updated_data:{updated_data}")
#             else:
#                 updated_data['latitude'] = instance.latitude  
#                 updated_data['longitude'] = instance.longitude  

#         # Handle `image` changes and re-run Vision API
#         new_image = self.request.data.get('image')
#         if new_image:
#             landmark_data = detect_landmark(new_image)
#             logger.info(f"updated_data:{updated_data}")
#             # logger.info(f"Landmark Data: {landmark_data}, new_image : {new_image}")
#             if landmark_data:
#                 landmark_name=landmark_data['landmark_name']
#                 landmark_lat = landmark_data['landmark_lat']
#                 landmark_lng = landmark_data['landmark_lng']

#                 updated_data['latitude'] = updated_data.get('latitude', instance.latitude)
#                 updated_data['longitude'] = updated_data.get('longitude', instance.longitude)

#                 updated_data['distance_km'] = haversine(
#                     updated_data['latitude'],
#                     updated_data['longitude'],
#                     landmark_lat, landmark_lng
#                 )
#             logger.info(f"distance_km:{updated_data}")
#             updated_data['landmark_name']=landmark_name
#             # logger.info(f"Calculated Distance (km): {updated_data['distance_km']}")
  
      
#         logger.info(f"updated_data:{updated_data}")
#         # Save updated data through serializer
#         serializer.save(**updated_data)
#         logger.info(f"Updated Data Saved for Instance ID: {instance.pk}")
