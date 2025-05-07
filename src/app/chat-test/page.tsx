"use client";

import React, { useState } from 'react';
import Chat from '@/components/ui/chat';

export default function ChatTestPage() {
  const [isChatOpen, setIsChatOpen] = useState(true);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100">
      <h1 className="text-3xl font-bold mb-8">Chat Component Test Page</h1>
      
      <div className="flex gap-4 mb-8">
        <button 
          onClick={() => setIsChatOpen(true)} 
          className="px-4 py-2 bg-blue-500 text-white rounded-md"
        >
          Show Chat
        </button>
        
        <button 
          onClick={() => setIsChatOpen(false)} 
          className="px-4 py-2 bg-red-500 text-white rounded-md"
        >
          Hide Chat
        </button>
      </div>
      
      <div className="p-4 bg-white rounded-md shadow-md mb-8">
        <p className="text-gray-700">
          Current chat state: <span className="font-bold">{isChatOpen ? 'Visible' : 'Hidden'}</span>
        </p>
      </div>
      
      {/* Chat component */}
      {isChatOpen && (
        <div className="fixed bottom-0 right-0 z-[9999]">
          <Chat 
            title="Test Chat" 
            onClose={() => setIsChatOpen(false)} 
          />
        </div>
      )}
      
      {/* Chat toggle button */}
      {!isChatOpen && (
        <button
          onClick={() => setIsChatOpen(true)}
          className="fixed bottom-4 right-4 bg-blue-500 hover:bg-blue-600 text-white p-4 rounded-full shadow-lg z-[9999]"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
          </svg>
        </button>
      )}
    </div>
  );
} 