import { useState, useEffect } from "react";
import { useRoute } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, XCircle, Calendar, FileText, DollarSign, Briefcase } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface OfferDetails {
  offer: {
    id: number;
    offerType: string;
    compensation: string;
    startDate?: string;
    notes?: string;
    contractUrl?: string;
  };
  candidate: {
    name: string;
    email: string;
  };
  job: {
    title: string;
    type: string;
  } | null;
}

export default function AcceptOfferPage() {
  const [, params] = useRoute("/accept-offer/:token");
  const token = params?.token;
  const { toast } = useToast();
  const [action, setAction] = useState<"accept" | "decline" | null>(null);

  // Fetch offer details
  const { data: offerData, isLoading, error } = useQuery<OfferDetails>({
    queryKey: [`/api/offers/${token}`],
    enabled: !!token,
    queryFn: async () => {
      const response = await fetch(`/api/offers/${token}`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to load offer");
      }
      return response.json();
    },
  });

  // Respond to offer (accept or decline)
  const respondMutation = useMutation({
    mutationFn: async (action: "accept" | "decline") => {
      const response = await fetch(`/api/offers/${token}/respond`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to respond to offer");
      }

      return response.json();
    },
    onSuccess: (data, action) => {
      if (action === "accept") {
        toast({
          title: "Offer Accepted!",
          description: data.message || "Your offer has been accepted. Check your email for onboarding information.",
        });
        setAction("accept");
      } else {
        toast({
          title: "Offer Declined",
          description: data.message || "Your response has been recorded.",
        });
        setAction("decline");
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-slate-600">Loading offer details...</p>
        </div>
      </div>
    );
  }

  if (error || !offerData) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <XCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-slate-900 mb-2">Offer Not Found</h2>
              <p className="text-slate-600">
                {error instanceof Error ? error.message : "This offer link is invalid or has expired."}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { offer, candidate, job } = offerData;

  // If already responded
  if (action === "accept") {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <CheckCircle2 className="h-12 w-12 text-green-600 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-slate-900 mb-2">Offer Accepted!</h2>
              <p className="text-slate-600 mb-4">
                Congratulations! We're excited to have you join our team. Check your email for onboarding information.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (action === "decline") {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <XCircle className="h-12 w-12 text-slate-400 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-slate-900 mb-2">Offer Declined</h2>
              <p className="text-slate-600">
                Thank you for letting us know. We wish you the best in your career journey.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Job Offer</CardTitle>
            <CardDescription>
              {candidate.name}, we're excited to extend this offer to you!
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Job Details */}
            {job && (
              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">{job.title}</h3>
                <p className="text-slate-600">{job.type}</p>
              </div>
            )}

            {/* Offer Details */}
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <Briefcase className="h-5 w-5 text-slate-400 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-slate-500">Offer Type</p>
                  <p className="text-slate-900">{offer.offerType}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <DollarSign className="h-5 w-5 text-slate-400 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-slate-500">Compensation</p>
                  <p className="text-slate-900">{offer.compensation}</p>
                </div>
              </div>

              {offer.startDate && (
                <div className="flex items-start gap-3">
                  <Calendar className="h-5 w-5 text-slate-400 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-slate-500">Start Date</p>
                    <p className="text-slate-900">
                      {new Date(offer.startDate).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </p>
                  </div>
                </div>
              )}

              {offer.contractUrl && (
                <div className="flex items-start gap-3">
                  <FileText className="h-5 w-5 text-slate-400 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-slate-500">Contract</p>
                    <a
                      href={offer.contractUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      View Contract
                    </a>
                  </div>
                </div>
              )}

              {offer.notes && (
                <div>
                  <p className="text-sm font-medium text-slate-500 mb-1">Additional Notes</p>
                  <p className="text-slate-700 whitespace-pre-wrap">{offer.notes}</p>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4 pt-4 border-t">
              <Button
                onClick={() => respondMutation.mutate("accept")}
                disabled={respondMutation.isPending}
                className="flex-1"
                size="lg"
              >
                {respondMutation.isPending && respondMutation.variables === "accept" ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Accept Offer
                  </>
                )}
              </Button>
              <Button
                onClick={() => respondMutation.mutate("decline")}
                disabled={respondMutation.isPending}
                variant="outline"
                className="flex-1"
                size="lg"
              >
                {respondMutation.isPending && respondMutation.variables === "decline" ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <XCircle className="mr-2 h-4 w-4" />
                    Decline
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

