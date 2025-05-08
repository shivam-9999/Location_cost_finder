#!/bin/sh
set -e

echo "🔧 Running migrations and collectstatic..."
python manage.py migrate --noinput
python manage.py collectstatic --noinput

echo "🔧 Setting up cache..."
python manage.py setup_cache

echo "🚀 Starting gunicorn..."
exec gunicorn server_location_map.wsgi:application \
    --bind 0.0.0.0:8000 \
    --workers 2 \
    --timeout 120 \
    --access-logfile - \
    --error-logfile - \
    --log-level debug
