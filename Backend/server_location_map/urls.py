# version 3 : 
from django.contrib import admin
from django.urls import path
from location.views import LocationImageUploadView
from location.views import (
    LocationImageListCreateView,
    LocationImageDetailView,
    LocationImageUpdateView,
    LocationImageDeleteView,
    DeleteAllLocationImagesView
    
)

urlpatterns = [
    # Admin URLs
    path('admin/', admin.site.urls),
    # Image Management URLs
    path('api/location/upload/', LocationImageUploadView.as_view(), name='image-upload'),
    path('api/location/images/', LocationImageListCreateView.as_view(), name='image-list'),
    path('api/location/images/<int:pk>/', LocationImageDetailView.as_view(), name='image-detail'),
    path('api/location/images/<int:pk>/edit/', LocationImageUpdateView.as_view(), name='image-edit'),
    # Delete Urls
    path('api/location/images/<int:pk>/delete/', LocationImageDeleteView.as_view(), name='image-delete'),
     path('api/location/images/delete-all/', DeleteAllLocationImagesView.as_view(), name='delete-all-images'),
]