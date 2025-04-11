from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate
from django.middleware.csrf import get_token, rotate_token
from django.conf import settings
from rest_framework_simplejwt.token_blacklist.models import OutstandingToken, BlacklistedToken
from django.contrib.auth import get_user_model
from rest_framework.permissions import IsAuthenticated
from django.views.decorators.csrf import ensure_csrf_cookie, csrf_protect
from django.utils.decorators import method_decorator
from rest_framework_simplejwt.views import TokenRefreshView
from django.http import JsonResponse
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from rest_framework_simplejwt.settings import api_settings
from django.middleware.csrf import CsrfViewMiddleware
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from django.contrib.auth.models import Group
from django.utils import timezone
from .models import AdminRegistrationRequest
import re

class CookieJWTAuthentication(JWTAuthentication):
    def authenticate(self, request):
        header = self.get_header(request)
        if header is None:
            # Try to get token from cookie
            raw_token = request.COOKIES.get('access_token')
            if raw_token is None:
                return None

        try:
            validated_token = self.get_validated_token(raw_token)
            return self.get_user(validated_token), validated_token
        except TokenError as e:
            raise InvalidToken(e.args[0])

@method_decorator(ensure_csrf_cookie, name='dispatch')
class CSRFCookieView(APIView):
    permission_classes = []

    def get(self, request):
        csrf_token = get_token(request)
        response = Response({'detail': 'CSRF cookie set'})
        response.set_cookie(
            key='csrftoken',
            value=csrf_token,
            httponly=False,  # So JS can read and send it
            secure=False,     # Set False in dev if not using HTTPS
            samesite='Lax'
        )
        return response

@api_view(['POST'])
@permission_classes([AllowAny])
def login_view(request):
    # Check if CSRF token exists in cookies
    csrf_token = request.COOKIES.get('csrftoken')
    if not csrf_token:
        return Response(
            {'error': 'CSRF token not found. Please get a CSRF token first.'},
            status=status.HTTP_403_FORBIDDEN
        )

    username = request.data.get('username')
    password = request.data.get('password')
    
    user = authenticate(username=username, password=password)
    if user is None:
        return Response({'error': 'Invalid credentials'}, status=status.HTTP_401_UNAUTHORIZED)

    # Prevent admin and superadmin users from using this endpoint
    if user.is_superuser or user.is_staff or user.groups.filter(name='admin').exists():
        return Response(
            {'error': 'Please use the appropriate admin or superadmin login endpoint'},
            status=status.HTTP_403_FORBIDDEN
        )

    refresh = RefreshToken.for_user(user)
    access = str(refresh.access_token)

    response = Response({
        'user': {
            'id': user.id,
            'username': user.username,
            'groups': list(user.groups.values_list('name', flat=True))
        }
    })

    response.set_cookie('access_token', access, httponly=True, secure=True, samesite='Lax')
    response.set_cookie('refresh_token', str(refresh), httponly=True, secure=True, samesite='Lax')

    return response

class LogoutView(APIView):
    permission_classes = []  # No authentication required for logout
    authentication_classes = []  # No authentication required for logout
    
    def post(self, request):
        response = Response({'message': 'Logged out successfully'})
        # Clear all auth cookies
        response.delete_cookie('access_token')
        response.delete_cookie('refresh_token')
        response.delete_cookie('csrftoken')
        # Clear session cookie if it exists
        response.delete_cookie('sessionid')
        return response

