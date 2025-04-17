
from pathlib import Path
import os
from dotenv import load_dotenv
import urllib.parse
from sqlalchemy import create_engine, text
import dj_database_url
from datetime import timedelta
import json

load_dotenv()  # Load .env file

GOOGLE_API_KEY = os.getenv('GOOGLE_API_KEY')

BASE_DIR = Path(__file__).resolve().parent.parent
# Build paths inside the project like this: BASE_DIR / 'subdir'.

# Quick-start development settings - unsuitable for production
# See https://docs.djangoproject.com/en/5.1/howto/deployment/checklist/

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = os.getenv('SECRET_KEY')

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = os.getenv('DEBUG', 'False') == 'True'  # Default to False for production

# For shared cookie access
BASE_DOMAIN = '.locationcostfinder.space' if not DEBUG else None

# Handle ALLOWED_HOSTS with a default value
allowed_hosts_str = os.getenv('ALLOWED_HOSTS', '["*"]')
try:
    ALLOWED_HOSTS = json.loads(allowed_hosts_str)
except json.JSONDecodeError:
    ALLOWED_HOSTS = ['*']  # Fallback to allowing all hosts if JSON parsing fails

# Application definition

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'rest_framework',
    'rest_framework_simplejwt',
    'rest_framework_simplejwt.token_blacklist',
    'corsheaders',
    'location'
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'server_location_map.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'server_location_map.wsgi.application'

# Database configuration
# DATABASES = {
#     'default': {
#         'ENGINE': 'django.db.backends.sqlite3',
#         'NAME': os.path.join(BASE_DIR, 'home', 'db.sqlite3'),  # Using relative path
#     }
# }


DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': 'neondb',
        'USER': 'neondb_owner',
        'PASSWORD': os.getenv('DB_PASSWORD'),
        'HOST': os.getenv('DB_HOST'),
        'PORT': os.getenv('DB_PORT', '5432'),
        'OPTIONS': {
            'sslmode': 'require',
        },
        'CONN_MAX_AGE': 0,  # Close connections after each request
        'CONN_HEALTH_CHECKS': True,  # Enable connection health checks
    }
}

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'location.authentication.CookieJWTAuthentication',
        'rest_framework.authentication.SessionAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ]
}

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(hours=24),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
    'UPDATE_LAST_LOGIN': True,
    
    'AUTH_HEADER_TYPES': ('Bearer',),
    'AUTH_COOKIE': 'access_token',
    'AUTH_COOKIE_DOMAIN': BASE_DOMAIN,
    'AUTH_COOKIE_SECURE': True,
    'AUTH_COOKIE_HTTP_ONLY': True,
    'AUTH_COOKIE_PATH': '/',
    'AUTH_COOKIE_SAMESITE': 'None',
}

# Cookie settings
JWT_AUTH_COOKIE = 'access_token'
JWT_AUTH_REFRESH_COOKIE = 'refresh_token'
JWT_AUTH_SECURE = not DEBUG  # True in production, False in development
JWT_AUTH_HTTPONLY = True
JWT_AUTH_SAMESITE = 'None'

# CSRF settings
CSRF_TRUSTED_ORIGINS = json.loads(os.getenv(
    'CSRF_TRUSTED_ORIGINS',
    json.dumps([
        'http://localhost:3000',
        'http://localhost:8000',
        'http://127.0.0.1:3000',
        'http://127.0.0.1:8000',
        'http://host.docker.internal:3000',
        'http://host.docker.internal:8000',
        'https://locationcostfinder-dgd2efamfzezeea2.canadacentral-01.azurewebsites.net',
        'https://locationcostfinder-dgd2efamfzezeea2.scm.canadacentral-01.azurewebsites.net',
        'https://app.locationcostfinder.space'
    ])
))

# CSRF settings
CSRF_COOKIE_SECURE = not DEBUG  # True in production, False in development
SESSION_COOKIE_SECURE = not DEBUG  # True in production, False in development
CSRF_COOKIE_HTTPONLY = False  # Allow JavaScript to read the cookie
SESSION_COOKIE_HTTPONLY = False
CSRF_COOKIE_SAMESITE = 'Lax' if DEBUG else 'None'  # Lax in development, None in production
SESSION_COOKIE_SAMESITE = 'Lax' if DEBUG else 'None'  # Lax in development, None in production
CSRF_COOKIE_DOMAIN = BASE_DOMAIN
SESSION_COOKIE_DOMAIN = BASE_DOMAIN
CSRF_USE_SESSIONS = False  # Use cookies instead of sessions
CSRF_COOKIE_NAME = 'csrftoken'  # Explicitly set the cookie name

# CORS settings
CORS_ALLOW_CREDENTIALS = True
CORS_ALLOWED_ORIGINS = json.loads(os.getenv(
    'CORS_ALLOWED_ORIGINS',
    json.dumps([
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
        "http://host.docker.internal:3000",
        "http://host.docker.internal:8000",
        "https://locationcostfinder-dgd2efamfzezeea2.canadacentral-01.azurewebsites.net",
        "https://locationcostfinder-dgd2efamfzezeea2.scm.canadacentral-01.azurewebsites.net",
        "https://app.locationcostfinder.space"
    ])
))

# Add more CORS settings
CORS_ALLOW_HEADERS = [
    'accept',
    'accept-encoding',
    'authorization',
    'content-type',
    'dnt',
    'origin',
    'user-agent',
    'x-csrftoken',
    'x-requested-with',
]

CORS_EXPOSE_HEADERS = [
    'x-csrftoken',
]

CORS_ALLOW_METHODS = [
    'DELETE',
    'GET',
    'OPTIONS',
    'PATCH',
    'POST',
    'PUT',
]

# Never use CORS_ALLOW_ALL_ORIGINS in production
if DEBUG:
    CORS_ALLOW_ALL_ORIGINS = True
else:
    CORS_ALLOW_ALL_ORIGINS = False

APPEND_SLASH = False

# Password validation
# https://docs.djangoproject.com/en/5.1/ref/settings/#auth-password-validators

AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]

# Internationalization
# https://docs.djangoproject.com/en/5.1/topics/i18n/

LANGUAGE_CODE = 'en-us'

TIME_ZONE = 'UTC'

USE_I18N = True

USE_TZ = True

# Static files (CSS, JavaScript, Images)
STATIC_URL = '/static/'
STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')
STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'


LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
        },
    },
    'root': {
        'handlers': ['console'],
        'level': 'INFO',
    },
}


# Default primary key field type
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# File upload settings
FILE_UPLOAD_PERMISSIONS = 0o777  # Maximum permissions for uploaded files
FILE_UPLOAD_DIRECTORY_PERMISSIONS = 0o777  # Maximum permissions for upload directories

# Media files configuration
MEDIA_URL = '/media/'
# Enable WhiteNoise to serve static and media in container
MEDIA_ROOT = os.path.join(BASE_DIR, 'media')  # Changed from 'uploads' to 'media' and using pathlib

AUTHENTICATION_BACKENDS = [
    'django.contrib.auth.backends.ModelBackend',
]