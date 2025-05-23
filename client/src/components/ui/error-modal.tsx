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
  // Force friendly message ALWAYS - never show raw errors to users
  let friendlyDescription = "We couldn't complete this operation. The candidate's email address may be invalid.";
  
  // Even simplify further - don't try to parse anything, just use fixed messages
  if (description && (description.toString().toLowerCase().includes('email') || 
                      description.toString().includes('invalid'))) {
    friendlyDescription = "We couldn't send an email to this candidate because the email address appears to be invalid or doesn't exist. Please verify the email address is correct before trying again.";
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