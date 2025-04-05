# version3 
from rest_framework import status, generics
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.permissions import DjangoModelPermissions, IsAuthenticated, AllowAny
from rest_framework.views import APIView
from django.contrib.auth import authenticate, login
from django.contrib.auth.models import User, Group
from rest_framework_simplejwt.tokens import RefreshToken
from django.views.decorators.csrf import ensure_csrf_cookie
from django.utils.decorators import method_decorator
from django.middleware.csrf import get_token
from .authentication import CookieJWTAuthentication
from .models import LocationImage
from .serializers import LocationImageSerializer, detect_landmark, get_coordinates, haversine
import logging
from django.db import connection
logger = logging.getLogger(__name__)


class LocationImageUploadView(generics.CreateAPIView):
    queryset = LocationImage.objects.all()
    serializer_class = LocationImageSerializer
    parser_classes = (MultiPartParser, FormParser)
    permission_classes = [IsAuthenticated, DjangoModelPermissions]
    authentication_classes = [CookieJWTAuthentication]
    
    def create(self, request, *args, **kwargs):
        # Debug prints
        print("\n🔄 Request Data:", request.data)
        print("📁 Files:", request.FILES)
        
        # ✅ Enforce `home_address` before passing to serializer
        if 'home_address' not in request.data:
            request.data['home_address'] = "Davean Dr, North York, ON, Canada M2L 2R6"

        serializer = self.get_serializer(data=request.data)
        print("\n🔍 Before Validation - Serializer Data:", serializer.initial_data)

        if serializer.is_valid():
            print("\n🔥 Serializer Validated:", serializer.validated_data)
            image_instance = serializer.save()
            print("✅ Saved Instance:", image_instance.id)
            print("📦 Total records now:", LocationImage.objects.count())
            
            response_data = LocationImageSerializer(image_instance).data
            return Response(response_data, status=status.HTTP_201_CREATED)
        
        print("\n❌ Validation Errors:", serializer.errors)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# ✅ Create + List
class LocationImageListCreateView(generics.ListCreateAPIView):
    queryset = LocationImage.objects.all()
    serializer_class = LocationImageSerializer
    parser_classes = (MultiPartParser, FormParser)
    permission_classes = [IsAuthenticated, DjangoModelPermissions]
    authentication_classes = [CookieJWTAuthentication]

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
    permission_classes = [IsAuthenticated, DjangoModelPermissions]
    authentication_classes = [CookieJWTAuthentication]

# ✅ Update (Edit Image Details)
class LocationImageUpdateView(generics.UpdateAPIView):
    queryset = LocationImage.objects.all()
    serializer_class = LocationImageSerializer
    lookup_field = 'pk'
    permission_classes = [IsAuthenticated, DjangoModelPermissions]
    authentication_classes = [CookieJWTAuthentication]

    def perform_update(self, serializer):
        """Improved logic for updating records."""
        instance = serializer.instance
        # Enhanced Logging
        logger.info(f"🔄 [UPDATE REQUEST] Request to update Image ID: {instance.id}")
        updated_instance = serializer.save()
        logger.info(f"✅ Successfully Updated Image Record with ID: {updated_instance.id}")



# ✅ Delete (Remove an Image)
class LocationImageDeleteView(generics.DestroyAPIView):
    queryset = LocationImage.objects.all()
    serializer_class = LocationImageSerializer
    lookup_field = 'pk'
    permission_classes = [IsAuthenticated, DjangoModelPermissions]
    authentication_classes = [CookieJWTAuthentication]
    

# ✅ Delete all images (Remove all Images)
class DeleteAllLocationImagesView(generics.DestroyAPIView):
    queryset = LocationImage.objects.all()
    serializer_class = LocationImageSerializer
    permission_classes = [IsAuthenticated, DjangoModelPermissions]
    authentication_classes = [CookieJWTAuthentication]

    def delete(self, request, *args, **kwargs):
        total_images = self.get_queryset().count()

        if total_images == 0:
            return Response({"message": "No images found to delete."}, status=status.HTTP_404_NOT_FOUND)

        # Delete all records
        self.get_queryset().delete()
        return Response({"message": f"✅ Successfully deleted {total_images} images."}, status=status.HTTP_200_OK)