from django.core.management.base import BaseCommand
from django.core.cache import cache
from django.db import connection
from django.conf import settings
import os

class Command(BaseCommand):
    help = 'Sets up the caching system based on your settings'

    def handle(self, *args, **kwargs):
        cache_backend = settings.CACHES['default']['BACKEND']
        
        # Check if using database cache
        if 'db.DatabaseCache' in cache_backend:
            self.stdout.write(self.style.NOTICE('Setting up database cache table...'))
            
            # Create the cache table
            with connection.cursor() as cursor:
                try:
                    cursor.execute("""
                        CREATE TABLE IF NOT EXISTS django_cache_table (
                            cache_key varchar(255) NOT NULL PRIMARY KEY,
                            value text NOT NULL,
                            expires_at timestamp with time zone NOT NULL
                        )
                    """)
                    self.stdout.write(self.style.SUCCESS('Successfully created cache table'))
                except Exception as e:
                    self.stdout.write(self.style.ERROR(f'Error creating cache table: {e}'))
                    # Fall back to createcachetable command
                    self.stdout.write(self.style.NOTICE('Falling back to Django createcachetable command...'))
                    from django.core.management import call_command
                    call_command('createcachetable')
        
        # If using Redis, verify connection
        elif 'redis.RedisCache' in cache_backend:
            self.stdout.write(self.style.NOTICE('Checking Redis connection...'))
            try:
                # Try a simple set/get operation to verify Redis is working
                cache.set('cache_test', 'test_value', 10)
                value = cache.get('cache_test')
                if value == 'test_value':
                    self.stdout.write(self.style.SUCCESS('Successfully connected to Redis'))
                else:
                    self.stdout.write(self.style.WARNING('Redis connection test failed - received invalid value'))
            except Exception as e:
                self.stdout.write(self.style.ERROR(f'Redis connection error: {e}'))
                self.stdout.write(self.style.WARNING('Please check your REDIS_URL environment variable'))
        
        # For local memory cache, just confirm it's working
        elif 'locmem.LocMemCache' in cache_backend:
            self.stdout.write(self.style.SUCCESS('Using local memory cache for development'))
            # Test local memory cache
            try:
                cache.set('cache_test', 'test_value', 10)
                value = cache.get('cache_test')
                if value == 'test_value':
                    self.stdout.write(self.style.SUCCESS('Local memory cache is working correctly'))
                else:
                    self.stdout.write(self.style.ERROR('Local memory cache test failed'))
            except Exception as e:
                self.stdout.write(self.style.ERROR(f'Local memory cache error: {e}'))
        
        # If using a different cache backend
        else:
            self.stdout.write(self.style.NOTICE(f'Using cache backend: {cache_backend}'))
            
        self.stdout.write(self.style.SUCCESS('Cache setup completed')) 