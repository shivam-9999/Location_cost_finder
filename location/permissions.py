from rest_framework.permissions import BasePermission

class InsertAndViewOnlyPermission(BasePermission):
    """
    Custom permission to allow only GET and POST requests.
    Denies PUT, PATCH, and DELETE requests.
    """
    def has_permission(self, request, view):
        # Allow only GET and POST
        return request.method in ['GET', 'POST']
