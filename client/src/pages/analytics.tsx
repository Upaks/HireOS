import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import AppShell from "@/components/layout/app-shell";
import TopBar from "@/components/layout/top-bar";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import FunnelChart from "@/components/analytics/funnel-chart";
import JobPerformanceTable from "@/components/analytics/job-performance-table";
import { FunnelStats, JobPerformance } from "@/types";
import { Download, Loader2 } from "lucide-react";

export default function Analytics() {
  const [dateRange, setDateRange] = useState("30"); // Default to last 30 days
  
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
  
  // Handle date range change
  const handleDateRangeChange = (value: string) => {
    setDateRange(value);
  };
  
  // Mock function to handle export
  const handleExport = () => {
    // In a real app, this would generate a CSV or PDF export
    alert("Export functionality would be implemented here");
  };
  
  return (
    <AppShell>
      <div className="px-4 sm:px-6 lg:px-8 py-4 border-b border-slate-200 bg-white">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-slate-900">Hiring Analytics</h1>
          <div className="flex items-center space-x-4">
            <Select 
              value={dateRange} 
              onValueChange={handleDateRangeChange}
            >
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
        {/* Overview Stats */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="p-5">
              <div className="flex flex-col">
                <div className="text-sm font-medium text-slate-500">Total Applications</div>
                <div className="text-xl font-semibold text-slate-900 mt-1">
                  {isLoadingFunnel ? <Loader2 className="h-5 w-5 animate-spin" /> : funnelData?.applications || 0}
                </div>
                {!isLoadingFunnel && funnelData && (
                  <div className="text-sm mt-1">
                    <span className="text-green-600 font-medium">+14.6%</span>
                    <span className="text-slate-500"> vs previous period</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-5">
              <div className="flex flex-col">
                <div className="text-sm font-medium text-slate-500">Assessments Completed</div>
                <div className="text-xl font-semibold text-slate-900 mt-1">
                  {isLoadingFunnel ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : funnelError ? (
                    <span className="text-red-500 text-sm">Error</span>
                  ) : (
                    funnelData?.assessments ?? 0
                  )}
                </div>
                {!isLoadingFunnel && !funnelError && funnelData && (
                  <div className="text-sm mt-1">
                    <span className="text-green-600 font-medium">
                      {funnelData.applications > 0 
                        ? Math.round((funnelData.assessments / funnelData.applications) * 100) 
                        : 0}%
                    </span>
                    <span className="text-slate-500"> completion rate</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-5">
              <div className="flex flex-col">
                <div className="text-sm font-medium text-slate-500">Interviews Conducted</div>
                <div className="text-xl font-semibold text-slate-900 mt-1">
                  {isLoadingFunnel ? <Loader2 className="h-5 w-5 animate-spin" /> : funnelData?.interviews || 0}
                </div>
                {!isLoadingFunnel && funnelData && (
                  <div className="text-sm mt-1">
                    <span className="text-amber-600 font-medium">
                      {funnelData.qualified > 0 
                        ? Math.round((funnelData.interviews / funnelData.qualified) * 100) 
                        : 0}%
                    </span>
                    <span className="text-slate-500"> of qualified candidates</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-5">
              <div className="flex flex-col">
                <div className="text-sm font-medium text-slate-500">New Hires</div>
                <div className="text-xl font-semibold text-slate-900 mt-1">
                  {isLoadingFunnel ? <Loader2 className="h-5 w-5 animate-spin" /> : funnelData?.hires || 0}
                </div>
                {!isLoadingFunnel && funnelData && (
                  <div className="text-sm mt-1">
                    <span className="text-green-600 font-medium">
                      {funnelData.offers > 0 
                        ? Math.round((funnelData.hires / funnelData.offers) * 100) 
                        : 0}%
                    </span>
                    <span className="text-slate-500"> offer acceptance rate</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Funnel Chart */}
        <div className="mt-8">
          {isLoadingFunnel ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : funnelData ? (
            <FunnelChart data={funnelData} />
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No funnel data available.
            </div>
          )}
        </div>
        
        {/* Job Performance */}
        <div className="mt-8">
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
