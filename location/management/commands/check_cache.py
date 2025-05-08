from django.core.management.base import BaseCommand
from django.core.cache import cache
from django.conf import settings
import time
import json
import hashlib

class Command(BaseCommand):
    help = 'Check cache status and statistics'

    def add_arguments(self, parser):
        parser.add_argument(
            '--test',
            action='store_true',
            help='Run cache speed test'
        )
        parser.add_argument(
            '--clear',
            action='store_true',
            help='Clear the cache'
        )
        parser.add_argument(
            '--key',
            type=str,
            help='Check if a specific key exists in cache'
        )

    def handle(self, *args, **options):
        # Get cache backend type
        cache_backend = settings.CACHES['default']['BACKEND']
        self.stdout.write(f"Cache backend: {cache_backend}")
        
        # Check if cache is working
        try:
            test_key = f"cache_test_{int(time.time())}"
            cache.set(test_key, "test_value", 30)
            value = cache.get(test_key)
            
            if value == "test_value":
                self.stdout.write(self.style.SUCCESS("✓ Cache is working"))
            else:
                self.stdout.write(self.style.ERROR("✗ Cache test failed - could not retrieve value"))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"✗ Cache error: {str(e)}"))
            return
        
        # Run a speed test if requested
        if options['test']:
            self.stdout.write("\nRunning cache speed test...")
            
            # Test data
            test_data = {
                "origin": "New York",
                "destination": "San Francisco",
                "conversation_history": [
                    {"role": "system", "content": "You are a travel assistant."},
                    {"role": "user", "content": "I want to go to San Francisco"},
                    {"role": "assistant", "content": "Great! How would you like to travel?"},
                    {"role": "user", "content": "By plane"}
                ]
            }
            
            # Create a cache key
            data_str = json.dumps(test_data)
            cache_key = f"speed_test:{hashlib.md5(data_str.encode()).hexdigest()}"
            
            # Time to set a value
            start_time = time.time()
            cache.set(cache_key, test_data, 60)
            set_time = time.time() - start_time
            
            # Time to get a value
            start_time = time.time()
            cache.get(cache_key)
            get_time = time.time() - start_time
            
            self.stdout.write(f"  Cache set time: {set_time*1000:.2f}ms")
            self.stdout.write(f"  Cache get time: {get_time*1000:.2f}ms")
            
            # Get a non-existent key (miss)
            start_time = time.time()
            cache.get(f"nonexistent_{int(time.time())}")
            miss_time = time.time() - start_time
            
            self.stdout.write(f"  Cache miss time: {miss_time*1000:.2f}ms")
        
        # Check specific key
        if options['key']:
            key = options['key']
            value = cache.get(key)
            if value is not None:
                self.stdout.write(self.style.SUCCESS(f"✓ Key exists: {key}"))
                self.stdout.write("Value:")
                self.stdout.write(str(value)[:1000] + "..." if len(str(value)) > 1000 else str(value))
            else:
                self.stdout.write(self.style.WARNING(f"✗ Key not found: {key}"))
        
        # Clear cache if requested
        if options['clear']:
            cache.clear()
            self.stdout.write(self.style.SUCCESS("Cache cleared")) 