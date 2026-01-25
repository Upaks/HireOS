import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import AppShell from "@/components/layout/app-shell";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import FunnelChart from "@/components/analytics/funnel-chart";
import JobPerformanceTable from "@/components/analytics/job-performance-table";
import TimeToHire from "@/components/analytics/time-to-hire";
import ThisWeekActivity from "@/components/analytics/this-week-activity";
import PipelineByStage from "@/components/analytics/pipeline-by-stage";
import OfferMetrics from "@/components/analytics/offer-metrics";
import { FunnelStats, JobPerformance } from "@/types";
import { 
  Download, 
  Loader2,
  FileText,
  CheckCircle,
  Calendar,
  Award
} from "lucide-react";

export default function Analytics() {
  const [dateRange, setDateRange] = useState("30");
  
  // Fetch funnel metrics
  const { data: funnelData, isLoading: isLoadingFunnel, error: funnelError } = useQuery<FunnelStats>({
    queryKey: ['/api/analytics/funnel', { dateRange }],
    queryFn: async () => {
      const res = await fetch(`/api/analytics/funnel?dateRange=${dateRange}`, {
        credentials: "include"
      });
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || 'Failed to fetch funnel data');
      }
      return res.json();
    },
    retry: false,
  });
  
  // Fetch job performance metrics
  const { data: jobPerformanceData, isLoading: isLoadingJobPerformance } = useQuery<JobPerformance[]>({
    queryKey: ['/api/analytics/job-performance'],
    queryFn: async () => {
      const res = await fetch('/api/analytics/job-performance', {
        credentials: "include"
      });
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || 'Failed to fetch job performance data');
      }
      return res.json();
    },
    retry: false,
  });
  
  const handleDateRangeChange = (value: string) => {
    setDateRange(value);
  };
  
  const handleExport = () => {
    alert("Export functionality would be implemented here");
  };

  // Quick stats data
  const quickStats = [
    {
      title: "Total Apps",
      value: funnelData?.applications || 0,
      icon: <FileText className="h-4 w-4" />,
      subtitle: "+14.6% vs prev",
      color: "text-blue-600",
      bgColor: "bg-blue-50"
    },
    {
      title: "Assessments",
      value: funnelData?.assessments || 0,
      icon: <CheckCircle className="h-4 w-4" />,
      subtitle: `${funnelData?.applications ? Math.round((funnelData.assessments / funnelData.applications) * 100) : 0}% rate`,
      color: "text-indigo-600",
      bgColor: "bg-indigo-50"
    },
    {
      title: "Interviews",
      value: funnelData?.interviews || 0,
      icon: <Calendar className="h-4 w-4" />,
      subtitle: `${funnelData?.qualified ? Math.round((funnelData.interviews / funnelData.qualified) * 100) : 0}% of qualified`,
      color: "text-purple-600",
      bgColor: "bg-purple-50"
    },
    {
      title: "New Hires",
      value: funnelData?.hires || 0,
      icon: <Award className="h-4 w-4" />,
      subtitle: `${funnelData?.offers ? Math.round((funnelData.hires / funnelData.offers) * 100) : 0}% accept rate`,
      color: "text-green-600",
      bgColor: "bg-green-50"
    }
  ];
  
  return (
    <AppShell>
      {/* Header */}
      <div className="px-4 sm:px-6 lg:px-8 py-4 border-b border-slate-200 bg-white">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-slate-900">Hiring Analytics</h1>
          <div className="flex items-center space-x-4">
            <Select value={dateRange} onValueChange={handleDateRangeChange}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Date Range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="30">Last 30 days</SelectItem>
                <SelectItem value="90">Last 90 days</SelectItem>
                <SelectItem value="180">Last 6 months</SelectItem>
                <SelectItem value="365">Last year</SelectItem>
                <SelectItem value="all">All time</SelectItem>
              </SelectContent>
            </Select>
            
            <Button 
              variant="outline" 
              size="sm"
              className="flex items-center gap-2"
              onClick={handleExport}
            >
              <Download className="h-4 w-4" />
              Export
            </Button>
          </div>
        </div>
      </div>
      
      <div className="px-4 sm:px-6 lg:px-8 py-6 bg-slate-50">
        
        {/* ROW 1: 3 Columns */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* CELL 1: Quick Stats (2x2 grid) */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">Quick Stats</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingFunnel ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {quickStats.map((stat, index) => (
                    <div key={index} className={`p-3 rounded-lg ${stat.bgColor}`}>
                      <div className="flex items-center gap-2 mb-1">
                        <div className={stat.color}>{stat.icon}</div>
                        <span className="text-xs text-slate-600">{stat.title}</span>
                      </div>
                      <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
                      <p className="text-xs text-slate-500 mt-1">{stat.subtitle}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* CELL 2: Hiring Funnel (existing component) */}
          {isLoadingFunnel ? (
            <Card className="flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </Card>
          ) : funnelData ? (
            <FunnelChart data={funnelData} />
          ) : (
            <Card className="flex items-center justify-center">
              <p className="text-muted-foreground">No funnel data available.</p>
            </Card>
          )}
          
          {/* CELL 3: Time to Hire */}
          <TimeToHire />
          
        </div>
        
        {/* ROW 2: 3 Columns */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
          
          {/* CELL 4: This Week's Activity */}
          <ThisWeekActivity />
          
          {/* CELL 5: Pipeline by Stage */}
          <PipelineByStage />
          
          {/* CELL 6: Offer Metrics */}
          <OfferMetrics />
          
        </div>
        
        {/* ROW 3: Job Performance Table (Full Width) */}
        <div className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Job Performance</CardTitle>
            </CardHeader>
            
            {isLoadingJobPerformance ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : jobPerformanceData ? (
              <JobPerformanceTable data={jobPerformanceData} />
            ) : (
              <CardContent>
                <div className="text-center py-4 text-muted-foreground">
                  No job performance data available.
                </div>
              </CardContent>
            )}
          </Card>
        </div>
        
      </div>
    </AppShell>
  );
}
