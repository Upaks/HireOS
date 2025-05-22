import React from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogFooter,
} from "@/components/ui/alert-dialog";
import { XCircle } from "lucide-react";

interface ErrorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  buttonText?: string;
  isEmailError?: boolean;
}

export function ErrorModal({
  open,
  onOpenChange,
  title = "Error",
  description,
  buttonText = "Okay",
  isEmailError = false
}: ErrorModalProps) {
  // For email errors, use a standardized message
  const emailErrorContent = (
    <div className="bg-red-500 text-white p-6 rounded-md max-w-md w-full mx-auto">
      <div className="flex items-center gap-3 mb-4">
        <XCircle className="h-8 w-8 text-white" />
        <h2 className="text-xl font-bold text-white">Error!</h2>
      </div>
      <p className="text-lg mb-6">OFFER can't be sent: Candidate email does not exist</p>
      <div className="flex justify-end">
        <button 
          onClick={() => onOpenChange(false)}
          className="bg-white text-red-500 px-4 py-2 rounded-md font-medium hover:bg-red-50"
        >
          {buttonText}
        </button>
      </div>
    </div>
  );

  // Standard error content for other error types
  const standardErrorContent = (
    <AlertDialogContent className="bg-white border-red-300 border-2">
      <div className="flex items-center gap-2 text-destructive mb-4">
        <XCircle className="h-6 w-6" />
        <h2 className="text-lg font-semibold">{title}</h2>
      </div>
      
      <p className="text-gray-700 mb-6">
        {description}
      </p>
      
      <AlertDialogFooter>
        <AlertDialogAction className="bg-red-500 hover:bg-red-600 text-white">
          {buttonText}
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  );

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      {isEmailError ? emailErrorContent : standardErrorContent}
    </AlertDialog>
  );
}