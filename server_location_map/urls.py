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
    DeleteAllLocationImagesView,
)
from location.auth_views import (
    login_view,
    signup_view,
    LogoutView, 
    LogoutAllDevicesView,
    CSRFCookieView,
    admin_login_view,
    superadmin_login_view,
    reset_admin_password,
    check_user_details
)
from rest_framework_simplejwt.views import TokenRefreshView
from django.conf import settings
from django.conf.urls.static import static

def check_superuser(request):
    User = get_user_model()
    if User.objects.filter(is_superuser=True).exists():
        return HttpResponse("Superuser exists ✅")
    return HttpResponse("❌ No superuser found")

urlpatterns = [
    path('admin/', admin.site.urls),
    path('check-admin/', check_superuser),
    path('api/auth/csrf/', CSRFCookieView.as_view(), name='csrf'),
    path('api/auth/signup/', signup_view, name='signup'),
    path('api/auth/login/', login_view, name='login'),
    path('api/auth/admin/login/', admin_login_view, name='admin-login'),
    path('api/auth/superadmin/login/', superadmin_login_view, name='superadmin-login'),
    path('api/auth/admin/reset-password/', reset_admin_password, name='reset-admin-password'),
    path('api/auth/check-user/', check_user_details, name='check-user'),
    path('api/auth/logout/', LogoutView.as_view(), name='logout'),
    path('api/auth/logout-all/', LogoutAllDevicesView.as_view(), name='logout-all'),
    path('api/auth/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('api/location/upload/', LocationImageUploadView.as_view(), name='image-upload'),
    path('images/', LocationImageListCreateView.as_view(), name='image-list'),
    path('images/<int:pk>/', LocationImageDetailView.as_view(), name='image-detail'),
    path('images/<int:pk>/edit/', LocationImageUpdateView.as_view(), name='image-edit'),
    path('images/<int:pk>/delete/', LocationImageDeleteView.as_view(), name='image-delete'),
    path('images/delete-all/', DeleteAllLocationImagesView.as_view(), name='delete-all-images'),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)