#!/bin/bash

# Make script exit on error
set -e

echo "Starting Deployment Script"

# Force the port to be 8000 regardless of environment variables
export PORT=8000
export WEBSITES_PORT=8000
echo "Forcing port to 8000 for both PORT and WEBSITES_PORT"

# Activate virtual environment if it exists
if [ -d "antenv" ]; then
    echo "Activating antenv virtual environment..."
    source antenv/bin/activate
elif [ -d "venv" ]; then
    echo "Activating venv virtual environment..."
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
echo "Created logs directory"

# Print startup configuration
echo "Starting configuration:"
echo "PORT: $PORT"
echo "WEBSITES_PORT: $WEBSITES_PORT"
echo "Current directory: $(pwd)"

# Start Gunicorn with proper settings
echo "Starting Gunicorn on port 8000..."
exec gunicorn server_location_map.wsgi:application \
    --bind=0.0.0.0:8000 \
    --workers=4 \
    --threads=2 \
    --timeout=120 \
    --access-logfile=logs/access.log \
    --error-logfile=logs/error.log \
    --capture-output \
    --enable-stdio-inheritance \
    --log-level=debug 