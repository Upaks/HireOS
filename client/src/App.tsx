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
import CandidateScreener from "@/pages/candidate-screener";
import InterviewGrading from "@/pages/interview-grading";
import CooReview from "@/pages/coo-review";
import Analytics from "@/pages/analytics";
import { ThemeProvider } from "next-themes";
import { UserRoles } from "@shared/schema";

function Router() {
  return (
    <Switch>
      {/* Dashboard is accessible to all authenticated users */}
      <ProtectedRoute path="/" component={Dashboard} />
      
      {/* Candidate screening for HR and above */}
      <ProtectedRoute 
        path="/candidates" 
        component={CandidateScreener} 
        roles={[UserRoles.HIRING_MANAGER, UserRoles.PROJECT_MANAGER, UserRoles.COO, UserRoles.ADMIN]}
      />
      
      {/* Interview grading for all authenticated users */}
      <ProtectedRoute 
        path="/interviews/:id" 
        component={InterviewGrading}
      />
      
      {/* Final reviews for COO and Admin only */}
      <ProtectedRoute 
        path="/reviews" 
        component={CooReview} 
        roles={[UserRoles.COO, UserRoles.ADMIN]} 
      />
      
      {/* Analytics for Project Managers, COO and Admin only */}
      <ProtectedRoute 
        path="/analytics" 
        component={Analytics}
        roles={[UserRoles.PROJECT_MANAGER, UserRoles.COO, UserRoles.ADMIN]}
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
