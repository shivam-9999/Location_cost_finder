from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate
from django.middleware.csrf import get_token
from django.conf import settings

class LoginView(APIView):
    permission_classes = []

    def post(self, request):
        username = request.data.get('username')
        password = request.data.get('password')
        
        user = authenticate(username=username, password=password)
        
        if user is not None:
            refresh = RefreshToken.for_user(user)
            access_token = str(refresh.access_token)
            refresh_token = str(refresh)

            response = Response({
                'user': {
                    'id': user.id,
                    'username': user.username,
                    'groups': list(user.groups.values_list('name', flat=True))
                },
                'access': access_token,
                'refresh': refresh_token
            })

            # Set httpOnly cookies
            response.set_cookie(
                settings.JWT_AUTH_COOKIE,
                access_token,
                httponly=True,
                samesite=settings.JWT_AUTH_SAMESITE,
                secure=settings.JWT_AUTH_SECURE
            )
            response.set_cookie(
                settings.JWT_AUTH_REFRESH_COOKIE,
                refresh_token,
                httponly=True,
                samesite=settings.JWT_AUTH_SAMESITE,
                secure=settings.JWT_AUTH_SECURE
            )

            # Set CSRF token
            csrf_token = get_token(request)
            response.set_cookie(
                'csrftoken',
                csrf_token,
                samesite=settings.JWT_AUTH_SAMESITE,
                secure=settings.JWT_AUTH_SECURE
            )

            return response

        return Response(
            {'error': 'Invalid credentials'},
            status=status.HTTP_401_UNAUTHORIZED
        )

class LogoutView(APIView):
    def post(self, request):
        response = Response({'message': 'Logged out successfully'})
        response.delete_cookie(settings.JWT_AUTH_COOKIE)
        response.delete_cookie(settings.JWT_AUTH_REFRESH_COOKIE)
        response.delete_cookie('csrftoken')
        return response 