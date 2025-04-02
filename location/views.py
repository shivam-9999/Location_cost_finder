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
from rest_framework_simplejwt.authentication import JWTAuthentication
from .models import LocationImage
from .serializers import LocationImageSerializer, detect_landmark, get_coordinates, haversine
import logging
from django.db import connection
logger = logging.getLogger(__name__)

@method_decorator(ensure_csrf_cookie, name='dispatch')
class SuperAdminLoginView(APIView):
    permission_classes = [AllowAny]
    
    def post(self, request):
        username = request.data.get('username')
        password = request.data.get('password')
        
        if not username or not password:
            return Response(
                {'error': 'Please provide both username and password'},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        # First authenticate the user
        user = authenticate(username=username, password=password)
        
        if user is None:
            return Response(
                {'error': 'Invalid credentials'},
                status=status.HTTP_401_UNAUTHORIZED
            )
            
        # Then check if it's the correct user and group
        if user.username != 'superadminshivam':
            return Response(
                {'error': 'Invalid credentials'},
                status=status.HTTP_401_UNAUTHORIZED
            )
            
        if not user.groups.filter(name='superadmin').exists():
            return Response(
                {'error': 'User is not in superadmin group'},
                status=status.HTTP_403_FORBIDDEN
            )
            
        # Generate JWT tokens
        refresh = RefreshToken.for_user(user)
        
        # Get user groups
        groups = list(user.groups.values_list('name', flat=True))
        
        response = Response({
            "user": {
                "id": user.id,
                "username": user.username,
                "groups": groups
            },
            "access": str(refresh.access_token),
            "refresh": str(refresh)
        })
        
        # Set CSRF cookie properly
        csrf_token = get_token(request)
        response.set_cookie(
            'csrftoken',
            csrf_token,
            samesite='Lax',
            secure=False  # Set to True in production
        )
        return response

@method_decorator(ensure_csrf_cookie, name='dispatch')
class AdminLoginView(APIView):
    permission_classes = [AllowAny]
    
    def post(self, request):
        username = request.data.get('username')
        password = request.data.get('password')
        
        if not username or not password:
            return Response(
                {'error': 'Please provide both username and password'},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        # First authenticate the user
        user = authenticate(username=username, password=password)
        
        if user is None:
            return Response(
                {'error': 'Invalid credentials'},
                status=status.HTTP_401_UNAUTHORIZED
            )
            
        # Then check if it's the correct user and group
        if user.username != 'adminshivam':
            return Response(
                {'error': 'Invalid credentials'},
                status=status.HTTP_401_UNAUTHORIZED
            )
            
        if not user.groups.filter(name='admin').exists():
            return Response(
                {'error': 'User is not in admin group'},
                status=status.HTTP_403_FORBIDDEN
            )
            
        # Generate JWT tokens
        refresh = RefreshToken.for_user(user)
        
        # Get user groups
        groups = list(user.groups.values_list('name', flat=True))
        
        response = Response({
            "user": {
                "id": user.id,
                "username": user.username,
                "groups": groups
            },
            "access": str(refresh.access_token),
            "refresh": str(refresh)
        })
        
        # Set CSRF cookie properly
        csrf_token = get_token(request)
        response.set_cookie(
            'csrftoken',
            csrf_token,
            samesite='Lax',
            secure=False  # Set to True in production
        )
        return response

class LocationImageUploadView(generics.CreateAPIView):
    queryset = LocationImage.objects.all()
    serializer_class = LocationImageSerializer
    parser_classes = (MultiPartParser, FormParser)
    permission_classes = [IsAuthenticated, DjangoModelPermissions]
    authentication_classes = [JWTAuthentication]
    
    def create(self, request, *args, **kwargs):
        # Debug prints
        print("\n🔄 Request Data:", request.data)
        print("📁 Files:", request.FILES)
        
        # ✅ Enforce `home_address` before passing to serializer
        if 'home_address' not in request.data:
            request.data['home_address'] = "35 Davean Dr, North York, ON, Canada M2L 2R6"

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
    authentication_classes = [JWTAuthentication]

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
    authentication_classes = [JWTAuthentication]

# ✅ Update (Edit Image Details)
class LocationImageUpdateView(generics.UpdateAPIView):
    queryset = LocationImage.objects.all()
    serializer_class = LocationImageSerializer
    lookup_field = 'pk'
    permission_classes = [IsAuthenticated, DjangoModelPermissions]
    authentication_classes = [JWTAuthentication]

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
    authentication_classes = [JWTAuthentication]
    

# ✅ Delete all images (Remove all Images)
class DeleteAllLocationImagesView(generics.DestroyAPIView):
    queryset = LocationImage.objects.all()
    serializer_class = LocationImageSerializer
    permission_classes = [IsAuthenticated, DjangoModelPermissions]
    authentication_classes = [JWTAuthentication]

    def delete(self, request, *args, **kwargs):
        total_images = self.get_queryset().count()

        if total_images == 0:
            return Response({"message": "No images found to delete."}, status=status.HTTP_404_NOT_FOUND)

        # Delete all records
        self.get_queryset().delete()
        return Response({"message": f"✅ Successfully deleted {total_images} images."}, status=status.HTTP_200_OK)