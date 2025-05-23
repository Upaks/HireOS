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
  // Always use a friendly message, never show raw JSON or technical errors
  let friendlyDescription = "There was a problem with your request. Please try again.";
  
  // Check for email-related errors first (most common case)
  if (typeof description === 'string') {
    if (description.toLowerCase().includes('email') || 
        description.includes('non_existent_email')) {
      friendlyDescription = "We couldn't send an email to this candidate because the email address appears to be invalid or doesn't exist. Please verify the email address is correct before trying again.";
    }
  }
  
  // Force a user-friendly message for any technical-looking message
  // This ensures we NEVER show raw JSON to users
  if (typeof description === 'string' && 
      (description.startsWith("{") || 
       description.includes('"message"') || 
       description.includes('422:') ||
       description.match(/\d{3}/))) {
    // Keep using our default friendly message
    friendlyDescription = "We encountered a problem sending the email. Please verify the email address and try again.";
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