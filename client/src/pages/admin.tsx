import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import AppShell from "@/components/layout/app-shell";
import TopBar from "@/components/layout/top-bar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth } from "@/hooks/use-auth";
import { AreaChart, BarChart, ChevronDown, Database, Server, Activity, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { 
  Select, 
  SelectContent, 
  SelectGroup, 
  SelectItem, 
  SelectLabel, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";

export default function AdminPage() {
  const { user } = useAuth();
  const [timeRange, setTimeRange] = useState("7d");
  
  // Only admin should access this page
  const isAdmin = user?.role === 'admin';
  
  // Mock data for system metrics - in a real app these would come from API
  const systemData = {
    activeUsers: 8,
    apiRequests: 548,
    databaseSize: "42 MB",
    cacheHitRate: "89%",
    averageResponseTime: "124ms",
    errorRate: "0.3%",
    uptime: "99.98%",
    activeJobs: 12
  };
  
  // Mock data for recent errors - in a real app these would come from API
  const recentErrors = [
    {
      id: 1,
      timestamp: "2023-04-23T14:32:18Z",
      endpoint: "/api/candidates",
      error: "Database connection timeout",
      userId: 3,
      code: 500
    },
    {
      id: 2,
      timestamp: "2023-04-23T11:17:42Z",
      endpoint: "/api/jobs/5",
      error: "Resource not found",
      userId: 2,
      code: 404
    },
    {
      id: 3,
      timestamp: "2023-04-22T09:44:31Z",
      endpoint: "/api/interviews/create",
      error: "Validation error: scheduledDate is required",
      userId: 4,
      code: 400
    }
  ];
  
  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  if (!isAdmin) {
    return (
      <AppShell>
        <TopBar title="System Telemetry" />
        <div className="bg-slate-50 p-4 sm:p-6 lg:p-8">
          <div className="flex items-center justify-center min-h-[60vh] flex-col gap-4 text-center max-w-md mx-auto">
            <div className="rounded-full bg-destructive/10 p-6 w-24 h-24 flex items-center justify-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-12 w-12 text-destructive"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 15v2m0 0v2m0-2h2m-2 0H10m10-6H4a2 2 0 01-2-2V7a2 2 0 012-2h16a2 2 0 012 2v4a2 2 0 01-2 2z"
                />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-destructive">Access Denied</h1>
            <p className="text-muted-foreground mb-4">
              Only administrators can access the system telemetry.
            </p>
          </div>
        </div>
      </AppShell>
    );
  }
  
  return (
    <AppShell>
      <TopBar title="System Telemetry" />
      
      <div className="bg-slate-50 p-4 sm:p-6 lg:p-8">
        <div className="mb-6 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">System Telemetry</h1>
            <p className="text-sm text-slate-500 mt-1">
              Monitor system performance and activity
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select time range" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>Time Range</SelectLabel>
                  <SelectItem value="24h">Last 24 hours</SelectItem>
                  <SelectItem value="7d">Last 7 days</SelectItem>
                  <SelectItem value="30d">Last 30 days</SelectItem>
                  <SelectItem value="90d">Last 90 days</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
            
            <Button variant="outline" size="sm">
              <Activity className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>
        
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="errors">Error Logs</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between py-4">
                  <CardTitle className="text-sm font-medium">Active Users</CardTitle>
                  <Database className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent className="py-0">
                  <div className="text-2xl font-bold">{systemData.activeUsers}</div>
                  <p className="text-xs text-muted-foreground">
                    Currently logged in users
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between py-4">
                  <CardTitle className="text-sm font-medium">API Requests</CardTitle>
                  <Activity className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent className="py-0">
                  <div className="text-2xl font-bold">{systemData.apiRequests}</div>
                  <p className="text-xs text-muted-foreground">
                    Requests in the last 24 hours
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between py-4">
                  <CardTitle className="text-sm font-medium">Database Size</CardTitle>
                  <Server className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent className="py-0">
                  <div className="text-2xl font-bold">{systemData.databaseSize}</div>
                  <p className="text-xs text-muted-foreground">
                    Total storage used
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between py-4">
                  <CardTitle className="text-sm font-medium">Error Rate</CardTitle>
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                </CardHeader>
                <CardContent className="py-0">
                  <div className="text-2xl font-bold">{systemData.errorRate}</div>
                  <p className="text-xs text-muted-foreground">
                    API request failures
                  </p>
                </CardContent>
              </Card>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>System Performance</CardTitle>
                  <CardDescription>
                    Response times and system load
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px] flex items-center justify-center border-2 border-dashed border-slate-200 rounded-md">
                    <div className="text-center px-8">
                      <AreaChart className="h-10 w-10 text-slate-400 mx-auto mb-3" />
                      <p className="text-slate-500">Performance metrics chart will be displayed here</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>API Usage</CardTitle>
                  <CardDescription>
                    Requests by endpoint
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px] flex items-center justify-center border-2 border-dashed border-slate-200 rounded-md">
                    <div className="text-center px-8">
                      <BarChart className="h-10 w-10 text-slate-400 mx-auto mb-3" />
                      <p className="text-slate-500">API usage chart will be displayed here</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          <TabsContent value="errors">
            <Card>
              <CardHeader>
                <CardTitle>Recent Error Logs</CardTitle>
                <CardDescription>
                  System errors and warnings from the last 24 hours
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Timestamp</TableHead>
                      <TableHead>Endpoint</TableHead>
                      <TableHead>Error</TableHead>
                      <TableHead>Code</TableHead>
                      <TableHead>User ID</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentErrors.map((error) => (
                      <TableRow key={error.id}>
                        <TableCell>{formatDate(error.timestamp)}</TableCell>
                        <TableCell>
                          <code className="px-1 py-0.5 rounded bg-slate-100 text-slate-700 text-xs">
                            {error.endpoint}
                          </code>
                        </TableCell>
                        <TableCell className="font-medium text-red-600">{error.error}</TableCell>
                        <TableCell>
                          <span className="px-2 py-1 rounded-full text-xs bg-red-50 text-red-600">
                            {error.code}
                          </span>
                        </TableCell>
                        <TableCell>{error.userId}</TableCell>
                      </TableRow>
                    ))}
                    {recentErrors.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-slate-500">
                          No errors found in the selected time period
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="performance">
            <Card>
              <CardHeader>
                <CardTitle>Performance Metrics</CardTitle>
                <CardDescription>
                  Detailed performance data for system monitoring
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-white p-4 rounded-lg border shadow-sm">
                      <div className="text-sm font-medium text-slate-500 mb-1">Average Response Time</div>
                      <div className="text-2xl font-bold">{systemData.averageResponseTime}</div>
                    </div>
                    
                    <div className="bg-white p-4 rounded-lg border shadow-sm">
                      <div className="text-sm font-medium text-slate-500 mb-1">Cache Hit Rate</div>
                      <div className="text-2xl font-bold">{systemData.cacheHitRate}</div>
                    </div>
                    
                    <div className="bg-white p-4 rounded-lg border shadow-sm">
                      <div className="text-sm font-medium text-slate-500 mb-1">System Uptime</div>
                      <div className="text-2xl font-bold">{systemData.uptime}</div>
                    </div>
                    
                    <div className="bg-white p-4 rounded-lg border shadow-sm">
                      <div className="text-sm font-medium text-slate-500 mb-1">Active Jobs</div>
                      <div className="text-2xl font-bold">{systemData.activeJobs}</div>
                    </div>
                  </div>
                  
                  <div className="h-[400px] flex items-center justify-center border-2 border-dashed border-slate-200 rounded-md">
                    <div className="text-center px-8">
                      <Activity className="h-10 w-10 text-slate-400 mx-auto mb-3" />
                      <p className="text-slate-500">Detailed performance metrics will be displayed here</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
}