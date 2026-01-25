import { useState } from "react";
import { JobPerformance } from "@/types";
import { Briefcase, TrendingUp } from "lucide-react";

interface JobPerformanceTableProps {
  data: JobPerformance[];
}

export default function JobPerformanceTable({ data }: JobPerformanceTableProps) {
  const [selectedJobId, setSelectedJobId] = useState<number | null>(
    data && data.length > 0 ? data[0].id : null
  );

  if (!data || data.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No job performance data available.
      </div>
    );
  }

  const selectedJob = data.find((job) => job.id === selectedJobId) || data[0];

  // Pie chart segments data
  const segments = [
    { 
      label: "Applications", 
      value: selectedJob.metrics.applications, 
      color: "bg-blue-500",
      colorHex: "#3b82f6"
    },
    { 
      label: "Assessments", 
      value: selectedJob.metrics.assessments, 
      color: "bg-purple-500",
      colorHex: "#a855f7"
    },
    { 
      label: "Interviews", 
      value: selectedJob.metrics.interviews, 
      color: "bg-amber-500",
      colorHex: "#f59e0b"
    },
    { 
      label: "Offers", 
      value: selectedJob.metrics.offers, 
      color: "bg-green-500",
      colorHex: "#22c55e"
    },
    { 
      label: "Hires", 
      value: selectedJob.metrics.hires, 
      color: "bg-emerald-600",
      colorHex: "#059669"
    },
  ];

  const total = segments.reduce((sum, seg) => sum + seg.value, 0);

  // Calculate conic gradient for pie chart
  const getConicGradient = () => {
    if (total === 0) {
      return "conic-gradient(#e2e8f0 0deg 360deg)";
    }
    
    let currentAngle = 0;
    const gradientParts: string[] = [];
    
    segments.forEach((segment) => {
      const percentage = (segment.value / total) * 100;
      const endAngle = currentAngle + (percentage * 3.6); // 3.6 = 360/100
      
      if (segment.value > 0) {
        gradientParts.push(`${segment.colorHex} ${currentAngle}deg ${endAngle}deg`);
      }
      currentAngle = endAngle;
    });
    
    return `conic-gradient(${gradientParts.join(", ")})`;
  };

  return (
    <div className="p-6">
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left Panel - Job List */}
        <div className="lg:col-span-2">
          <h3 className="text-sm font-medium text-slate-500 mb-3">Select a Job</h3>
          <div className="space-y-2 max-h-[320px] overflow-y-auto pr-2 custom-scrollbar">
            {data.map((job) => (
              <button
                key={job.id}
                onClick={() => setSelectedJobId(job.id)}
                className={`w-full text-left p-3 rounded-lg border transition-all duration-200 ${
                  selectedJobId === job.id
                    ? "border-primary bg-primary/5 shadow-sm"
                    : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg ${
                    selectedJobId === job.id ? "bg-primary/10" : "bg-slate-100"
                  }`}>
                    <Briefcase className={`h-4 w-4 ${
                      selectedJobId === job.id ? "text-primary" : "text-slate-500"
                    }`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`font-medium truncate ${
                      selectedJobId === job.id ? "text-primary" : "text-slate-900"
                    }`}>
                      {job.title}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-slate-500">
                        {job.metrics.applications} apps
                      </span>
                      <span className="text-slate-300">•</span>
                      <span className="text-xs font-medium text-green-600">
                        {job.metrics.conversionRate.toFixed(1)}% conversion
                      </span>
                    </div>
                  </div>
                  {selectedJobId === job.id && (
                    <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2" />
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Right Panel - Pie Chart */}
        <div className="lg:col-span-3">
          <h3 className="text-sm font-medium text-slate-500 mb-3">Pipeline Breakdown</h3>
          
          <div className="bg-slate-50 rounded-xl p-6">
            {/* Job Title */}
            <div className="text-center mb-4">
              <h4 className="font-semibold text-slate-900">{selectedJob.title}</h4>
              <p className="text-sm text-slate-500">{selectedJob.department || selectedJob.type}</p>
            </div>

            {/* Pie Chart */}
            <div className="flex justify-center mb-6">
              <div className="relative">
                <div 
                  className="w-40 h-40 rounded-full"
                  style={{ background: getConicGradient() }}
                />
                {/* Center hole for donut effect */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-24 h-24 rounded-full bg-slate-50 flex flex-col items-center justify-center">
                    <span className="text-2xl font-bold text-slate-900">{total}</span>
                    <span className="text-xs text-slate-500">Total</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Legend with values */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {segments.map((segment) => {
                const percentage = total > 0 ? ((segment.value / total) * 100).toFixed(1) : "0.0";
                return (
                  <div 
                    key={segment.label}
                    className="flex items-center gap-2 p-2 rounded-lg bg-white border border-slate-100"
                  >
                    <div className={`w-3 h-3 rounded-full ${segment.color}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-slate-500 truncate">{segment.label}</p>
                      <p className="text-sm font-semibold text-slate-900">
                        {segment.value} <span className="text-xs font-normal text-slate-400">({percentage}%)</span>
                      </p>
                    </div>
                  </div>
                );
              })}
              
              {/* Conversion Rate Card */}
              <div className="flex items-center gap-2 p-2 rounded-lg bg-gradient-to-br from-green-50 to-emerald-50 border border-green-100">
                <div className="p-1 rounded bg-green-100">
                  <TrendingUp className="w-3 h-3 text-green-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-green-600 truncate">Conversion</p>
                  <p className="text-sm font-semibold text-green-700">
                    {selectedJob.metrics.conversionRate.toFixed(1)}%
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
