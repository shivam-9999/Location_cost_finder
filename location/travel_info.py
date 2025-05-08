import os
import openai
import json
import hashlib
import time
from datetime import datetime, timedelta
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny
from django.conf import settings
from django.core.cache import cache

# Ensure you have your OpenAI API key in your environment or settings
OPENAI_API_KEY = os.getenv('OPENAI_API_KEY', getattr(settings, 'OPENAI_API_KEY', None))

# Cache time-to-live in seconds (24 hours)
CACHE_TTL = 86400
# Conversation cache TTL (72 hours - longer than regular cache)
CONVERSATION_TTL = 259200  # 3 days

# Rate limiting: max calls per user per minute
RATE_LIMIT = 5  # Increased from 5 for testing
RATE_WINDOW = 60  # seconds

STEP_BY_STEP_SYSTEM_PROMPT = (
    "You are a travel assistant. Help the user plan a trip step by step. "
    "Ask one clarifying question at a time, and wait for the user's answer before giving more information. "
    "For example, if the user says 'I want to go from Surat to Mumbai', ask 'Which mode of transport do you prefer: bus, train, car, or flight?' "
    "After the user answers, provide focused information only about that specific mode (time, cost, frequency), then ask if they want more details "
    "or want to know about something else like accommodation, attractions, or another transportation mode. "
    "Keep your responses short, direct and focused on answering just what was asked. "
    "When explaining travel options, give specific information like actual travel times, typical costs, and frequency of service. "
    "If you're asked a direct factual question, give a concise answer without additional information unless requested. "
)

# Common questions with predefined responses to avoid API calls
COMMON_RESPONSES = {
    "hello": "Hello! I'm your travel assistant. Where would you like to go?",
    "hi": "Hi there! I'm your travel assistant. Where would you like to go?",
    "help": "I can help you plan a trip by providing information about transportation options, costs, accommodations, and attractions. Just tell me where you'd like to go!",
    "thank you": "You're welcome! Do you need any more travel information?",
    "thanks": "You're welcome! Is there anything else you'd like to know?",
}

