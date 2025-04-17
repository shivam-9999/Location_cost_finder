# version 3 : 
from django.contrib import admin
from django.urls import path, re_path
from django.contrib.auth import get_user_model
from django.http import HttpResponse
from django.views.static import serve
from django.conf import settings
from django.conf.urls.static import static
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
    admin_signup_view,
    list_admin_requests,
    approve_admin_request,
    reject_admin_request,
    LogoutView, 
    LogoutAllDevicesView,
    CSRFCookieView,
    admin_login_view,
    superadmin_login_view,
    reset_admin_password,
    check_user_details,
    delete_user,
    delete_admin,
    list_users,
    list_admins
)
from rest_framework_simplejwt.views import TokenRefreshView

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
    path('api/auth/admin/signup/', admin_signup_view, name='admin-signup'),
    path('api/auth/admin/requests/', list_admin_requests, name='list-admin-requests'),
    path('api/auth/admin/approve/<int:request_id>/', approve_admin_request, name='approve-admin'),
    path('api/auth/admin/reject/<int:request_id>/', reject_admin_request, name='reject-admin'),
    path('api/auth/login/', login_view, name='login'),
    path('api/auth/admin/login/', admin_login_view, name='admin-login'),
    path('api/auth/superadmin/login/', superadmin_login_view, name='superadmin-login'),
    path('api/auth/admin/reset-password/', reset_admin_password, name='reset-admin-password'),
    path('api/auth/check-user/', check_user_details, name='check-user'),
    path('api/auth/logout/', LogoutView.as_view(), name='logout'),
    path('api/auth/logout-all/', LogoutAllDevicesView.as_view(), name='logout-all'),
    path('api/auth/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('api/auth/user/<int:user_id>/delete/', delete_user, name='delete-user'),
    path('api/auth/admin/<int:admin_id>/delete/', delete_admin, name='delete-admin'),
    path('api/auth/users/', list_users, name='list-users'),
    path('api/auth/admins/', list_admins, name='list-admins'),
    path('api/location/upload/', LocationImageUploadView.as_view(), name='image-upload'),
    path('api/images/', LocationImageListCreateView.as_view(), name='image-list'),
    path('api/images/<int:pk>/', LocationImageDetailView.as_view(), name='image-detail'),
    path('api/images/<int:pk>/edit/', LocationImageUpdateView.as_view(), name='image-edit'),
    path('api/images/<int:pk>/delete/', LocationImageDeleteView.as_view(), name='image-delete'),
    path('api/images/delete-all/', DeleteAllLocationImagesView.as_view(), name='delete-all-images'),
]

# Serve media files in both development and production
urlpatterns += [
    re_path(r'^media/(?P<path>.*)$', serve, {
        'document_root': settings.MEDIA_ROOT,
    }),
]

# Serve static files in development
if settings.DEBUG:
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)