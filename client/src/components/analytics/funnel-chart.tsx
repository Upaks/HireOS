import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FunnelStats } from "@/types";

interface FunnelChartProps {
  data: FunnelStats;
}

export default function FunnelChart({ data }: FunnelChartProps) {
  const formatPercentage = (value: number, total: number) => {
    if (total === 0) return "0%";
    return `${Math.round((value / total) * 100)}%`;
  };
  
  const getWidth = (value: number, total: number) => {
    if (total === 0) return "0%";
    return `${Math.round((value / total) * 100)}%`;
  };
  
  const stages = [
    { 
      name: "Applications", 
      value: data.applications, 
      color: "bg-primary", 
      bgColor: "bg-primary/10" 
    },
    { 
      name: "Assessments", 
      value: data.assessments, 
      color: "bg-secondary", 
      bgColor: "bg-indigo-50" 
    },
    { 
      name: "Qualified", 
      value: data.qualified, 
      color: "bg-blue-600", 
      bgColor: "bg-blue-50" 
    },
    { 
      name: "Interviews", 
      value: data.interviews, 
      color: "bg-warning", 
      bgColor: "bg-amber-50" 
    },
    { 
      name: "Offers", 
      value: data.offers, 
      color: "bg-purple-600", 
      bgColor: "bg-purple-50" 
    },
    { 
      name: "Hires", 
      value: data.hires, 
      color: "bg-success", 
      bgColor: "bg-green-50" 
    }
  ];
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Hiring Funnel</CardTitle>
      </CardHeader>
      <CardContent>
        {stages.map((stage, index) => (
          <div key={stage.name} className="relative pt-1 mb-4">
            <div className="flex mb-2 items-center justify-between">
              <div>
                <span className={`text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full ${stage.bgColor} text-${stage.color.replace('bg-', '')}`}>
                  {stage.name}
                </span>
              </div>
              <div className="text-right">
                <span className={`text-xs font-semibold inline-block ${stage.color.replace('bg-', 'text-')}`}>
                  {stage.value}
                </span>
              </div>
            </div>
            <div className={`overflow-hidden h-2 mb-4 text-xs flex rounded ${stage.bgColor}`}>
              <div 
                style={{ width: getWidth(stage.value, data.applications) }} 
                className={`shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center ${stage.color}`}
              ></div>
            </div>
          </div>
        ))}
        
        <div className="text-sm text-center mt-6">
          <span className="font-semibold">Conversion Rate: </span>
          <span className="text-success font-medium">{data.conversionRate.toFixed(2)}%</span>
          <span className="text-slate-500"> (Applications to Hires)</span>
        </div>
      </CardContent>
    </Card>
  );
}
