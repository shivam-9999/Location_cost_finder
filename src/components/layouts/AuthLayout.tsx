'use client';

import React, { ReactNode, useEffect } from 'react';
import { useAutoLogout } from '@/hooks/useAutoLogout';
import { LogoutWarningDialog } from '@/components/ui/LogoutWarningDialog';

interface AuthLayoutProps {
  children: ReactNode;
}

/**
 * Layout component for authenticated pages that includes auto-logout functionality
 */
export default function AuthLayout({ children }: AuthLayoutProps) {
  const { secondsToLogout, stayLoggedIn } = useAutoLogout();
  
  // Handle staying logged in - ensures the dialog is properly dismissed
  const handleStayLoggedIn = () => {
    stayLoggedIn();
  };
  
  return (
    <>
      {/* Render the logout warning dialog when a timeout is about to occur */}
      {secondsToLogout !== null && (
        <LogoutWarningDialog 
          isOpen={secondsToLogout !== null}
          secondsRemaining={secondsToLogout}
          onStayLoggedIn={handleStayLoggedIn}
        />
      )}
      
      {/* Render all children components */}
      {children}
    </>
  );
} 