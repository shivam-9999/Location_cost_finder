import { NextRequest, NextResponse } from 'next/server';
import { BACKEND_URL } from '@/constants';

interface ChatMessage {
  role: string;
  content: string;
}

interface ChatRequest {
  origin?: string;
  destination?: string;
  message?: string;
  conversation_history?: ChatMessage[];
  conversation_id?: string;
}

export async function POST(request: NextRequest) {
  try {
    // Parse the request body
    const data: ChatRequest = await request.json();
    const { origin = "Your location", destination = "Surat", message, conversation_history = [], conversation_id } = data;
    
    // Validate input
    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    try {
      // Forward the request to the backend API
      console.log(`Sending request to backend: ${BACKEND_URL}/api/travel-info/`);
      
      const backendResponse = await fetch(`${BACKEND_URL}/api/travel-info/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          origin,
          destination,
          message,
          conversation_history,
          conversation_id
        }),
      });

      // Handle rate limiting
      if (backendResponse.status === 429) {
        return NextResponse.json(
          { error: 'Rate limit exceeded. Please try again later.' },
          { status: 429 }
        );
      }

      if (!backendResponse.ok) {
        console.error(`Backend API error: ${backendResponse.status}`);
        throw new Error(`Backend API error: ${backendResponse.status}`);
      }

      const responseData = await backendResponse.json();
      return NextResponse.json(responseData);
    } catch (error) {
      console.error("Error connecting to backend API:", error);
      
      // Fallback mode - generate a default response when backend is unavailable
      const fallbackResponse = getFallbackResponse(message, origin, destination);
      
      return NextResponse.json({
        response: fallbackResponse,
        conversation_history,
        fallback: true
      });
    }
  } catch (error) {
    console.error("API route error:", error);
    return NextResponse.json(
      { error: 'Server error processing your request' },
      { status: 500 }
    );
  }
}

// Fallback response function for when backend connection fails
function getFallbackResponse(message: string, origin?: string, destination?: string): string {
  const lowerMessage = message.toLowerCase();
  
  if (lowerMessage.includes('hello') || lowerMessage.includes('hi')) {
    return `Hello! I'm happy to help with your trip from ${origin || "Your location"} to ${destination || "Surat"}. What would you like to know?`;
  }
  
  if (lowerMessage.includes('how') && lowerMessage.includes('get')) {
    return `To travel from ${origin || "Your location"} to ${destination || "Surat"}, you have several options including flights, trains, or buses depending on the distance. Would you like me to elaborate on any specific mode of transport?`;
  }
  
  if (lowerMessage.includes('restaurant') || lowerMessage.includes('food') || lowerMessage.includes('eat')) {
    return `${destination || "Surat"} offers a variety of dining options. The city is particularly known for its street food and sweet dishes. Some popular items include locho, surti sev khamani, and undhiyu.`;
  }
  
  if (lowerMessage.includes('hotel') || lowerMessage.includes('stay') || lowerMessage.includes('accommodation')) {
    return `There are many accommodation options in ${destination || "Surat"} across different price ranges. The areas of City Light, Adajan, and Vesu are popular for staying. Would you like recommendations for any specific budget?`;
  }
  
  // Default response for other queries
  return `I'm currently operating in fallback mode due to connectivity issues with our main system. I have limited information about travel from ${origin || "Your location"} to ${destination || "Surat"}. Please try again later for more detailed assistance.`;
}

// Fallback response generators

// Function to generate initial response
function generateInitialResponse(origin: string, destination: string): string {
  return `Welcome! I can help you plan your travel from ${origin} to ${destination}. Would you like information about flights, accommodations, or local attractions?`;
}

// Function to generate responses based on conversation context
function generateResponse(message: string, origin: string, destination: string, history: ChatMessage[]): string {
  // Convert message to lowercase for easier matching
  const lowerMessage = message.toLowerCase();
  
  // Check for flight-related queries
  if (lowerMessage.includes('flight') || lowerMessage.includes('fly') || lowerMessage.includes('plane') || lowerMessage.includes('airport')) {
    return `Flights from ${origin} to ${destination} typically take around 15-20 hours with one or two stops if you're traveling internationally. The main airlines serving routes to India include Air India, Emirates, and Qatar Airways. Would you like information about the best time to book?`;
  }
  
  // Check for transportation-related queries
  if (lowerMessage.includes('transport') || lowerMessage.includes('travel') || lowerMessage.includes('trip') || lowerMessage.includes('reach')) {
    return `To reach ${destination} from ${origin}, you'll likely need to fly to a major Indian city like Mumbai or Delhi, then take a domestic flight or train to reach Surat. The entire journey usually takes about 24-36 hours including layovers. Would you like more specific information about local transportation in ${destination}?`;
  }
  
  // Check for hotel or accommodation queries
  if (lowerMessage.includes('hotel') || lowerMessage.includes('stay') || lowerMessage.includes('accommodation') || lowerMessage.includes('lodging')) {
    return `${destination} offers a range of accommodations from budget hotels (₹1,000-2,000/night) to luxury options (₹5,000+/night). Popular areas to stay include City Light, Adajan, and Vesu. Would you like recommendations for specific hotels or do you have a budget in mind?`;
  }
  
  // Check for food or restaurant queries
  if (lowerMessage.includes('food') || lowerMessage.includes('eat') || lowerMessage.includes('restaurant') || lowerMessage.includes('cuisine')) {
    return `${destination} is famous for its delicious Gujarati cuisine! Don't miss trying locho, surti sev khamani, and ghari (a sweet dish). Popular food areas include Chowpaty, Dumas Road, and Ghod Dod Road. Any specific type of food you're interested in?`;
  }
  
  // Check for sightseeing or attractions
  if (lowerMessage.includes('see') || lowerMessage.includes('visit') || lowerMessage.includes('attraction') || lowerMessage.includes('place') || lowerMessage.includes('sightseeing')) {
    return `Top attractions in ${destination} include Dumas Beach, Dutch Garden, Science Center, ISKCON Temple, and Gopi Talav. The textile markets are also worth visiting if you're interested in shopping. How long will you be staying in ${destination}?`;
  }
  
  // Check for weather queries
  if (lowerMessage.includes('weather') || lowerMessage.includes('climate') || lowerMessage.includes('temperature') || lowerMessage.includes('season')) {
    return `The weather in ${destination} is hot and humid for most of the year. The best time to visit is between November and February when temperatures are more pleasant (around 20-30°C). Summers (March-June) can be extremely hot with temperatures above 40°C, and July-September brings monsoon rains. When are you planning to visit?`;
  }
  
  // Check for cost or budget queries
  if (lowerMessage.includes('cost') || lowerMessage.includes('price') || lowerMessage.includes('expensive') || lowerMessage.includes('budget') || lowerMessage.includes('cheap')) {
    return `${destination} is relatively affordable compared to major Indian cities. A typical daily budget might be around ₹2,000-3,000 ($25-40 USD) including accommodations, food, and local transportation. Luxury options will cost more, of course. Are you looking for budget-friendly recommendations?`;
  }
  
  // Check for language queries
  if (lowerMessage.includes('language') || lowerMessage.includes('speak') || lowerMessage.includes('communication')) {
    return `The primary languages spoken in ${destination} are Gujarati and Hindi. English is understood in tourist areas, hotels, and by educated locals. Learning a few basic Gujarati phrases might enhance your experience. Would you like to know some useful phrases?`;
  }
  
  // Check for thank you messages
  if (lowerMessage.includes('thank') || lowerMessage.includes('thanks')) {
    return `You're welcome! Feel free to ask if you need any more information about your trip from ${origin} to ${destination}. Safe travels!`;
  }
  
  // Check for goodbye messages
  if (lowerMessage.includes('bye') || lowerMessage.includes('goodbye')) {
    return `Goodbye! Have a wonderful trip to ${destination}. Feel free to return if you need more travel assistance.`;
  }
  
  // Default response for other queries
  return `I'm happy to help with your trip from ${origin} to ${destination}. You can ask about flights, accommodations, local attractions, food, weather, or any other travel concerns. What specific information would you like to know?`;
} 