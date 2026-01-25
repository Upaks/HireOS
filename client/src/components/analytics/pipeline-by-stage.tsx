import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { Candidate } from "@/types";

export default function PipelineByStage() {
  const { data: candidates, isLoading } = useQuery<Candidate[]>({
    queryKey: ['/api/candidates'],
    queryFn: async () => {
      const res = await fetch('/api/candidates');
      if (!res.ok) throw new Error('Failed to fetch candidates');
      return res.json();
    },
  });

  // Calculate candidates by stage
  const stages = [
    {
      name: "Applied",
      value: candidates?.filter(c => c.status === 'applied').length || 0,
      color: "bg-blue-500"
    },
    {
      name: "Screening",
      value: candidates?.filter(c => c.status === 'screening').length || 0,
      color: "bg-indigo-500"
    },
    {
      name: "Interview",
      value: candidates?.filter(c => c.status === 'interview').length || 0,
      color: "bg-purple-500"
    },
    {
      name: "Offer",
      value: candidates?.filter(c => c.finalDecisionStatus === 'offer_sent').length || 0,
      color: "bg-amber-500"
    },
    {
      name: "Hired",
      value: candidates?.filter(c => c.status === 'hired').length || 0,
      color: "bg-green-500"
    }
  ];

  const total = stages.reduce((sum, stage) => sum + stage.value, 0);
  const maxValue = Math.max(...stages.map(s => s.value), 1);

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">Pipeline by Stage</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Visual Funnel */}
            <div className="flex flex-col items-center gap-1 py-2">
              {stages.map((stage, index) => {
                const widthPercent = total > 0 
                  ? Math.max(20, 100 - (index * 16))
                  : 100 - (index * 16);
                
                return (
                  <div
                    key={stage.name}
                    className={`${stage.color} rounded flex items-center justify-center transition-all duration-300`}
                    style={{ 
                      width: `${widthPercent}%`,
                      height: '24px',
                      minWidth: '50px'
                    }}
                  >
                    <span className="text-xs font-medium text-white">
                      {stage.value}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Legend */}
            <div className="space-y-2 pt-2 border-t border-slate-200">
              {stages.map((stage) => (
                <div key={stage.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${stage.color}`} />
                    <span className="text-sm text-slate-600">{stage.name}</span>
                  </div>
                  <span className="text-sm font-medium text-slate-900">{stage.value}</span>
                </div>
              ))}
            </div>

            {/* Total */}
            <div className="text-center pt-2 border-t border-slate-200">
              <span className="text-sm text-slate-500">Total in Pipeline: </span>
              <span className="text-sm font-semibold text-slate-900">{total}</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
