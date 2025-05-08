# Location Cost Finder

A Django-based web application that helps users analyze locations by processing images, extracting coordinates, and calculating distances between places.

## Features

- Image upload and processing
- Location coordinate extraction
- Distance calculation between locations
- Cloud storage integration (Azure Blob Storage)
- RESTful API endpoints
- JWT-based authentication
- Docker containerization support

## Tech Stack

- **Backend**: Django 4.2.11
- **Database**: PostgreSQL (via psycopg2)
- **Authentication**: JWT (djangorestframework-simplejwt)
- **Image Processing**: Google Cloud Vision API
- **Cloud Storage**: Azure Blob Storage
- **Containerization**: Docker
- **API Documentation**: Django REST Framework

## Prerequisites

- Python 3.x
- Docker and Docker Compose
- Google Cloud Vision API credentials
- Azure Blob Storage account
- PostgreSQL database

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd Location_cost_finder
```

2. Create and activate a virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Set up environment variables:
Create a `.env` file in the root directory with the following variables:
```
DATABASE_URL=your_database_url
GOOGLE_APPLICATION_CREDENTIALS=path_to_google_credentials.json
AZURE_STORAGE_CONNECTION_STRING=your_azure_connection_string
SECRET_KEY=your_django_secret_key
```

5. Run database migrations:
```bash
python manage.py migrate
```

## Running the Application

### Development Mode
```bash
python manage.py runserver
```

### Using Docker
```bash
docker-compose up --build
```

## API Endpoints

- `/api/upload/` - Upload location images
- `/api/coordinates/` - Get coordinates from images
- `/api/distance/` - Calculate distances between locations
- `/api/token/` - JWT token endpoints

## Project Structure

```
Location_cost_finder/
├── config/              # Django project configuration
├── home/                # Main application
├── location/            # Location-related functionality
├── server_location_map/ # Server location mapping
├── static/             # Static files
├── media/              # User-uploaded media
├── requirements.txt    # Python dependencies
├── Dockerfile         # Docker configuration
└── docker-compose.yml # Docker Compose configuration
```

## Contributing

Please follow these commit message conventions:
- `feat:` - New feature
- `fix:` - Bug fix
- `chore:` - Infrastructure changes
- `refactor:` - Code refactoring
- `doc:` - Documentation updates

## License

[Add your license information here]

## Support

For support, please [add your contact information or issue tracker link]
