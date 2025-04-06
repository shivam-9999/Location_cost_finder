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
from rest_framework.permissions import AllowAny

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