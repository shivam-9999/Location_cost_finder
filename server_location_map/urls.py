# version 3 : 
from django.contrib import admin
from django.urls import path
from django.contrib.auth import get_user_model
from django.http import HttpResponse
from location.views import LocationImageUploadView
from location.views import (
    LocationImageListCreateView,
    LocationImageDetailView,
    LocationImageUpdateView,
    LocationImageDeleteView,
    DeleteAllLocationImagesView
)

def check_superuser(request):
    User = get_user_model()
    if User.objects.filter(is_superuser=True).exists():
        return HttpResponse("Superuser exists ✅")
    return HttpResponse("❌ No superuser found")

urlpatterns = [
    path('admin/', admin.site.urls),
    path('check-admin/', check_superuser),
    path('api/location/upload/', LocationImageUploadView.as_view(), name='image-upload'),
    path('images/', LocationImageListCreateView.as_view(), name='image-list'),
    path('images/<int:pk>/', LocationImageDetailView.as_view(), name='image-detail'),
    path('images/<int:pk>/edit/', LocationImageUpdateView.as_view(), name='image-edit'),
    path('images/<int:pk>/delete/', LocationImageDeleteView.as_view(), name='image-delete'),
    path('images/delete-all/', DeleteAllLocationImagesView.as_view(), name='delete-all-images'),
]