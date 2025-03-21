


from rest_framework import status, generics
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.permissions import IsAuthenticated
from .permissions import CustomAdminPermission
from .models import LocationImage
from .serializers import LocationImageSerializer
import logging

logger = logging.getLogger(__name__)

# ✅ Insert Only (Create API)
class LocationImageUploadView(generics.CreateAPIView):
    queryset = LocationImage.objects.all()
    serializer_class = LocationImageSerializer
    parser_classes = (MultiPartParser, FormParser)
    permission_classes = [IsAuthenticated, CustomAdminPermission]

# ✅ Insert + List
class LocationImageListCreateView(generics.ListCreateAPIView):
    queryset = LocationImage.objects.all()
    serializer_class = LocationImageSerializer
    parser_classes = (MultiPartParser, FormParser)
    permission_classes = [IsAuthenticated, CustomAdminPermission]

# ✅ Retrieve (Allow Viewing Details)
class LocationImageDetailView(generics.RetrieveAPIView):
    queryset = LocationImage.objects.all()
    serializer_class = LocationImageSerializer
    lookup_field = 'pk'
    permission_classes = [IsAuthenticated, CustomAdminPermission]

# ✅ Update (Admin Only)
class LocationImageUpdateView(generics.UpdateAPIView):
    queryset = LocationImage.objects.all()
    serializer_class = LocationImageSerializer
    lookup_field = 'pk'
    permission_classes = [IsAuthenticated, CustomAdminPermission]

# ✅ DELETE (SuperAdmin Only)
class LocationImageDeleteView(generics.DestroyAPIView):
    queryset = LocationImage.objects.all()
    serializer_class = LocationImageSerializer
    lookup_field = 'pk'
    permission_classes = [IsAuthenticated, CustomAdminPermission]

# ✅ Bulk Delete (SuperAdmin Only)
class DeleteAllLocationImagesView(APIView):
    # queryset = LocationImage.objects.all()
    # serializer_class = LocationImageSerializer
    # permission_classes = [IsAuthenticated, CustomAdminPermission]
    permission_classes = [IsAuthenticated, CustomAdminPermission]
    
    def delete(self, request, *args, **kwargs):
        total_images = LocationImage.objects.count()

        if total_images == 0:
            return Response(
                {"message": "No images found to delete."},
                status=status.HTTP_404_NOT_FOUND
            )

        # Bulk delete
        LocationImage.objects.all().delete()

        return Response(
            {"message": f"✅ Successfully deleted {total_images} images."},
            status=status.HTTP_200_OK
        )
