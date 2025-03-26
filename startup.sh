#!/bin/bash

# Make script exit on error
set -e

echo "Starting Deployment Script"

# Create and activate virtual environment
echo "Creating virtual environment..."
python -m venv antenv
source antenv/bin/activate

# Upgrade pip and install requirements
echo "Installing dependencies..."
python -m pip install --upgrade pip
pip install -r requirements.txt

# Collect static files
echo "Collecting static files..."
python manage.py collectstatic --noinput

# Apply database migrations
echo "Applying database migrations..."
python manage.py migrate --noinput

# Start Gunicorn with proper settings
echo "Starting Gunicorn..."
gunicorn server_location_map.wsgi:application \
    --bind=0.0.0.0:8000 \
    --workers=4 \
    --threads=2 \
    --timeout=120 \
    --access-logfile=- \
    --error-logfile=- \
    --capture-output \
    --enable-stdio-inheritance 