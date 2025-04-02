# Use an official Python runtime
FROM python:3.11-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PYTHONPATH=/app
ENV PORT=8000
ENV WEBSITES_PORT=8000
ENV DJANGO_SETTINGS_MODULE=server_location_map.settings
ENV WEBSITES_ENABLE_APP_SERVICE_STORAGE=false

# Set the working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    postgresql-client \
    postgresql-server-dev-all \
    python3-dev \
    gcc \
    curl \
    && rm -rf /var/lib/apt/lists/*

    
# Copy and install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the Django project
COPY . .

# Create directories for persistent storage
RUN mkdir -p /home/LogFiles
RUN mkdir -p /home/Data/LogFiles
RUN mkdir -p /home/Data/uploads
RUN mkdir -p /home/Data/db
RUN mkdir -p /home  # Create /home directory for database

# Set permissions
RUN chmod -R 777 /home/Data
RUN chmod -R 777 /home/LogFiles
RUN chmod -R 777 /home  # Give full permissions to /home directory

# Collect static files
RUN python manage.py collectstatic --noinput


# Expose the port the app runs on
EXPOSE 8000

# Add healthcheck
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/ || exit 1

# Start gunicorn with proper configuration
CMD ["sh", "-c", "python manage.py migrate && gunicorn server_location_map.wsgi:application --bind 0.0.0.0:8000 --workers 2 --timeout 120 --access-logfile - --error-logfile - --log-level debug"]