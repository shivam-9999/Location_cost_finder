# version 3 : 
from django.contrib import admin
from django.urls import path, include
from location.views import LocationImageUploadView
from location.views import (
    LocationImageListCreateView,
    LocationImageDetailView,
    LocationImageUpdateView,
    LocationImageDeleteView,
    DeleteAllLocationImagesView
    
)
from django.http import HttpResponse
import logging

logger = logging.getLogger(__name__)

def health_check(request):
    """Health check endpoint for Azure."""
    return HttpResponse("OK", status=200)

def test_view(request):
    logger.debug("Test view was called")
    try:
        # Test database connection
        from django.db import connection
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
            result = cursor.fetchone()
        db_status = "Database connection successful"
    except Exception as e:
        db_status = f"Database error: {str(e)}"
    
    # Get environment variables
    import os
    env_vars = {
        'DEBUG': os.getenv('DEBUG'),
        'ALLOWED_HOSTS': os.getenv('ALLOWED_HOSTS'),
        'DBNAME': os.getenv('DBNAME'),
        'DBHOST': os.getenv('DBHOST'),
        'DJANGO_LOG_LEVEL': os.getenv('DJANGO_LOG_LEVEL'),
    }
    
    response_text = f"""
    Test endpoint is working!
    Database status: {db_status}
    Environment variables:
    {env_vars}
    """
    return HttpResponse(response_text)

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('location.urls')),
    path('test/', test_view, name='test_view'),
    path('health/', health_check, name='health_check'),
    path('api/location/upload/', LocationImageUploadView.as_view(), name='image-upload'),
    path('images/', LocationImageListCreateView.as_view(), name='image-list'),
    path('images/<int:pk>/', LocationImageDetailView.as_view(), name='image-detail'),
    path('images/<int:pk>/edit/', LocationImageUpdateView.as_view(), name='image-edit'),
    path('images/<int:pk>/delete/', LocationImageDeleteView.as_view(), name='image-delete'),
    path('images/delete-all/', DeleteAllLocationImagesView.as_view(), name='delete-all-images'),
]