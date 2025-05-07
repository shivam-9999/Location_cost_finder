import React, { useState, useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Button } from "./button";
import { Input } from "./input";
import { Card, CardContent, CardHeader, CardTitle } from "./card";

interface Message {
  role: 'user' | 'bot';
  content: string;
}

interface ChatProps {
  title?: string;
  placeholder?: string;
  onClose?: () => void;
  origin?: string;
  destination?: string;
  isOpen: boolean;
}

// Main component that can be used anywhere in the app
const Chat: React.FC<ChatProps> = ({ 
  title = "Chat Assistant", 
  placeholder = "Type your message here...", 
  onClose,
  origin = "Your location",  // Default origin
  destination = "Surat", // Default destination
  isOpen
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationHistory, setConversationHistory] = useState<any[]>([]);
  const [conversationId, setConversationId] = useState<string>('');
  const [isResumingConversation, setIsResumingConversation] = useState(false);
  const [rateLimitExceeded, setRateLimitExceeded] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Update the useGenericKey check throughout the component
  const isGenericMode = (origin: string, destination: string): boolean => {
    return !destination || destination === "" || origin === "Your location";
  };

  // Generate or retrieve conversation ID and previous messages
  useEffect(() => {
    if (isOpen) {
      // Use generic storage key if no specific locations
      const useGenericKey = isGenericMode(origin, destination);
      const storageKey = useGenericKey 
        ? 'travel_conversation_generic' 
        : `travel_conversation_${origin}_${destination}`.replace(/\s+/g, '_');
      const savedConversationId = localStorage.getItem(storageKey);
      const savedMessages = localStorage.getItem(`${storageKey}_messages`);
      
      if (savedConversationId) {
        // Only set these if they've changed to avoid re-renders
        if (conversationId !== savedConversationId) {
          setConversationId(savedConversationId);
          setIsResumingConversation(true);
        }
        
        // Restore previous messages if available
        if (savedMessages && messages.length === 0) {
          try {
            const parsedMessages = JSON.parse(savedMessages);
            if (Array.isArray(parsedMessages) && parsedMessages.length > 0) {
              setMessages(parsedMessages);
              return; // Skip adding welcome message if we restored messages
            }
          } catch (error) {
            console.error('Error parsing saved messages:', error);
          }
        }
      } else {
        // If no previous conversation, create a new one
        if (!conversationId) {
          createNewConversation(useGenericKey);
        }
        return; // Let createNewConversation add the welcome message
      }
      
      // Only add welcome message if no messages exist yet and no conversation is in progress
      if (messages.length === 0 && !messages.some(m => m.role === 'bot')) {
        setMessages([{ 
          role: 'bot', 
          content: getWelcomeMessage(isResumingConversation, origin, destination, useGenericKey)
        }]);
      }
    }
  }, [isOpen, origin, destination, conversationId, messages]);

  // Save messages to localStorage when they change
  useEffect(() => {
    if (messages.length > 0 && conversationId) {
      const useGenericKey = isGenericMode(origin, destination);
      const storageKey = useGenericKey 
        ? 'travel_conversation_generic' 
        : `travel_conversation_${origin}_${destination}`.replace(/\s+/g, '_');
      localStorage.setItem(`${storageKey}_messages`, JSON.stringify(messages));
    }
  }, [messages, origin, destination, conversationId]);

  // Same for conversation history
  useEffect(() => {
    if (conversationHistory.length > 0 && conversationId) {
      const useGenericKey = isGenericMode(origin, destination);
      const storageKey = useGenericKey 
        ? 'travel_conversation_generic' 
        : `travel_conversation_${origin}_${destination}`.replace(/\s+/g, '_');
      localStorage.setItem(`${storageKey}_history`, JSON.stringify(conversationHistory));
    }
  }, [conversationHistory, origin, destination, conversationId]);

  // Restore conversation history when opening chat
  useEffect(() => {
    if (isOpen && conversationId) {
      const useGenericKey = isGenericMode(origin, destination);
      const storageKey = useGenericKey 
        ? 'travel_conversation_generic' 
        : `travel_conversation_${origin}_${destination}`.replace(/\s+/g, '_');
      const savedHistory = localStorage.getItem(`${storageKey}_history`);
      
      if (savedHistory && conversationHistory.length === 0) {
        try {
          const parsedHistory = JSON.parse(savedHistory);
          if (Array.isArray(parsedHistory)) {
            setConversationHistory(parsedHistory);
          }
        } catch (error) {
          console.error('Error parsing saved history:', error);
        }
      }
    }
  }, [isOpen, conversationId, origin, destination]);

  // Scroll to bottom on new messages
  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  };
  
  useEffect(() => { scrollToBottom(); }, [messages, isLoading]);
  useEffect(() => { setTimeout(scrollToBottom, 100); }, []);

  // Reset chat state
  const resetChat = () => {
    setMessages([]);
    setInput('');
    setIsLoading(false);
    setConversationHistory([]);
    setRateLimitExceeded(false);
  };

  // Helper function to generate appropriate welcome message
  const getWelcomeMessage = (isResuming: boolean, origin?: string, destination?: string, useGeneric = false) => {
    if (useGeneric || !destination || origin === "Your location") {
      return isResuming 
        ? "Welcome back! Let's continue our travel planning conversation."
        : "Welcome! I'm your Travel Assistant. How can I help you plan your trip today?";
    }
    
    return isResuming 
      ? `Welcome back! Continuing our conversation about travel from ${origin} to ${destination}.`
      : `Welcome! I can help you plan your travel from ${origin} to ${destination}. How can I assist you today?`;
  };

  // Create a new conversation
  const createNewConversation = (useGenericKey = false) => {
    resetChat();
    const newId = uuidv4();
    setConversationId(newId);
    setIsResumingConversation(false);
    
    const storageKey = useGenericKey 
      ? 'travel_conversation_generic'
      : `travel_conversation_${origin}_${destination}`.replace(/\s+/g, '_');
    
    // Remove previous messages and history
    localStorage.removeItem(`${storageKey}_messages`);
    localStorage.removeItem(`${storageKey}_history`);
    // Set new conversation ID
    localStorage.setItem(storageKey, newId);
    
    // Set initial welcome message
    setMessages([{ 
      role: 'bot', 
      content: getWelcomeMessage(false, origin, destination, useGenericKey)
    }]);
  };

  // Format message content with proper line breaks
  const formatMessage = (content: string) => {
    // Split by double newlines to get paragraphs
    const paragraphs = content.split(/\n\n+/);
    
    return (
      <>
        {paragraphs.map((paragraph, i) => (
          <p key={i} className="mb-2 last:mb-0">{paragraph}</p>
        ))}
      </>
    );
  };

  // Only render the chat UI if open
  if (!isOpen) return null;

  // Format the origin and destination for display
  const formattedOrigin = origin === "Your location" ? origin : 
    origin.length > 20 ? `${origin.substring(0, 20)}...` : origin;

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading || rateLimitExceeded) return;
    
    const userMessage = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);
    
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          destination: destination || "Surat", // Ensure destination is never empty
          origin: origin || "Your location", // Ensure origin is never empty
          message: userMessage,
          conversation_history: conversationHistory,
          conversation_id: conversationId // Add conversation ID to the request
        })
      });
      
      if (!response.ok) {
        if (response.status === 429) {
          // Handle rate limit exceeded
          setRateLimitExceeded(true);
          setTimeout(() => setRateLimitExceeded(false), 60000); // Reset after 1 minute
          throw new Error('Rate limit exceeded. Please wait a moment before sending more messages.');
        }
        throw new Error(`Error from server: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Check if response property exists
      if (data && data.response) {
        setMessages(prev => [...prev, { role: 'bot', content: data.response }]);
        
        // Update conversation history
        if (data.conversation_history) {
          setConversationHistory(data.conversation_history);
        }
        
        // Log fallback mode for debugging
        if (data.fallback) {
          console.warn('Using fallback mode for chat responses');
        }
      } else {
        // Handle missing response in API return
        throw new Error('Invalid response format from API');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      
      // Generate a fallback response
      const fallbackResponse = getFallbackResponse(userMessage, origin, destination);
      
      setMessages(prev => [...prev, 
        { role: 'bot', content: error instanceof Error && error.message.includes('Rate limit exceeded') 
          ? 'You have sent too many messages in a short period of time. Please wait a minute and try again.' 
          : fallbackResponse 
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Fallback response function for when the API fails
  const getFallbackResponse = (message: string, origin: string, destination: string): string => {
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('hello') || lowerMessage.includes('hi')) {
      return `Hello! I'm here to help with your travel plans from ${origin || "your location"} to ${destination || "Surat"}. How can I assist you?`;
    }
    
    if (lowerMessage.includes('flight') || lowerMessage.includes('airplane') || lowerMessage.includes('fly')) {
      return `For flights from ${origin || "your location"} to ${destination || "Surat"}, I recommend checking airlines like Air India, IndiGo, or connecting through major hubs. Typically you would need to fly to Ahmedabad or Mumbai and then take a connecting transportation to Surat.`;
    }
    
    if (lowerMessage.includes('hotel') || lowerMessage.includes('stay') || lowerMessage.includes('accommodation')) {
      return `There are many good hotels in ${destination || "Surat"} ranging from budget to luxury options. Popular areas include City Light, Adajan, and Vesu. Would you like more specific recommendations?`;
    }
    
    if (lowerMessage.includes('food') || lowerMessage.includes('restaurant') || lowerMessage.includes('eat')) {
      return `${destination || "Surat"} is famous for its Gujarati cuisine! Popular dishes include locho, surti sev khamani, and undhiyu. You'll find great food options along Dumas Road and in the Adajan area.`;
    }
    
    // Default fallback response
    return `I'm experiencing connection issues, but I can still help with your travel queries about ${destination || "Surat"}. Please try asking again or rephrase your question.`;
  };

  return (
    <Card className="chat-container shadow-lg border border-gray-200 rounded-lg overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between px-4 py-3 bg-blue-500">
        <div>
          <CardTitle className="text-white text-base font-medium">
            {title}
            {origin !== "Your location" && destination && (
              <div className="text-xs font-normal text-blue-100 mt-1">
                {`From: ${formattedOrigin}${destination ? ` • To: ${destination}` : ''}`}
              </div>
            )}
          </CardTitle>
          {isResumingConversation && (
            <div className="text-xs font-normal text-blue-100 mt-1 italic flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Continuing previous conversation
            </div>
          )}
        </div>
        <div className="flex items-center space-x-2">
          <Button 
            onClick={() => createNewConversation(isGenericMode(origin, destination))}
            className="h-10 w-10 p-0 text-white hover:bg-blue-600 rounded-full flex items-center justify-center"
            title="New Conversation"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 5v14M5 12h14"/>
            </svg>
          </Button>
          {onClose && (
            <Button 
              onClick={() => {
                // Don't reset chat when closing, just call onClose
                onClose();
              }}
              className="h-10 w-10 p-0 text-white hover:bg-blue-600 rounded-full flex items-center justify-center"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </Button>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="p-0" style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <div className="messages-container bg-gray-50 overflow-y-scroll">
          <div className="flex flex-col p-4 w-full space-y-6 overflow-y-scroll">
            {messages.length > 0 ? (
              messages.map((msg, index) => (
                <div key={index} className={`message flex items-start ${msg.role === 'user' ? 'justify-end' : ''}`}>
                  {msg.role === 'bot' && (
                    <div className="avatar bg-blue-100 rounded-full p-2 mr-2 text-blue-500 flex-shrink-0">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 8V4H8"></path>
                        <rect width="16" height="12" x="4" y="8" rx="2"></rect>
                        <path d="M2 14h2"></path>
                        <path d="M20 14h2"></path>
                        <path d="M15 13v2"></path>
                        <path d="M9 13v2"></path>
                      </svg>
                    </div>
                  )}
                  <div className={`bubble max-w-[75%] py-2 px-3 rounded-lg ${
                    msg.role === 'user' 
                      ? 'bg-blue-500 text-white rounded-br-none' 
                      : 'bg-white border border-gray-200 text-gray-800 rounded-bl-none'
                  }`} style={{ whiteSpace: 'pre-wrap' }}>
                    {formatMessage(msg.content)}
                  </div>
                  {msg.role === 'user' && (
                    <div className="avatar bg-blue-500 rounded-full p-2 ml-2 text-white flex-shrink-0">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path>
                        <circle cx="12" cy="7" r="4"></circle>
                      </svg>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500">
                <div className="text-center p-4 rounded-lg bg-white border border-gray-100">
                  <p>Start a conversation...</p>
                  <p className="text-xs mt-2 text-gray-400">Ask about travel plans, flights, accommodations, etc.</p>
                </div>
              </div>
            )}
            
            {isLoading && (
              <div className="message flex items-start">
                <div className="avatar bg-blue-100 rounded-full p-2 mr-2 text-blue-500 flex-shrink-0">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 8V4H8"></path>
                    <rect width="16" height="12" x="4" y="8" rx="2"></rect>
                    <path d="M2 14h2"></path>
                    <path d="M20 14h2"></path>
                    <path d="M15 13v2"></path>
                    <path d="M9 13v2"></path>
                  </svg>
                </div>
                <div className="bubble max-w-[75%] py-2 px-3 rounded-lg bg-white border border-gray-200 text-gray-800 rounded-bl-none" style={{ whiteSpace: 'pre-wrap' }}>
                  <div className="typing-indicator flex">
                    <span className="dot bg-gray-500 mx-0.5"></span>
                    <span className="dot bg-gray-500 mx-0.5"></span>
                    <span className="dot bg-gray-500 mx-0.5"></span>
                  </div>
                </div>
              </div>
            )}
            
            {rateLimitExceeded && (
              <div className="message flex items-start">
                <div className="avatar bg-red-100 rounded-full p-2 mr-2 text-red-500 flex-shrink-0">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                </div>
                <div className="bubble max-w-[75%] py-2 px-3 rounded-lg bg-red-50 border border-red-200 text-red-700 rounded-bl-none" style={{ whiteSpace: 'pre-wrap' }}>
                  Rate limit exceeded (20 requests/minute). Please wait a moment before sending more messages.
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} className="h-1" />
          </div>
        </div>
        
        <form onSubmit={sendMessage} className="input-form flex items-center p-3 border-t border-gray-200 bg-white">
          <Input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={placeholder}
            disabled={isLoading || rateLimitExceeded}
            className="flex-1 border-gray-300 focus:border-blue-500 focus:ring-blue-500 rounded-lg py-2"
          />
          <Button 
            type="submit" 
            disabled={isLoading || !input.trim() || rateLimitExceeded}
            className="ml-3 bg-blue-500 hover:bg-blue-600 text-white rounded-full p-2 h-10 w-10 flex items-center justify-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m22 2-7 20-4-9-9-4Z"></path>
              <path d="M22 2 11 13"></path>
            </svg>
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default Chat; 