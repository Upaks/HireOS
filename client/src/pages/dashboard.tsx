import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import AppShell from "@/components/layout/app-shell";
import TopBar from "@/components/layout/top-bar";
import StatCard from "@/components/dashboard/stat-card";
import ActivityFeed from "@/components/dashboard/activity-feed";
import NeedsAttention from "@/components/dashboard/needs-attention";
import TodaysSchedule from "@/components/dashboard/todays-schedule";
import HiringIntakeForm from "@/components/jobs/hiring-intake-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DashboardStats, ActivityLog } from "@/types";
import { 
  Briefcase, 
  Users, 
  Calendar, 
  CheckCircle,
  Loader2,
  Activity
} from "lucide-react";

export default function Dashboard() {
  const [hiringFormOpen, setHiringFormOpen] = useState(false);
  
  const { data: dashboardData, isLoading: isLoadingStats } = useQuery<{
    stats: DashboardStats;
    recentActivity: ActivityLog[];
  }>({
    queryKey: ['/api/analytics/dashboard'],
    queryFn: async () => {
    const res = await fetch('/api/analytics/dashboard', { cache: "no-store" });
      if (!res.ok) throw new Error('Failed to fetch dashboard data');
      return res.json();
    },
    staleTime: 0,
    refetchOnWindowFocus: true,
    refetchInterval: 3000,
  });

  // Handle new hiring request button click
  const handleNewHiring = () => {
    setHiringFormOpen(true);
  };
  
  return (
    <AppShell>
      <TopBar 
        title="Dashboard" 
        onNewHiring={handleNewHiring} 
      />
      
      <div className="bg-slate-50 p-4 sm:p-6 lg:p-8">
        {/* 2x2 Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* CELL 1: Quick Stats (Top Left) */}
          <Card className="h-fit">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Quick Stats</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingStats ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <StatCard
                    title="Active Jobs"
                    value={dashboardData?.stats.activeJobs ?? 0}
                    icon={<Briefcase />}
                    linkText="View all jobs"
                    linkHref="/jobs"
                  />
                  
                  <StatCard
                    title="Total Candidates"
                    value={dashboardData?.stats.totalCandidates ?? 0}
                    icon={<Users />}
                    linkText="View all candidates"
                    linkHref="/candidates"
                    iconColor="text-indigo-600"
                    iconBgColor="bg-indigo-50"
                  />
                  
                  <StatCard
                    title="Scheduled Interviews"
                    value={dashboardData?.stats.scheduledInterviews ?? 0}
                    icon={<Calendar />}
                    linkText="See schedule"
                    linkHref="/interviews"
                    iconColor="text-warning"
                    iconBgColor="bg-amber-50"
                  />
                  
                  <StatCard
                    title="Offers Sent"
                    value={dashboardData?.stats.offersSent ?? 0}
                    icon={<CheckCircle />}
                    linkText="View offers"
                    linkHref="/reviews"
                    iconColor="text-success"
                    iconBgColor="bg-green-50"
                  />
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* CELL 2: Needs Attention (Top Right) */}
          <NeedsAttention />
          
          {/* CELL 3: Today's Schedule (Bottom Left) */}
          <TodaysSchedule />
          
          {/* CELL 4: Recent Activity (Bottom Right) */}
          <Card className="h-fit">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base font-semibold">
                <Activity className="h-5 w-5 text-slate-500" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="max-h-[400px] overflow-y-auto">
                <ActivityFeed 
                  activities={dashboardData?.recentActivity || []} 
                />
              </div>
            </CardContent>
          </Card>
          
        </div>
      </div>
      
      {/* Hiring Intake Form Modal */}
      <HiringIntakeForm 
        open={hiringFormOpen} 
        onOpenChange={setHiringFormOpen} 
      />
    </AppShell>
  );
}
