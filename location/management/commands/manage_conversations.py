from django.core.management.base import BaseCommand, CommandError
from django.core.cache import cache
import re
import json
from datetime import datetime, timedelta
from django.conf import settings

class Command(BaseCommand):
    help = 'List and manage conversation storage in cache'

    def add_arguments(self, parser):
        parser.add_argument(
            '--list',
            action='store_true',
            help='List all stored conversations'
        )
        parser.add_argument(
            '--show',
            type=str,
            help='Show a specific conversation by ID'
        )
        parser.add_argument(
            '--delete',
            type=str,
            help='Delete a specific conversation by ID'
        )
        parser.add_argument(
            '--clear',
            action='store_true',
            help='Clear all conversations from cache'
        )
        parser.add_argument(
            '--create-test',
            action='store_true',
            help='Create a test conversation in the cache'
        )
        
    def get_conversation_keys(self):
        """Get all conversation keys from cache."""
        all_keys = []
        
        # Try to get keys from Redis
        if hasattr(cache, '_cache') and hasattr(cache._cache, 'get_client'):
            # Using redis backend
            try:
                client = cache._cache.get_client()
                redis_keys = client.keys('*conversation_*')
                all_keys = [key.decode('utf-8') for key in redis_keys]
            except Exception as e:
                self.stdout.write(self.style.WARNING(f"Error accessing Redis: {e}"))
        
        # For LocMemCache in development, we need a different approach
        # Since LocMemCache doesn't provide a way to list keys, we can:
        # 1. Try a list of common IDs
        # 2. Create a special key to track conversations
        if settings.DEBUG and len(all_keys) == 0:
            self.stdout.write(self.style.WARNING(
                "Redis listing not available. Using LocMemCache fallback methods.\n"
            ))
            
            # 1. Check for the conversation registry
            registry = cache.get('conversation_registry', [])
            if registry:
                for conv_id in registry:
                    all_keys.append(f"conversation_{conv_id}")
                    
            # 2. Try some test keys for good measure
            test_ids = [
                '1', '2', '3', 
                'test', 'test1', 'test2',
                str(int(datetime.now().timestamp()))
            ]
            for test_id in test_ids:
                key = f"conversation_{test_id}"
                if cache.get(key):
                    all_keys.append(key)
        
        return [k for k in all_keys if k.startswith('conversation_')]

    def handle(self, *args, **options):
        # Create a test conversation if requested
        if options['create_test']:
            test_id = f"test_{int(datetime.now().timestamp())}"
            test_conversation = [
                {"role": "system", "content": "You are a travel assistant..."},
                {"role": "user", "content": "I want to go to Paris"},
                {"role": "assistant", "content": "Great! How would you like to travel to Paris?"},
                {"role": "user", "content": "By plane"}
            ]
            key = f"conversation_{test_id}"
            cache.set(key, test_conversation, 86400)
            
            # Update the registry
            registry = cache.get('conversation_registry', [])
            registry.append(test_id)
            cache.set('conversation_registry', registry, 86400)
            
            self.stdout.write(self.style.SUCCESS(f"Created test conversation with ID: {test_id}"))
            return
            
        # Get conversation keys
        conversation_keys = self.get_conversation_keys()
        
        # List all conversations
        if options['list']:
            if not conversation_keys:
                self.stdout.write(self.style.WARNING("No conversations found in cache"))
                return
                
            self.stdout.write(self.style.SUCCESS(f"Found {len(conversation_keys)} conversations:"))
            
            for key in conversation_keys:
                # Extract conversation ID
                match = re.search(r'conversation_([^_]+(?:_[^_]+)*)', key)
                if match:
                    conv_id = match.group(1)
                    # Get the conversation data
                    conv_data = cache.get(key)
                    
                    if conv_data:
                        # Get info about conversation
                        message_count = len([m for m in conv_data if m['role'] != 'system'])
                        last_message = next((m['content'] for m in reversed(conv_data) 
                                             if m['role'] == 'user'), "No messages")
                        
                        # Show summary
                        self.stdout.write(f"ID: {conv_id}")
                        self.stdout.write(f"  Messages: {message_count}")
                        self.stdout.write(f"  Last user message: {last_message[:50]}...")
                        self.stdout.write("")
        
        # Show a specific conversation
        if options['show']:
            conv_id = options['show']
            key = f"conversation_{conv_id}"
            conv_data = cache.get(key)
            
            if not conv_data:
                self.stdout.write(self.style.ERROR(f"Conversation {conv_id} not found"))
                return
                
            self.stdout.write(self.style.SUCCESS(f"Conversation {conv_id}:"))
            
            # Print each message
            for i, msg in enumerate(conv_data):
                if msg['role'] == 'system':
                    self.stdout.write(self.style.WARNING("[System] " + msg['content'][:100] + "..."))
                elif msg['role'] == 'user':
                    self.stdout.write(self.style.SUCCESS(f"[User] {msg['content']}"))
                else:
                    self.stdout.write(self.style.WARNING(f"[Assistant] {msg['content']}"))
                
                if i < len(conv_data) - 1:
                    self.stdout.write("")  # Empty line between messages
        
        # Delete a conversation
        if options['delete']:
            conv_id = options['delete']
            key = f"conversation_{conv_id}"
            if cache.get(key):
                cache.delete(key)
                
                # Update registry if it exists
                registry = cache.get('conversation_registry', [])
                if conv_id in registry:
                    registry.remove(conv_id)
                    cache.set('conversation_registry', registry, 86400)
                    
                self.stdout.write(self.style.SUCCESS(f"Deleted conversation {conv_id}"))
            else:
                self.stdout.write(self.style.ERROR(f"Conversation {conv_id} not found"))
        
        # Clear all conversations
        if options['clear']:
            cleared = 0
            for key in conversation_keys:
                cache.delete(key)
                cleared += 1
            
            # Clear registry too
            cache.delete('conversation_registry')
            
            self.stdout.write(self.style.SUCCESS(f"Cleared {cleared} conversations from cache")) 