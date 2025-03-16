# version3 
from rest_framework import status, generics
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from .models import LocationImage
from .serializers import LocationImageSerializer, detect_landmark, get_coordinates, haversine


class LocationImageUploadView(generics.CreateAPIView):
    queryset = LocationImage.objects.all()
    serializer_class = LocationImageSerializer
    parser_classes = (MultiPartParser, FormParser)
    
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():
              # Save the image entry and retrieve the instance with id


            response_data = serializer.save()
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
        """Improvement Needed: Add logic to handle updates in `home_address` and `image` dynamically."""
        instance = serializer.instance

        #  Handle `home_address` changes
        new_home_address = self.request.data.get('home_address')
        if new_home_address:
            home_lat, home_lng = get_coordinates(new_home_address)
            if home_lat and home_lng:
                instance.latitude = home_lat
                instance.longitude = home_lng

        #  Handle `image` changes and re-run Vision API
        new_image = self.request.data.get('image')
        if new_image:
            landmark_data = detect_landmark(new_image)
            if landmark_data:
                landmark_lat = landmark_data['landmark_lat']
                landmark_lng = landmark_data['landmark_lng']
                instance.distance_km = haversine(instance.latitude, instance.longitude, landmark_lat, landmark_lng)

        #  Return enhanced response with updated data
        instance.save()
        serializer.save()


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