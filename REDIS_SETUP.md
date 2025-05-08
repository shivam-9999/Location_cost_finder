# Redis Cache Setup for Production

This document provides instructions for setting up Redis Cache for your Django application in production.

## Option 1: Azure Cache for Redis

### Creating a Redis Cache in Azure

1. **Create Azure Cache for Redis**:
   - Go to the Azure Portal
   - Search for "Azure Cache for Redis" and select it
   - Click "+ Create"
   - Fill in the required information:
     - Resource group: Use your existing resource group (e.g., `locationcostfinder`)
     - DNS name: Choose a unique name (e.g., `locationcostfinder-redis`)
     - Location: Same region as your App Service (e.g., `East US`)
     - Cache type: Choose a size based on your needs (Basic C0 is fine for starting)
   - Click "Create"

2. **Get the connection string**:
   - Once deployed, go to your Redis Cache in the Azure Portal
   - Go to "Access keys" in the left panel
   - Copy the "Primary connection string"
   - It will look like: `rediss://:password@your-redis-instance.redis.cache.windows.net:6380/0`

3. **Add the connection string to your App Service**:
   - Go to your App Service in the Azure Portal
   - Navigate to "Configuration" > "Application settings"
   - Add a new application setting:
     - Name: `REDIS_URL`
     - Value: The Redis connection string you copied
   - Click "Save"
   - Restart your App Service

## Option 2: Using Redis Labs (Alternative)

[Redis Labs](https://redis.com/) provides a free tier of Redis Cloud which gives you:
- 30MB of storage
- Up to 30 connections
- No high availability

1. **Create Redis Labs account**:
   - Go to [https://redis.com/](https://redis.com/)
   - Sign up and create a free database

2. **Get the connection details**:
   - After creating your database, copy the connection details
   - Format them as a URL: `redis://username:password@host:port`

3. **Add to your App Service**:
   - Add `REDIS_URL` to your App Service configuration

## Option 3: Database Cache Fallback

If you don't want to use Redis, your app is already configured to fall back to database caching. 
The database cache will work automatically if no Redis URL is provided.

## Verifying the Cache

After setting up Redis and deploying your application, you can verify the cache is working by:

1. **Looking at logs**:
   - Check your application logs for the message "Successfully connected to Redis"

2. **Monitoring Redis usage**:
   - In Azure Portal, you can monitor Redis metrics like connections, memory usage, etc.

3. **Testing the API**:
   - Make the same API call twice and check if the second call returns faster
   - The headers should indicate a cache hit

## Troubleshooting

- If you can't connect to Redis, ensure your Redis firewall allows connections from your App Service
- For Azure Redis, you might need to enable non-SSL port (6379) in the Advanced settings
- Check that your app service has the correct connection string format:
  - Redis: `redis://username:password@host:port/0`
  - Redis SSL: `rediss://:password@host:port/0` 