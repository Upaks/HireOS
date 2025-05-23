import React from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { XCircle } from "lucide-react";

interface ErrorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  buttonText?: string;
}

export function ErrorModal({
  open,
  onOpenChange,
  title,
  description,
  buttonText = "Okay"
}: ErrorModalProps) {
  // ALWAYS show user-friendly messages regardless of input
  // Default message for any technical error
  let friendlyDescription = "There was a problem with your request. Please try again.";
  
  // If we have any error description at all, replace it with user-friendly messaging
  if (description) {
    // For email-related errors (most common case)
    if (typeof description === 'string' && (
        description.toLowerCase().includes('email') || 
        description.includes('non_existent_email'))) {
      friendlyDescription = "We couldn't send an email to this candidate because the email address appears to be invalid or doesn't exist. Please verify the email address is correct before trying again.";
    }
    
    // ALWAYS replace JSON or error code formats with friendly messaging
    if (description.toString().includes('{') || 
        description.toString().includes('}') ||
        description.toString().includes('422') ||
        description.toString().includes('message')) {
      friendlyDescription = "We encountered a problem with this operation. Please verify the candidate's email address is valid and try again.";
    }
  }
  
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center gap-2 text-destructive">
            <XCircle className="h-5 w-5" />
            <AlertDialogTitle>{title}</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="mt-4 text-base">
            {friendlyDescription}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction className="bg-primary hover:bg-primary/90">{buttonText}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}