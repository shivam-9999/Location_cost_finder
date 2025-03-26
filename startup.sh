#!/bin/bash

# Make script exit on error
set -e

echo "Starting Deployment Script"

# Force the port to be 8000 regardless of environment variables
export PORT=8000
export WEBSITES_PORT=8000
echo "Forcing port to 8000 for both PORT and WEBSITES_PORT"

# Set the correct Python path
export PYTHONPATH=/tmp/8dd6c24546b0aef/antenv/lib/python3.10/site-packages:$PYTHONPATH

# Activate virtual environment if it exists
if [ -d "/tmp/8dd6c24546b0aef/antenv" ]; then
    echo "Activating antenv virtual environment..."
    . /tmp/8dd6c24546b0aef/antenv/bin/activate
elif [ -d "antenv" ]; then
    echo "Activating local antenv virtual environment..."
    . antenv/bin/activate
elif [ -d "venv" ]; then
    echo "Activating venv virtual environment..."
    . venv/bin/activate
fi

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

# Start Gunicorn with proper settings
echo "Starting Gunicorn on port 8000..."
exec gunicorn server_location_map.wsgi:application \
    --bind=0.0.0.0:8000 \
    --workers=2 \
    --threads=4 \
    --timeout=120 \
    --access-logfile=logs/access.log \
    --error-logfile=logs/error.log \
    --capture-output \
    --enable-stdio-inheritance \
    --log-level=debug 