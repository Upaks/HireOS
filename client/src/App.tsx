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
      <ProtectedRoute path="/" component={Dashboard} />
      <ProtectedRoute path="/candidates" component={CandidateScreener} />
      <ProtectedRoute path="/interviews/:id" component={InterviewGrading} />
      <ProtectedRoute 
        path="/reviews" 
        component={CooReview} 
        roles={[UserRoles.COO, UserRoles.ADMIN]} 
      />
      <ProtectedRoute path="/analytics" component={Analytics} />
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
