#!/bin/bash

# Exit on error
set -e

echo "Starting Deployment Script"

# Force the port to be 8000 regardless of environment variables
export PORT=8000
export WEBSITES_PORT=8000
echo "Forcing port to 8000 for both PORT and WEBSITES_PORT"

# Set the correct Python path
export PYTHONPATH=/home/site/wwwroot/antenv/lib/python3.10/site-packages:$PYTHONPATH

# Install dependencies
pip install -r requirements.txt

# Print environment information
echo "Python version:"
python --version
echo "Current directory: $(pwd)"
echo "Python path: $PYTHONPATH"

# Create log directory
mkdir -p logs
echo "Created logs directory"

# Print startup configuration
echo "Starting configuration:"
echo "PORT: $PORT"
echo "WEBSITES_PORT: $WEBSITES_PORT"
echo "Installed packages:"
pip list

# Collect static files
python manage.py collectstatic --noinput

# Apply database migrations
python manage.py migrate --noinput

# Start Gunicorn in the background
nohup gunicorn server_location_map.wsgi:application \
    --bind 0.0.0.0:8000 \
    --workers 4 \
    --timeout 120 \
    --access-logfile logs/access.log \
    --error-logfile logs/error.log \
    --log-level info \
    --capture-output \
    --enable-stdio-inheritance \
    --daemon

# Keep the container running
tail -f logs/access.log logs/error.log 