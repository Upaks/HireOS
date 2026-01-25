import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, CheckCircle2, Loader2 } from "lucide-react";
import { Candidate } from "@/types";

export default function OfferMetrics() {
  const { data: candidates, isLoading } = useQuery<Candidate[]>({
    queryKey: ['/api/candidates'],
    queryFn: async () => {
      const res = await fetch('/api/candidates');
      if (!res.ok) throw new Error('Failed to fetch candidates');
      return res.json();
    },
  });

  // Calculate offer metrics
  const offersSent = candidates?.filter(c => 
    c.finalDecisionStatus === 'offer_sent' || c.status === 'hired'
  ).length || 0;

  const offersAccepted = candidates?.filter(c => c.status === 'hired').length || 0;
  
  const acceptanceRate = offersSent > 0 
    ? Math.round((offersAccepted / offersSent) * 100 * 10) / 10 
    : 0;

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">Offer Metrics</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
          </div>
        ) : (
          <>
            {/* Offers Sent Card */}
            <div className="p-4 rounded-lg bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-lg bg-blue-100">
                  <Mail className="h-4 w-4 text-blue-600" />
                </div>
                <span className="text-sm text-slate-600">Offers Sent</span>
              </div>
              <p className="text-3xl font-bold text-slate-900">{offersSent}</p>
              <p className="text-xs text-slate-500 mt-1">Total offers extended</p>
            </div>

            {/* Acceptance Rate Card */}
            <div className="p-4 rounded-lg bg-gradient-to-br from-green-50 to-emerald-50 border border-green-100">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-lg bg-green-100">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                </div>
                <span className="text-sm text-slate-600">Acceptance Rate</span>
              </div>
              <p className="text-3xl font-bold text-slate-900">{acceptanceRate}%</p>
              <p className="text-xs text-slate-500 mt-1">
                {offersAccepted} of {offersSent} accepted
              </p>
              
              {/* Progress bar */}
              <div className="mt-3 h-2 bg-slate-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-green-500 rounded-full transition-all duration-500"
                  style={{ width: `${acceptanceRate}%` }}
                />
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
