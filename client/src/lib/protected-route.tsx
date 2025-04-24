import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { Redirect, Route } from "wouter";

interface ProtectedRouteProps {
  path: string;
  component: () => React.JSX.Element;
  roles?: string[];
}

export function ProtectedRoute({
  path,
  component: Component,
  roles
}: ProtectedRouteProps) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <Route path={path}>
        <div className="flex items-center justify-center min-h-screen flex-col gap-4">
          <div className="relative w-16 h-16">
            <Loader2 className="absolute h-16 w-16 animate-spin text-primary/20" />
            <Loader2 className="absolute h-16 w-16 animate-spin text-primary animate-pulse" style={{ animationDelay: "0.25s" }} />
          </div>
          <p className="text-muted-foreground text-lg animate-pulse">Loading HireOS...</p>
        </div>
      </Route>
    );
  }

  if (!user) {
    return (
      <Route path={path}>
        <Redirect to="/auth" />
      </Route>
    );
  }

  // Check role access if roles are specified
  if (roles && roles.length > 0 && !roles.includes(user.role)) {
    return (
      <Route path={path}>
        <div className="flex items-center justify-center min-h-screen flex-col gap-4 p-4 max-w-md mx-auto text-center">
          <div className="rounded-full bg-destructive/10 p-6 w-24 h-24 flex items-center justify-center mx-auto mb-4">
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
            Your current role ({user.role}) does not have permission to access this feature.
          </p>
          <p className="text-sm text-muted-foreground mb-6">
            This feature requires one of the following roles: {roles.join(', ')}
          </p>
          <a 
            href="/"
            className="bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 transition-colors"
          >
            Return to Dashboard
          </a>
        </div>
      </Route>
    );
  }

  return <Route path={path} component={Component} />;
}
