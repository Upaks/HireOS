import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import AppShell from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import EvaluationForm from "@/components/interview/evaluation-form";
import { Interview, Evaluation } from "@/types";
import { ArrowLeft, Loader2, Play, Edit2, Save, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export default function InterviewGrading() {
  const { id } = useParams();
  const [_, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isEditingVideoUrl, setIsEditingVideoUrl] = useState(false);
  const [videoUrlInput, setVideoUrlInput] = useState("");
  
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

  // Initialize video URL input when interview loads
  useEffect(() => {
    if (interview?.videoUrl) {
      setVideoUrlInput(interview.videoUrl);
    }
  }, [interview?.videoUrl]);
  
  // Update video URL mutation
  const updateVideoUrlMutation = useMutation({
    mutationFn: async (url: string) => {
      const res = await apiRequest("PATCH", `/api/interviews/${id}`, { videoUrl: url });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/interviews/${id}`] });
      toast({
        title: "Recording URL updated",
        description: "The interview recording URL has been saved.",
      });
      setIsEditingVideoUrl(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update URL",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  const handleBack = () => {
    navigate("/interviews");
  };
  
  const handleComplete = () => {
    // Navigate back after completing the evaluation
    navigate("/interviews");
  };

  const handleSaveVideoUrl = () => {
    updateVideoUrlMutation.mutate(videoUrlInput);
  };

  const handleCancelEdit = () => {
    setVideoUrlInput(interview?.videoUrl || "");
    setIsEditingVideoUrl(false);
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
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-slate-900">Interview Recording</h3>
                  {!isEditingVideoUrl ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsEditingVideoUrl(true)}
                      className="flex items-center gap-2"
                    >
                      <Edit2 className="h-4 w-4" />
                      {interview.videoUrl ? "Edit URL" : "Add Recording URL"}
                    </Button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleCancelEdit}
                        disabled={updateVideoUrlMutation.isPending}
                      >
                        <X className="h-4 w-4 mr-1" />
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        onClick={handleSaveVideoUrl}
                        disabled={updateVideoUrlMutation.isPending}
                      >
                        <Save className="h-4 w-4 mr-1" />
                        {updateVideoUrlMutation.isPending ? "Saving..." : "Save"}
                      </Button>
                    </div>
                  )}
                </div>

                {isEditingVideoUrl ? (
                  <div className="space-y-2">
                    <Label htmlFor="video-url-input">Recording URL</Label>
                    <Input
                      id="video-url-input"
                      type="url"
                      placeholder="https://zoom.us/recording/... or https://youtube.com/..."
                      value={videoUrlInput}
                      onChange={(e) => setVideoUrlInput(e.target.value)}
                      className="w-full"
                    />
                    <p className="text-xs text-slate-500">
                      Paste the recording link here. Works with Zoom, Google Meet, YouTube, Vimeo, etc.
                    </p>
                  </div>
                ) : (
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
                          <p className="text-xs text-slate-400 mt-1">
                            Click "Add Recording URL" above to add a recording link
                          </p>
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
                )}
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
