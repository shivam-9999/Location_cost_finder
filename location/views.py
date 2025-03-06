from rest_framework import status, generics
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from .models import LocationImage
from .serializers import LocationImageSerializer

class LocationImageUploadView(generics.CreateAPIView):
    queryset = LocationImage.objects.all()
    serializer_class = LocationImageSerializer
    parser_classes = (MultiPartParser, FormParser)  # Support image uploads