class LogoutAllDevicesView(APIView):
    permission_classes = [IsAuthenticated]
    authentication_classes = [CookieJWTAuthentication]
    
    def post(self, request):
        try:
            # Get the current user
            user = request.user
            
            # Get all outstanding tokens for the user
            outstanding_tokens = OutstandingToken.objects.filter(user=user)
            
            # Blacklist all outstanding tokens
            for token in outstanding_tokens:
                BlacklistedToken.objects.get_or_create(token=token)
            
            # Clear all cookies
            response = Response({'message': 'Logged out from all devices successfully'})
            response.delete_cookie('access_token')
            response.delete_cookie('refresh_token')
            response.delete_cookie('csrftoken')
            # Clear session cookie if it exists
            response.delete_cookie('sessionid')
            
            return response
            
        except Exception as e:
            return Response(
                {'error': f'Error logging out from all devices: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class CustomTokenRefreshView(TokenRefreshView):
    def post(self, request, *args, **kwargs):
        refresh_token = request.COOKIES.get('refresh_token')
        
        if not refresh_token:
            return Response(
                {'error': 'No refresh token found in cookies'},
                status=status.HTTP_401_UNAUTHORIZED
            )
            
        try:
            refresh = RefreshToken(refresh_token)
            access_token = str(refresh.access_token)
            
            response = Response({
                'message': 'Token refreshed successfully'
            })
            
            # Set new access token cookie
            response.set_cookie(
                'access_token',
                access_token,
                httponly=True,
                secure=False,
                samesite='Lax',
            )
            
            return response
            
        except Exception as e:
            return Response(
                {'error': 'Invalid refresh token'},
                status=status.HTTP_401_UNAUTHORIZED
            )

@api_view(['POST'])
@permission_classes([AllowAny])
def admin_login_view(request):
    # Check if CSRF token exists in cookies
    csrf_token = request.COOKIES.get('csrftoken')
    if not csrf_token:
        return Response(
            {'error': 'CSRF token not found. Please get a CSRF token first.'},
            status=status.HTTP_403_FORBIDDEN
        )

    username = request.data.get('username')
    password = request.data.get('password')
    
    user = authenticate(username=username, password=password)
    if user is None:
        return Response(
            {'error': 'Invalid credentials'}, 
            status=status.HTTP_401_UNAUTHORIZED
        )

    # Check if user is staff AND in admin group
    if not user.is_staff or not user.groups.filter(name='admin').exists():
        return Response(
            {'error': 'User is not an admin'}, 
            status=status.HTTP_403_FORBIDDEN
        )

    refresh = RefreshToken.for_user(user)
    access = str(refresh.access_token)

    response = Response({
        'user': {
            'id': user.id,
            'username': user.username,
            'groups': list(user.groups.values_list('name', flat=True))
        }
    })

    response.set_cookie('access_token', access, httponly=True, secure=True, samesite='Lax')
    response.set_cookie('refresh_token', str(refresh), httponly=True, secure=True, samesite='Lax')

    return response

@api_view(['POST'])
@permission_classes([AllowAny])
def superadmin_login_view(request):
    # Check if CSRF token exists in cookies
    csrf_token = request.COOKIES.get('csrftoken')
    if not csrf_token:
        return Response(
            {'error': 'CSRF token not found. Please get a CSRF token first.'},
            status=status.HTTP_403_FORBIDDEN
        )

    username = request.data.get('username')
    password = request.data.get('password')
    
    user = authenticate(username=username, password=password)
    if user is None or not user.is_superuser:
        return Response(
            {'error': 'Invalid credentials or not a superadmin user'}, 
            status=status.HTTP_401_UNAUTHORIZED
        )

    refresh = RefreshToken.for_user(user)
    access = str(refresh.access_token)

    response = Response({
        'user': {
            'id': user.id,
            'username': user.username,
            'groups': list(user.groups.values_list('name', flat=True))
        }
    })

    response.set_cookie('access_token', access, httponly=True, secure=True, samesite='Lax')
    response.set_cookie('refresh_token', str(refresh), httponly=True, secure=True, samesite='Lax')

    return response

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def reset_admin_password(request):
    # Check if the requesting user is a superadmin
    if not request.user.is_superuser:
        return Response(
            {'error': 'Only superadmin can reset admin passwords'},
            status=status.HTTP_403_FORBIDDEN
        )

    # Get the admin username and new password from request
    username = request.data.get('username')
    new_password = request.data.get('new_password')

    if not username or not new_password:
        return Response(
            {'error': 'Username and new password are required'},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        # Get the admin user
        admin_user = get_user_model().objects.get(username=username, is_staff=True)
        
        # Set the new password
        admin_user.set_password(new_password)
        admin_user.save()

        # Blacklist all existing tokens for this user
        OutstandingToken.objects.filter(user=admin_user).delete()

        return Response({
            'message': f'Password reset successfully for admin user: {username}'
        })

    except get_user_model().DoesNotExist:
        return Response(
            {'error': 'Admin user not found'},
            status=status.HTTP_404_NOT_FOUND
        )
    except Exception as e:
        return Response(
            {'error': f'Error resetting password: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['POST'])
@permission_classes([AllowAny])
def check_user_details(request):
    username = request.data.get('username')
    password = request.data.get('password')
    
    if not username or not password:
        return Response(
            {'error': 'Username and password are required'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    try:
        user = get_user_model().objects.get(username=username)
        is_authenticated = authenticate(username=username, password=password) is not None
        is_staff = user.is_staff
        is_superuser = user.is_superuser
        
        return Response({
            'username': username,
            'exists': True,
            'is_authenticated': is_authenticated,
            'is_staff': is_staff,
            'is_superuser': is_superuser,
            'groups': list(user.groups.values_list('name', flat=True))
        })
    except get_user_model().DoesNotExist:
        return Response({
            'username': username,
            'exists': False,
            'message': 'User not found'
        })

@api_view(['POST'])
@permission_classes([AllowAny])
def signup_view(request):
    # Check if CSRF token exists in cookies
    csrf_token = request.COOKIES.get('csrftoken')
    if not csrf_token:
        return Response(
            {'error': 'CSRF token not found. Please get a CSRF token first.'},
            status=status.HTTP_403_FORBIDDEN
        )

    username = request.data.get('username')
    password = request.data.get('password')
    email = request.data.get('email', '').strip()  # Make email optional

    if not username or not password:
        return Response(
            {'error': 'Username and password are required'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Username validation
    if len(username) < 3:
        return Response(
            {'error': 'Username must be at least 3 characters long'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Password validation
    if len(password) < 6:
        return Response(
            {'error': 'Password must be at least 6 characters long'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Email validation (if provided)
    if email:
        email_regex = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        if not re.match(email_regex, email):
            return Response(
                {'error': 'Invalid email format'},
                status=status.HTTP_400_BAD_REQUEST
            )

    # Check if username already exists
    User = get_user_model()
    if User.objects.filter(username=username).exists():
        return Response(
            {'error': 'Username already exists'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Check if email already exists (if provided)
    if email and User.objects.filter(email=email).exists():
        return Response(
            {'error': 'Email already registered'},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        # Create new user
        user = User.objects.create_user(
            username=username,
            password=password,
            email=email if email else None  # Set email to None if not provided
        )

        # Add user to 'user' group
        user_group, created = Group.objects.get_or_create(name='user')
        user.groups.add(user_group)

        # Generate tokens
        refresh = RefreshToken.for_user(user)
        access = str(refresh.access_token)

        response = Response({
            'message': 'User created successfully',
            'user': {
                'id': user.id,
                'username': user.username,
                'email': user.email if user.email else '',
                'groups': list(user.groups.values_list('name', flat=True))
            }
        })

        # Set cookies
        response.set_cookie('access_token', access, httponly=True, secure=True, samesite='Lax')
        response.set_cookie('refresh_token', str(refresh), httponly=True, secure=True, samesite='Lax')

        return response

    except Exception as e:
        return Response(
            {'error': f'Error creating user: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['POST'])
@permission_classes([AllowAny])
def admin_signup_view(request):
    """
    Endpoint for admin registration requests.
    Creates a user and AdminRegistrationRequest, but doesn't grant admin privileges until approved.
    """
    # Check if CSRF token exists in cookies
    csrf_token = request.COOKIES.get('csrftoken')
    if not csrf_token:
        return Response(
            {'error': 'CSRF token not found. Please get a CSRF token first.'},
            status=status.HTTP_403_FORBIDDEN
        )

    username = request.data.get('username')
    password = request.data.get('password')
    email = request.data.get('email', '').strip()  # Make email optional

    if not username or not password:
        return Response(
            {'error': 'Username and password are required'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Username validation
    if len(username) < 3:
        return Response(
            {'error': 'Username must be at least 3 characters long'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Password validation
    if len(password) < 8:
        return Response(
            {'error': 'Password must be at least 8 characters long'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Email validation (if provided)
    if email:
        email_regex = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        if not re.match(email_regex, email):
            return Response(
                {'error': 'Invalid email format'},
                status=status.HTTP_400_BAD_REQUEST
            )

    # Check if username already exists
    User = get_user_model()
    if User.objects.filter(username=username).exists():
        return Response(
            {'error': 'Username already exists'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Check if email already exists (if provided)
    if email and User.objects.filter(email=email).exists():
        return Response(
            {'error': 'Email already registered'},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        # Create user (not yet admin)
        user = User.objects.create_user(
            username=username,
            password=password,
            email=email if email else None,  # Make email optional
            is_active=True,  # User can login but won't have admin privileges
            is_staff=False   # Will be set to True upon approval
        )

        # Create admin registration request
        AdminRegistrationRequest.objects.create(user=user)

        return Response({
            'message': 'Admin registration request submitted successfully. Waiting for superadmin approval.',
            'user': {
                'id': user.id,
                'username': user.username,
                'email': user.email if user.email else ''
            }
        }, status=status.HTTP_201_CREATED)

    except Exception as e:
        return Response(
            {'error': f'Error creating admin request: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_admin_requests(request):
    """List all pending admin registration requests. Only accessible by superadmin."""
    if not request.user.is_superuser:
        return Response(
            {'error': 'Only superadmin can view admin requests'},
            status=status.HTTP_403_FORBIDDEN
        )

    requests = AdminRegistrationRequest.objects.filter(is_approved=False)
    requests_data = [{
        'id': req.id,
        'username': req.user.username,
        'email': req.user.email,
        'created_at': req.created_at
    } for req in requests]

    return Response(requests_data)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def approve_admin_request(request, request_id):
    """Approve an admin registration request. Only accessible by superadmin."""
    if not request.user.is_superuser:
        return Response(
            {'error': 'Only superadmin can approve admin requests'},
            status=status.HTTP_403_FORBIDDEN
        )

    try:
        admin_request = AdminRegistrationRequest.objects.get(id=request_id, is_approved=False)
    except AdminRegistrationRequest.DoesNotExist:
        return Response(
            {'error': 'Admin request not found or already approved'},
            status=status.HTTP_404_NOT_FOUND
        )

    # Update the user to be an admin
    user = admin_request.user
    user.is_staff = True
    user.save()

    # Add user to admin group
    admin_group, _ = Group.objects.get_or_create(name='admin')
    user.groups.add(admin_group)

    # Update the request
    admin_request.is_approved = True
    admin_request.approved_at = timezone.now()
    admin_request.approved_by = request.user
    admin_request.save()

    return Response({
        'message': f'Admin request for {user.username} approved successfully',
        'admin': {
            'id': user.id,
            'username': user.username,
            'email': user.email
        }
    })

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def reject_admin_request(request, request_id):
    """Reject an admin registration request. Only accessible by superadmin."""
    if not request.user.is_superuser:
        return Response(
            {'error': 'Only superadmin can reject admin requests'},
            status=status.HTTP_403_FORBIDDEN
        )

    try:
        admin_request = AdminRegistrationRequest.objects.get(id=request_id, is_approved=False)
    except AdminRegistrationRequest.DoesNotExist:
        return Response(
            {'error': 'Admin request not found or already processed'},
            status=status.HTTP_404_NOT_FOUND
        )

    # Delete the user and the request
    user = admin_request.user
    username = user.username
    user.delete()  # This will also delete the admin_request due to CASCADE

    return Response({
        'message': f'Admin request for {username} rejected and user account removed'
    })

@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_user(request, user_id):
    """Delete a regular user. Only accessible by superadmin."""
    if not request.user.is_superuser:
        return Response(
            {'error': 'Only superadmin can delete users'},
            status=status.HTTP_403_FORBIDDEN
        )

    try:
        User = get_user_model()
        user = User.objects.get(id=user_id)
        
        # Prevent deletion of admin/superadmin users through this endpoint
        if user.is_superuser or user.is_staff or user.groups.filter(name='admin').exists():
            return Response(
                {'error': 'Cannot delete admin or superadmin users through this endpoint'},
                status=status.HTTP_403_FORBIDDEN
            )
            
        # Prevent self-deletion
        if user == request.user:
            return Response(
                {'error': 'Cannot delete your own account'},
                status=status.HTTP_403_FORBIDDEN
            )
            
        username = user.username
        user.delete()
        
        return Response({
            'message': f'User {username} has been deleted successfully'
        })
        
    except User.DoesNotExist:
        return Response(
            {'error': 'User not found'},
            status=status.HTTP_404_NOT_FOUND
        )
    except Exception as e:
        return Response(
            {'error': f'Error deleting user: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_admin(request, admin_id):
    """Delete an admin user. Only accessible by superadmin."""
    if not request.user.is_superuser:
        return Response(
            {'error': 'Only superadmin can delete admins'},
            status=status.HTTP_403_FORBIDDEN
        )

    try:
        User = get_user_model()
        admin = User.objects.get(id=admin_id)
        
        # Check if the user is actually an admin
        if not (admin.is_staff and admin.groups.filter(name='admin').exists()):
            return Response(
                {'error': 'Specified user is not an admin'},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        # Prevent deletion of superadmin
        if admin.is_superuser:
            return Response(
                {'error': 'Cannot delete superadmin users'},
                status=status.HTTP_403_FORBIDDEN
            )
            
        # Prevent self-deletion
        if admin == request.user:
            return Response(
                {'error': 'Cannot delete your own account'},
                status=status.HTTP_403_FORBIDDEN
            )
            
        username = admin.username
        admin.delete()
        
        return Response({
            'message': f'Admin {username} has been deleted successfully'
        })
        
    except User.DoesNotExist:
        return Response(
            {'error': 'Admin not found'},
            status=status.HTTP_404_NOT_FOUND
        )
    except Exception as e:
        return Response(
            {'error': f'Error deleting admin: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_users(request):
    """List all regular users. Only accessible by superadmin."""
    try:
        # Explicitly check authentication
        if not request.user.is_authenticated:
            return Response(
                {'error': 'Authentication required'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        if not request.user.is_superuser:
            return Response(
                {'error': 'Only superadmin can view user list'},
                status=status.HTTP_403_FORBIDDEN
            )

        User = get_user_model()
        # Get only regular users (not admins or superadmins)
        users = User.objects.filter(is_superuser=False, is_staff=False).exclude(
            groups__name='admin'
        )
        
        users_data = [{
            'id': user.id,
            'username': user.username,
            'email': user.email if user.email else '',
            'date_joined': user.date_joined,
            'last_login': user.last_login,
            'is_active': user.is_active,
            'groups': list(user.groups.values_list('name', flat=True))
        } for user in users]

        return Response(users_data)
    except Exception as e:
        return Response(
            {'error': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_admins(request):
    """List all admin users. Only accessible by superadmin."""
    if not request.user.is_superuser:
        return Response(
            {'error': 'Only superadmin can view admin list'},
            status=status.HTTP_403_FORBIDDEN
        )

    User = get_user_model()
    # Get all admin users (users who are staff and in admin group)
    admins = User.objects.filter(
        is_staff=True,
        groups__name='admin'
    ).exclude(is_superuser=True)  # Exclude superadmins
    
    admins_data = [{
        'id': admin.id,
        'username': admin.username,
        'email': admin.email if admin.email else '',
        'date_joined': admin.date_joined,
        'last_login': admin.last_login,
        'is_active': admin.is_active,
        'groups': list(admin.groups.values_list('name', flat=True))
    } for admin in admins]

    return Response(admins_data) 