class TravelInfoView(APIView):
    permission_classes = [AllowAny]

    def generate_cache_key(self, data):
        """Generate a unique cache key based on the conversation."""
        # For conversations, we only include the last 4 messages to keep context manageable
        if 'conversation_history' in data and len(data['conversation_history']) > 0:
            # Take only the last 4 messages for the cache key
            last_messages = data['conversation_history'][-4:]
            # Create a string representation to hash
            conv_str = json.dumps([
                {k: msg[k] for k in ['role', 'content']} 
                for msg in last_messages
            ])
            # Add current message to the hash
            msg_str = data.get('message', '')
            key_str = f"{data.get('origin', '')}-{data.get('destination', '')}-{msg_str}-{conv_str}"
            # Create hash for cache key
            return f"travel_chat:{hashlib.md5(key_str.encode()).hexdigest()}"
        else:
            # First message
            return f"travel_chat:{data.get('origin', '')}-{data.get('destination', '')}-init"

    def check_rate_limit(self, request):
        """Check if the user has exceeded the rate limit."""
        # Use IP address as user identifier (or user ID if authenticated)
        user_id = request.META.get('REMOTE_ADDR', 'unknown')
        if request.user.is_authenticated:
            user_id = f"user_{request.user.id}"
            
        # Get the rate limit key
        rate_key = f"rate_limit:{user_id}"
        
        # Get current timestamps for this user
        call_timestamps = cache.get(rate_key, [])
        
        # Remove timestamps older than the window
        now = time.time()
        call_timestamps = [ts for ts in call_timestamps if now - ts < RATE_WINDOW]
        
        # Check if user has exceeded rate limit
        if len(call_timestamps) >= RATE_LIMIT:
            return True
        
        # Add current timestamp and update cache
        call_timestamps.append(now)
        cache.set(rate_key, call_timestamps, RATE_WINDOW)
        
        return False

    def is_common_question(self, message):
        """Check if this is a common question with a predefined answer."""
        message = message.lower().strip()
        for key in COMMON_RESPONSES:
            if message == key or message.startswith(key + " ") or message.endswith(" " + key):
                return COMMON_RESPONSES[key]
        return None

    def truncate_history(self, conversation_history):
        """Keep only the most relevant parts of conversation history."""
        # Always keep the system message (first message)
        if len(conversation_history) <= 5:  # If 5 or fewer messages, keep all
            return conversation_history
        
        # Otherwise keep system message + most recent messages
        system_message = conversation_history[0]
        recent_messages = conversation_history[-4:]  # Last 4 messages
        
        return [system_message] + recent_messages

    def post(self, request):
        origin = request.data.get('origin')
        destination = request.data.get('destination')
        message = request.data.get('message', '')
        conversation_history = request.data.get('conversation_history', [])
        conversation_id = request.data.get('conversation_id')
        
        if not destination:
            return Response({'error': 'Destination is required.'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Conversation restoration: If ID provided, try to restore conversation
        if conversation_id:
            conversation_key = f"conversation_{conversation_id}"
            cached_conversation = cache.get(conversation_key)
            
            # If we have a cached conversation and no history was sent,
            # or the sent history is shorter (older), use the cached one
            if cached_conversation and (not conversation_history or 
                                        len(cached_conversation) > len(conversation_history)):
                conversation_history = cached_conversation
                # Log in development mode
                if settings.DEBUG:
                    print(f"Restored conversation {conversation_id} from cache")
        
        # 1. Check for rate limiting
        if self.check_rate_limit(request):
            return Response({
                'error': f'Rate limit exceeded. Please try again in {RATE_WINDOW} seconds.',
                'response': f"I'm currently handling many requests. Please try again in a moment.",
                'conversation_history': conversation_history,
                'conversation_id': conversation_id
            }, status=status.HTTP_429_TOO_MANY_REQUESTS)
        
        # 2. Check if this is a first message
        if not conversation_history:
            system_message = {
                "role": "system", 
                "content": STEP_BY_STEP_SYSTEM_PROMPT
            }
            conversation_history = [system_message]
            
            if not message:
                message = f"I want to go from {origin if origin else 'here'} to {destination}."
        
        # 3. Check for common questions (to avoid API calls)
        common_response = self.is_common_question(message)
        if common_response:
            # Add user message to conversation history
            conversation_history.append({"role": "user", "content": message})
            # Add predefined response to history
            conversation_history.append({"role": "assistant", "content": common_response})
            
            # Save conversation if ID provided
            if conversation_id:
                conversation_key = f"conversation_{conversation_id}"
                cache.set(conversation_key, conversation_history, CONVERSATION_TTL)
                
                # Add to registry for LocMemCache support
                if settings.DEBUG:
                    registry = cache.get('conversation_registry', [])
                    if conversation_id not in registry:
                        registry.append(conversation_id)
                        cache.set('conversation_registry', registry, CONVERSATION_TTL)
            
            return Response({
                'origin': origin,
                'destination': destination,
                'message': message,
                'response': common_response,
                'conversation_history': conversation_history,
                'conversation_id': conversation_id
            })
        
        # 4. Check cache for similar conversations
        cache_key = self.generate_cache_key(request.data)
        cached_response = cache.get(cache_key)
        if cached_response:
            # Add cache hit info in development
            if settings.DEBUG:
                cached_response['cache_info'] = {
                    'cache_key': cache_key,
                    'cached': True,
                    'timestamp': time.time()
                }
            
            # Always include the conversation_id in the response
            cached_response['conversation_id'] = conversation_id
            
            # If we have a conversation ID, ensure the conversation history is saved
            if conversation_id and 'conversation_history' in cached_response:
                conversation_key = f"conversation_{conversation_id}"
                cache.set(conversation_key, cached_response['conversation_history'], CONVERSATION_TTL)
                
            return Response(cached_response)
        
        # 5. Truncate history to reduce token usage
        truncated_history = self.truncate_history(conversation_history)
        
        # Add the user's new message to the conversation
        truncated_history.append({"role": "user", "content": message})
        
        try:
            client = openai.OpenAI(api_key=OPENAI_API_KEY)
            response = client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=truncated_history
            )
            assistant_response = response.choices[0].message.content
            
            # Add the assistant's response to the conversation history
            conversation_history.append({"role": "user", "content": message})
            conversation_history.append({"role": "assistant", "content": assistant_response})
            
            # Prepare response data
            response_data = {
                'origin': origin,
                'destination': destination,
                'message': message,
                'response': assistant_response,
                'conversation_history': conversation_history,
                'conversation_id': conversation_id
            }
            
            # Save conversation by ID (persists longer than the response cache)
            if conversation_id:
                conversation_key = f"conversation_{conversation_id}"
                cache.set(conversation_key, conversation_history, CONVERSATION_TTL)
                
                # Add to registry for LocMemCache support
                if settings.DEBUG:
                    registry = cache.get('conversation_registry', [])
                    if conversation_id not in registry:
                        registry.append(conversation_id)
                        cache.set('conversation_registry', registry, CONVERSATION_TTL)
            
            # Cache this response
            cache.set(cache_key, response_data, CACHE_TTL)
            
            # Add cache metadata in development
            if settings.DEBUG:
                response_data['cache_info'] = {
                    'cache_key': cache_key,
                    'cache_ttl': CACHE_TTL,
                    'cached': False,
                    'conversation_persisted': bool(conversation_id)
                }
            
            return Response(response_data)
        except Exception as e:
            return Response({
                'error': str(e), 
                'conversation_id': conversation_id
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class TravelChatView(APIView):
    """A simpler chat interface focused just on the conversation."""
    permission_classes = [AllowAny]
    
    def generate_cache_key(self, messages):
        """Generate a unique cache key based on the messages."""
        if messages:
            # Only use the last 3 messages for caching
            last_messages = messages[-3:]
            msg_str = json.dumps([{k: msg[k] for k in ['role', 'content']} for msg in last_messages])
            return f"travel_simple_chat:{hashlib.md5(msg_str.encode()).hexdigest()}"
        return None
    
    def post(self, request):
        messages = request.data.get('messages', [])
        if not messages:
            return Response({'error': 'At least one message is required.'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Check cache
        cache_key = self.generate_cache_key(messages)
        cached_response = cache.get(cache_key)
        if cached_response:
            # Add cache hit info in development
            if settings.DEBUG:
                cached_response['cache_info'] = {
                    'cache_key': cache_key,
                    'cached': True,
                    'timestamp': time.time()
                }
            return Response(cached_response)
            
        # Only keep last 6 messages to save tokens
        if len(messages) > 6:
            # Keep system message (if exists) + recent messages
            if messages[0]['role'] == 'system':
                messages = [messages[0]] + messages[-5:]
            else:
                messages = messages[-6:]
        
        try:
            client = openai.OpenAI(api_key=OPENAI_API_KEY)
            response = client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=messages
            )
            assistant_response = response.choices[0].message.content
            
            response_data = {
                'response': assistant_response,
                'messages': messages + [{"role": "assistant", "content": assistant_response}]
            }
            
            # Cache the response
            if cache_key:
                cache.set(cache_key, response_data, CACHE_TTL)
                
            return Response(response_data)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR) 