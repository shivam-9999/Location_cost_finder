

from rest_framework import status, generics
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.permissions import IsAuthenticated
from .permissions import InsertAndViewOnlyPermission  # Import Custom Permission
from .models import LocationImage
from .serializers import LocationImageSerializer
import logging

logger = logging.getLogger(__name__)

# ✅ Insert Only (Create API)
class LocationImageUploadView(generics.CreateAPIView):
    queryset = LocationImage.objects.all()
    serializer_class = LocationImageSerializer
    parser_classes = (MultiPartParser, FormParser)
    permission_classes = [IsAuthenticated, InsertAndViewOnlyPermission]

    def create(self, request, *args, **kwargs):
        if 'home_address' not in request.data:
            request.data['home_address'] = "35 Davean Dr, North York, ON, Canada M2L 2R6"

        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():
            image_instance = serializer.save()
            response_data = LocationImageSerializer(image_instance).data
            return Response(response_data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

# ✅ Insert + List
class LocationImageListCreateView(generics.ListCreateAPIView):
    queryset = LocationImage.objects.all()
    serializer_class = LocationImageSerializer
    parser_classes = (MultiPartParser, FormParser)
    permission_classes = [IsAuthenticated, InsertAndViewOnlyPermission]

# ✅ Retrieve (Allow Viewing Details)
class LocationImageDetailView(generics.RetrieveAPIView):
    queryset = LocationImage.objects.all()
    serializer_class = LocationImageSerializer
    lookup_field = 'pk'
    permission_classes = [IsAuthenticated, InsertAndViewOnlyPermission]

# ❌ Disable Update (Blocked by Default)
class LocationImageUpdateView(generics.UpdateAPIView):
    queryset = LocationImage.objects.all()
    serializer_class = LocationImageSerializer
    lookup_field = 'pk'
    permission_classes = [InsertAndViewOnlyPermission]  # Blocked due to permission logic

    def perform_update(self, serializer):
        instance = serializer.instance
        logger.info(f"🔄 [UPDATE REQUEST] Request to update Image ID: {instance.id}")
        updated_instance = serializer.save()
        logger.info(f"✅ Successfully Updated Image Record with ID: {updated_instance.id}")

# ❌ Disable Delete (Blocked by Default)
class LocationImageDeleteView(generics.DestroyAPIView):
    queryset = LocationImage.objects.all()
    serializer_class = LocationImageSerializer
    lookup_field = 'pk'
    permission_classes = [InsertAndViewOnlyPermission]  # Blocked due to permission logic

# ❌ Disable Bulk Delete (Blocked by Default)
class DeleteAllLocationImagesView(generics.DestroyAPIView):
    queryset = LocationImage.objects.all()
    serializer_class = LocationImageSerializer
    permission_classes = [InsertAndViewOnlyPermission]  # Blocked due to permission logic

    def delete(self, request, *args, **kwargs):
        return Response({"message": "Bulk delete is not allowed."}, status=status.HTTP_403_FORBIDDEN)
