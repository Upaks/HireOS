import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/use-auth";
import { ProtectedRoute } from "@/lib/protected-route";

import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";
import Dashboard from "@/pages/dashboard";
import Jobs from "@/pages/jobs";
import CandidateScreener from "@/pages/candidate-screener";
import Interviews from "@/pages/interviews";
import InterviewGrading from "@/pages/interview-grading";
import CooReview from "@/pages/coo-review";
import Analytics from "@/pages/analytics";
import Settings from "@/pages/settings";
import AdminPage from "@/pages/admin";
import GHLSyncPage from "@/pages/GHLSyncPage";
import { ThemeProvider } from "next-themes";
import { UserRoles } from "@shared/schema";

function Router() {
  return (
    <Switch>
      {/* Dashboard is accessible to all authenticated users */}
      <ProtectedRoute path="/" component={Dashboard} />
      
      {/* Job Postings - accessible to all authenticated users */}
      <ProtectedRoute path="/jobs" component={Jobs} />
      
      {/* Candidate screening for HR and above */}
      <ProtectedRoute 
        path="/candidates" 
        component={CandidateScreener} 
        roles={[UserRoles.HIRING_MANAGER, UserRoles.PROJECT_MANAGER, UserRoles.COO, UserRoles.CEO, UserRoles.DIRECTOR, UserRoles.ADMIN]}
      />
      <ProtectedRoute 
        path="/candidate-screener" 
        component={CandidateScreener} 
        roles={[UserRoles.HIRING_MANAGER, UserRoles.PROJECT_MANAGER, UserRoles.COO, UserRoles.CEO, UserRoles.DIRECTOR, UserRoles.ADMIN]}
      />
      
      {/* Interviews page - accessible to all authenticated users */}
      <ProtectedRoute path="/interviews" component={Interviews} />
      
      {/* Interview grading for all authenticated users */}
      <ProtectedRoute path="/interviews/:id" component={InterviewGrading} />
      
      {/* Final reviews for COO, CEO, Director and Admin only */}
      <ProtectedRoute 
        path="/reviews" 
        component={CooReview} 
        roles={[UserRoles.COO, UserRoles.CEO, UserRoles.DIRECTOR, UserRoles.ADMIN]} 
      />
      
      {/* Analytics for Project Managers, COO, CEO, Director and Admin only */}
      <ProtectedRoute 
        path="/analytics" 
        component={Analytics}
        roles={[UserRoles.PROJECT_MANAGER, UserRoles.COO, UserRoles.CEO, UserRoles.DIRECTOR, UserRoles.ADMIN]}
      />
      
      {/* System Settings for COO, CEO, Director and Admin only */}
      <ProtectedRoute 
        path="/settings" 
        component={Settings}
        roles={[UserRoles.COO, UserRoles.CEO, UserRoles.DIRECTOR, UserRoles.ADMIN]}
      />
      
      {/* Admin Telemetry Page for admins only */}
      <ProtectedRoute 
        path="/admin" 
        component={AdminPage}
        roles={[UserRoles.ADMIN]}
      />
      
      {/* GHL Sync Page for COO, CEO, Director and Admin only */}
      <ProtectedRoute 
        path="/ghl-sync" 
        component={GHLSyncPage}
        roles={[UserRoles.COO, UserRoles.CEO, UserRoles.DIRECTOR, UserRoles.ADMIN]}
      />
      
      <Route path="/auth" component={AuthPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="light">
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
