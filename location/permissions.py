from rest_framework.permissions import BasePermission, SAFE_METHODS

class CustomAdminPermission(BasePermission):
    """
    Admin can: GET, POST, PUT, PATCH (No DELETE)
    Regular users can: GET, POST
    """
    def has_permission(self, request, view):
        # Admin logic
        if request.user.is_staff:
            return request.method in ['GET', 'POST', 'PUT', 'PATCH']

        # Non-admin logic (regular users)
        return request.method in ['GET', 'POST']
