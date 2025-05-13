'use client';

import React, { useState, useEffect } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface LogoutWarningDialogProps {
  isOpen: boolean;
  secondsRemaining: number;
  onStayLoggedIn: () => void;
}

export function LogoutWarningDialog({
  isOpen,
  secondsRemaining,
  onStayLoggedIn,
}: LogoutWarningDialogProps) {
  // Local state to control dialog visibility
  const [showDialog, setShowDialog] = useState(isOpen);
  
  // Update local state when isOpen changes
  useEffect(() => {
    setShowDialog(isOpen);
  }, [isOpen]);
  
  // Handle the stay logged in button
  const handleStayLoggedIn = () => {
    // First close the dialog
    setShowDialog(false);
    // Then call the provided callback
    onStayLoggedIn();
  };
  
  return (
    <AlertDialog open={showDialog}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Session Timeout Warning</AlertDialogTitle>
          <AlertDialogDescription>
            Due to inactivity, you will be automatically logged out in{' '}
            <span className="font-bold text-red-500">
              {secondsRemaining} seconds
            </span>
            .
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction
            onClick={handleStayLoggedIn}
            className="bg-blue-500 hover:bg-blue-600 text-white"
          >
            Stay Logged In
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
} 