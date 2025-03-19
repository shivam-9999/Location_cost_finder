from rest_framework.permissions import BasePermission
from rest_framework.exceptions import PermissionDenied

class CustomAdminPermission(BasePermission):
    """
    SuperAdmin can perform: GET, POST, PUT, PATCH, DELETE
    Admin can perform: GET, POST, PUT, PATCH (No DELETE)
    Regular users can perform: GET, POST
    """

    def has_permission(self, request, view):
        # SuperAdmin can access everything
        if request.user.is_superuser:
            return True
        
        # Admin logic
        if request.user.is_staff:
            if request.method == 'DELETE':
                raise PermissionDenied("❌ Admins are not allowed to DELETE.")
            return request.method in ['GET', 'POST', 'PUT', 'PATCH']

        # Non-admin logic (regular users)
        if request.method not in ['GET', 'POST']:
            raise PermissionDenied("❌ Regular users are restricted to GET and POST only.")
        
        return request.method in ['GET', 'POST']

    def has_object_permission(self, request, view, obj):
        """Ensures object-level control."""
        if request.user.is_superuser:
            return True

        # Admin logic
        if request.user.is_staff:
            if request.method == 'DELETE':
                raise PermissionDenied("❌ Admins are not allowed to DELETE.")
            return request.method in ['GET', 'POST', 'PUT', 'PATCH']

        # Regular users are restricted
        if request.method not in ['GET', 'POST']:
            raise PermissionDenied("❌ Regular users are restricted to GET and POST only.")

        return request.method in ['GET', 'POST']