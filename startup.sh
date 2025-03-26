#!/bin/bash

# Make script exit on error
set -e

echo "Starting Deployment Script"

# Use the PORT environment variable provided by Azure, default to 8000
PORT="${PORT:-8000}"
echo "Using port: $PORT"

# Activate virtual environment if it exists
if [ -d "antenv" ]; then
    source antenv/bin/activate
elif [ -d "venv" ]; then
    source venv/bin/activate
fi

# Install dependencies
echo "Installing dependencies..."
pip install -r requirements.txt

# Collect static files
echo "Collecting static files..."
python manage.py collectstatic --noinput

# Apply database migrations
echo "Applying database migrations..."
python manage.py migrate --noinput

# Create log directory
mkdir -p logs

# Start Gunicorn with proper settings
echo "Starting Gunicorn..."
exec gunicorn server_location_map.wsgi:application \
    --bind=0.0.0.0:$PORT \
    --workers=4 \
    --threads=2 \
    --timeout=120 \
    --access-logfile=logs/access.log \
    --error-logfile=logs/error.log \
    --capture-output \
    --enable-stdio-inheritance \
    --log-level=debug 