// Backend configuration
// export const BACKEND_URL = 'http://localhost:8000'; 
// export const BACKEND_URL='https://locationcostfinder-dgd2efamfzezeea2.canadacentral-01.azurewebsites.net';

export const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.locationcostfinder.space';
// export const BACKEND_URL=process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:8000'