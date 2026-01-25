import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useRoute, Redirect, Link } from "wouter";
import { Loader2, Eye, EyeOff, CheckCircle, XCircle, UserPlus, LogIn, Building2 } from "lucide-react";
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";

// Schema for new user registration
const newUserSchema = z.object({
  fullName: z.string().min(2, "Full name is required"),
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string().min(6, "Please confirm your password"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

// Schema for existing user sign-in
const existingUserSchema = z.object({
  password: z.string().min(1, "Password is required"),
});

type NewUserData = z.infer<typeof newUserSchema>;
type ExistingUserData = z.infer<typeof existingUserSchema>;

interface InvitationVerifyResponse {
  valid: boolean;
  email: string;
  role: string;
  accountId: number;
  accountName: string;
  userExists: boolean;
  existingUserName: string | null;
  message?: string;
}

export default function AcceptInvitePage() {
  const [, params] = useRoute("/invite/:token");
  const token = params?.token || "";
  const { toast } = useToast();
  const { user } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [success, setSuccess] = useState<{ type: "created" | "joined"; accountName?: string } | null>(null);

  // Verify the invitation token
  const { data: invitation, isLoading, error } = useQuery<InvitationVerifyResponse>({
    queryKey: [`/api/invitations/verify/${token}`],
    queryFn: async () => {
      const response = await fetch(`/api/invitations/verify/${token}`);
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Invalid invitation");
      }
      return response.json();
    },
    enabled: !!token,
    retry: false,
  });

  // Form for new users
  const newUserForm = useForm<NewUserData>({
    resolver: zodResolver(newUserSchema),
    defaultValues: {
      fullName: "",
      username: "",
      password: "",
      confirmPassword: "",
    },
  });

  // Form for existing users
  const existingUserForm = useForm<ExistingUserData>({
    resolver: zodResolver(existingUserSchema),
    defaultValues: {
      password: "",
    },
  });

  // Accept invitation as new user
  const acceptNewMutation = useMutation({
    mutationFn: async (data: NewUserData) => {
      const response = await apiRequest("POST", `/api/invitations/accept/${token}`, {
        fullName: data.fullName,
        username: data.username,
        password: data.password,
      });
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Account created!",
        description: "You can now log in with your credentials.",
      });
      setSuccess({ type: "created" });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Accept invitation as existing user
  const acceptExistingMutation = useMutation({
    mutationFn: async (data: ExistingUserData) => {
      const response = await apiRequest("POST", `/api/invitations/accept-existing/${token}`, {
        password: data.password,
      });
      return await response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Joined successfully!",
        description: `You've joined ${data.accountName || "the account"}.`,
      });
      setSuccess({ type: "joined", accountName: data.accountName });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onNewUserSubmit = (data: NewUserData) => {
    acceptNewMutation.mutate(data);
  };

  const onExistingUserSubmit = (data: ExistingUserData) => {
    acceptExistingMutation.mutate(data);
  };

  // If already logged in, redirect to dashboard
  if (user) {
    return <Redirect to="/" />;
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-white/70">Verifying invitation...</p>
        </div>
      </div>
    );
  }

  // Invalid/expired invitation
  if (error || !invitation?.valid) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-slate-800/50 border-slate-700 backdrop-blur-sm">
          <CardHeader className="text-center">
            <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <CardTitle className="text-white">Invalid Invitation</CardTitle>
            <CardDescription className="text-slate-400">
              {(error as Error)?.message || "This invitation link is invalid, expired, or has already been used."}
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Link href="/auth">
              <Button variant="outline" className="border-slate-600 text-white hover:bg-slate-700">
                Go to Login
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Success state
  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-slate-800/50 border-slate-700 backdrop-blur-sm">
          <CardHeader className="text-center">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <CardTitle className="text-white">
              {success.type === "created" ? "Welcome to HireOS!" : "Successfully Joined!"}
            </CardTitle>
            <CardDescription className="text-slate-400">
              {success.type === "created" 
                ? "Your account has been created. You can now log in with your credentials."
                : `You've joined ${success.accountName || "the account"}. Log in to switch to it.`
              }
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Link href="/auth">
              <Button className="bg-primary hover:bg-primary/90">
                Go to Login
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Background grid pattern component
  const BackgroundGrid = () => (
    <div 
      className="absolute inset-0 opacity-10"
      style={{
        backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                         linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
        backgroundSize: '50px 50px',
      }}
    />
  );

  // If user already exists - show sign-in flow
  if (invitation.userExists) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <BackgroundGrid />
        
        <Card className="w-full max-w-md bg-slate-800/50 border-slate-700 backdrop-blur-sm relative z-10">
          <CardHeader className="text-center pb-2">
            <div className="flex items-center justify-center gap-2 mb-4">
              <LogIn className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-2xl text-white">Join Account</CardTitle>
            <CardDescription className="text-slate-400">
              Sign in to join <span className="text-primary font-medium">{invitation.accountName}</span>
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            {/* Account info box */}
            <div className="mb-6 p-4 bg-slate-700/30 rounded-lg border border-slate-600">
              <div className="flex items-center gap-3 mb-2">
                <Building2 className="h-5 w-5 text-primary" />
                <span className="text-white font-medium">{invitation.accountName}</span>
              </div>
              <p className="text-sm text-slate-400">
                You'll join as: <span className="text-slate-300">{invitation.role}</span>
              </p>
            </div>

            {/* User info */}
            <div className="mb-4 p-3 bg-slate-700/50 rounded-lg">
              <p className="text-sm text-slate-400">Signing in as:</p>
              <p className="text-white font-medium">{invitation.existingUserName || invitation.email}</p>
              <p className="text-sm text-slate-500">{invitation.email}</p>
            </div>

            <Form {...existingUserForm}>
              <form onSubmit={existingUserForm.handleSubmit(onExistingUserSubmit)} className="space-y-4">
                <FormField
                  control={existingUserForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white">Password</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type={showPassword ? "text" : "password"}
                            placeholder="Enter your password"
                            {...field}
                            className="bg-slate-900/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-primary pr-10"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                          >
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <Button 
                  type="submit" 
                  className="w-full bg-primary hover:bg-primary/90"
                  disabled={acceptExistingMutation.isPending}
                >
                  {acceptExistingMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Joining...
                    </>
                  ) : (
                    "Sign In & Join"
                  )}
                </Button>
              </form>
            </Form>
            
            <div className="mt-6 text-center">
              <p className="text-sm text-slate-400">
                Not your account?{" "}
                <Link href="/auth" className="text-primary hover:underline">
                  Use a different account
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // New user - show registration form
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <BackgroundGrid />
      
      <Card className="w-full max-w-md bg-slate-800/50 border-slate-700 backdrop-blur-sm relative z-10">
        <CardHeader className="text-center pb-2">
          <div className="flex items-center justify-center gap-2 mb-4">
            <UserPlus className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl text-white">Join HireOS</CardTitle>
          <CardDescription className="text-slate-400">
            Create your account to join <span className="text-primary font-medium">{invitation.accountName}</span>
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          {/* Account info box */}
          <div className="mb-6 p-4 bg-slate-700/30 rounded-lg border border-slate-600">
            <div className="flex items-center gap-3 mb-2">
              <Building2 className="h-5 w-5 text-primary" />
              <span className="text-white font-medium">{invitation.accountName}</span>
            </div>
            <p className="text-sm text-slate-400">
              You'll join as: <span className="text-slate-300">{invitation.role}</span>
            </p>
          </div>

          {/* Email display */}
          <div className="mb-4 px-4 py-2 bg-slate-700/50 rounded-lg">
            <p className="text-sm text-slate-300">{invitation.email}</p>
          </div>

          <Form {...newUserForm}>
            <form onSubmit={newUserForm.handleSubmit(onNewUserSubmit)} className="space-y-4">
              <FormField
                control={newUserForm.control}
                name="fullName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white">Full Name</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="John Doe" 
                        {...field} 
                        className="bg-slate-900/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-primary"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={newUserForm.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white">Username</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="johndoe" 
                        {...field}
                        className="bg-slate-900/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-primary"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={newUserForm.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white">Password</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type={showPassword ? "text" : "password"}
                          placeholder="Create a password"
                          {...field}
                          className="bg-slate-900/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-primary pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={newUserForm.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white">Confirm Password</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type={showConfirmPassword ? "text" : "password"}
                          placeholder="Confirm your password"
                          {...field}
                          className="bg-slate-900/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-primary pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                        >
                          {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <Button 
                type="submit" 
                className="w-full bg-primary hover:bg-primary/90"
                disabled={acceptNewMutation.isPending}
              >
                {acceptNewMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating Account...
                  </>
                ) : (
                  "Create Account & Join"
                )}
              </Button>
            </form>
          </Form>
          
          <div className="mt-6 text-center">
            <p className="text-sm text-slate-400">
              Already have an account?{" "}
              <Link href="/auth" className="text-primary hover:underline">
                Log in
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
