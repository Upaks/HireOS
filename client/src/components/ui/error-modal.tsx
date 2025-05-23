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
  // Parse error messages from API responses
  let friendlyDescription = description;
  
  // Check if we have a JSON error message with specific error types
  if (description.includes("Candidate email does not exist") || 
      description.includes("non_existent_email")) {
    friendlyDescription = "We couldn't send an email to this candidate because the email address appears to be invalid or doesn't exist. Please verify the email address or update it before trying again.";
  }
  
  // If it's a technical JSON error
  if (description.startsWith("{") || description.includes('{"message"')) {
    friendlyDescription = "There was a problem processing your request. The candidate's email address may be invalid or our system encountered an issue. Please try again or contact support if this persists.";
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