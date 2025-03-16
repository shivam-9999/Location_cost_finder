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
    path('admin/', admin.site.urls),
    path('api/location/upload/', LocationImageUploadView.as_view(), name='image-upload'),
    path('images/', LocationImageListCreateView.as_view(), name='image-list'),
    path('images/<int:pk>/', LocationImageDetailView.as_view(), name='image-detail'),
    path('images/<int:pk>/edit/', LocationImageUpdateView.as_view(), name='image-edit'),
    path('images/<int:pk>/delete/', LocationImageDeleteView.as_view(), name='image-delete'),
     path('images/delete-all/', DeleteAllLocationImagesView.as_view(), name='delete-all-images'),
]