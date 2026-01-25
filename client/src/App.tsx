import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/use-auth";
import { ProtectedRoute } from "@/lib/protected-route";

import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";
import LandingPage from "@/pages/landing";
import Dashboard from "@/pages/dashboard";
import Jobs from "@/pages/jobs";
import CandidateScreener from "@/pages/candidate-screener";
import Interviews from "@/pages/interviews";
import InterviewGrading from "@/pages/interview-grading";
import CooReview from "@/pages/coo-review";
import Analytics from "@/pages/analytics";
import Settings from "@/pages/settings";
import AdminPage from "@/pages/admin";
import CRMSyncPage from "@/pages/crm-sync";
import Forms from "@/pages/forms";
import ApplyPage from "@/pages/apply";
import AcceptOfferPage from "@/pages/accept-offer";
import BookPage from "@/pages/book";
import Integrations from "@/pages/integrations";
import Notifications from "@/pages/notifications";
import Workflows from "@/pages/workflows";
import WorkflowBuilderPage from "@/pages/workflow-builder";
import { ThemeProvider } from "next-themes";
import { UserRoles } from "@shared/schema";

function Router() {
  return (
    <Switch>
      {/* Public landing – logged-in users redirect to /dashboard from within LandingPage */}
      <Route path="/" component={LandingPage} />
      
      {/* Dashboard is accessible to all authenticated users */}
      <ProtectedRoute path="/dashboard" component={Dashboard} />
      
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
      
      {/* Forms page - accessible to all authenticated users */}
      <ProtectedRoute 
        path="/forms" 
        component={Forms}
        roles={[UserRoles.HIRING_MANAGER, UserRoles.PROJECT_MANAGER, UserRoles.COO, UserRoles.CEO, UserRoles.DIRECTOR, UserRoles.ADMIN]}
      />
      
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
      
      {/* CRM Sync Page for COO, CEO, Director and Admin only */}
      <ProtectedRoute 
        path="/crm-sync" 
        component={CRMSyncPage}
        roles={[UserRoles.COO, UserRoles.CEO, UserRoles.DIRECTOR, UserRoles.ADMIN]}
      />
      
      {/* Integrations page - accessible to all authenticated users */}
      <ProtectedRoute 
        path="/integrations" 
        component={Integrations}
      />
      
      {/* Notifications page - accessible to all authenticated users */}
      <ProtectedRoute 
        path="/notifications" 
        component={Notifications}
      />
      
      {/* Workflows page - accessible to all authenticated users */}
      <ProtectedRoute 
        path="/workflows" 
        component={Workflows}
      />
      
      {/* Workflow Builder - full page */}
      <ProtectedRoute 
        path="/workflows/new" 
        component={WorkflowBuilderPage}
      />
      <ProtectedRoute 
        path="/workflows/:id/edit" 
        component={WorkflowBuilderPage}
      />
      
      {/* Public routes - no authentication required */}
      <Route path="/auth" component={AuthPage} />
      <Route path="/apply/:jobId" component={ApplyPage} />
      <Route path="/accept-offer/:token" component={AcceptOfferPage} />
      <Route path="/book/:userId" component={BookPage} />
      
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
