from django.shortcuts import render

# Create your views here.
from rest_framework. views import APIView
from rest_framework. response import Response
from rest_framework import status
from .models import Product
from .serializers import ProductSerializer
# 200 404 page not found, 403 forbidden 401
# unauthorized 500 internal server error
# Create your views here.
class ProductListCreateAPIView(APIView):
    def get(self, request):
        product=Product.objects.all ()
        serializer= ProductSerializer(product, many=True)
        return Response(serializer.data)

    def post (self, request):
        serializer=ProductSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors)