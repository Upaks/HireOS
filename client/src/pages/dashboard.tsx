import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import AppShell from "@/components/layout/app-shell";
import TopBar from "@/components/layout/top-bar";
import StatCard from "@/components/dashboard/stat-card";
import JobPostingsTable from "@/components/jobs/job-postings-table";
import ActivityFeed from "@/components/dashboard/activity-feed";
import HiringIntakeForm from "@/components/jobs/hiring-intake-form";
import { DashboardStats, ActivityLog, Job } from "@/types";
import { 
  Briefcase, 
  Users, 
  Calendar, 
  CheckCircle,
  Loader2
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
        {/* Stats Overview */}
        {isLoadingStats ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
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
              iconColor="text-secondary"
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
        
        {/* Job Listings Section */}
        <div className="mt-8">
          <h2 className="text-lg leading-6 font-medium text-slate-900 mb-4">
            Active Job Postings
          </h2>
          <JobPostingsTable />
        </div>
        
        {/* Recent Activity */}
        <div className="mt-8">
          <h2 className="text-lg leading-6 font-medium text-slate-900 mb-4">
            Recent Activity
          </h2>
          <ActivityFeed 
            activities={dashboardData?.recentActivity || []} 
          />
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
