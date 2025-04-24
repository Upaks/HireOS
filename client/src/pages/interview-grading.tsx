import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import AppShell from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import EvaluationForm from "@/components/interview/evaluation-form";
import { Interview, Evaluation } from "@/types";
import { ArrowLeft, Loader2, Play } from "lucide-react";

export default function InterviewGrading() {
  const { id } = useParams();
  const [_, navigate] = useLocation();
  
  // Fetch interview data
  const { data: interview, isLoading: isLoadingInterview } = useQuery<Interview>({
    queryKey: [`/api/interviews/${id}`],
    enabled: !!id,
  });
  
  // Fetch existing evaluation if any
  const { data: evaluation, isLoading: isLoadingEvaluation } = useQuery<Evaluation>({
    queryKey: [`/api/interviews/${id}/evaluation`],
    enabled: !!id,
  });
  
  const handleBack = () => {
    navigate("/interviews");
  };
  
  const handleComplete = () => {
    // Navigate back after completing the evaluation
    navigate("/interviews");
  };

  return (
    <AppShell>
      <div className="px-4 sm:px-6 lg:px-8 py-4 border-b border-slate-200 bg-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Interview Evaluation</h1>
            {interview?.candidate && (
              <p className="mt-1 text-sm text-slate-500">
                {interview.candidate.name} - {interview.candidate.job?.title || `Job ID: ${interview.candidate.jobId}`}
              </p>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
            onClick={handleBack}
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Interviews
          </Button>
        </div>
      </div>
      
      <div className="px-4 sm:px-6 lg:px-8 py-6 bg-slate-50">
        {isLoadingInterview || isLoadingEvaluation ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : !interview ? (
          <div className="text-center py-8 text-destructive">
            Interview not found. Please check the URL and try again.
          </div>
        ) : (
          <div className="max-w-4xl mx-auto">
            {/* Interview Recording */}
            <Card className="overflow-hidden mb-6">
              <CardContent className="p-6">
                <h3 className="text-lg font-medium text-slate-900 mb-4">Interview Recording</h3>
                <div className="aspect-w-16 aspect-h-9 relative">
                  {interview.videoUrl ? (
                    <iframe
                      src={interview.videoUrl}
                      allowFullScreen
                      className="rounded-md w-full h-[400px] border"
                    ></iframe>
                  ) : (
                    <div className="w-full h-[400px] bg-slate-200 flex items-center justify-center rounded-md">
                      <div className="text-center">
                        <Play className="mx-auto h-12 w-12 text-slate-400" />
                        <p className="mt-2 text-sm text-slate-500">No recording available</p>
                        <p className="text-xs text-slate-400">
                          {interview.scheduledDate 
                            ? `Scheduled for ${new Date(interview.scheduledDate).toLocaleString()}`
                            : "No schedule information"
                          }
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
            
            {/* Evaluation Form */}
            <EvaluationForm 
              interview={interview} 
              existingEvaluation={evaluation}
              onComplete={handleComplete}
            />
          </div>
        )}
      </div>
    </AppShell>
  );
}
