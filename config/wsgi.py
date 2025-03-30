"""
WSGI config for location project.
"""

import os

from django.core.wsgi import get_wsgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'location.settings')

application = get_wsgi_application() 