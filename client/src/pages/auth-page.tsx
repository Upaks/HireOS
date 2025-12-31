import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/use-auth";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Redirect } from "wouter";
import { Loader2 } from "lucide-react";
import { useState } from "react";

const loginSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const registerSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  fullName: z.string().min(2, "Full name is required"),
  email: z.string().email("Invalid email address"),
});

export default function AuthPage() {
  const { user, loginMutation, registerMutation } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  
  const loginForm = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const registerForm = useForm<z.infer<typeof registerSchema>>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: "",
      password: "",
      fullName: "",
      email: "",
    },
  });

  const switchToRegister = () => {
    loginForm.reset();
    setIsRegister(true);
  };

  const switchToLogin = () => {
    registerForm.reset();
    setIsRegister(false);
  };

  const onLoginSubmit = (values: z.infer<typeof loginSchema>) => {
    loginMutation.mutate(values);
  };

  const onRegisterSubmit = (values: z.infer<typeof registerSchema>) => {
    registerMutation.mutate({
      ...values,
      role: "hiringManager" // Default role for new users
    });
  };

  // Redirect to dashboard if user is already logged in
  if (user) {
    return <Redirect to="/" />;
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <div className="flex-1 px-4 sm:px-6 lg:flex-none lg:px-20 xl:px-24 overflow-y-auto">
        <div className="w-full max-w-sm mx-auto lg:w-96 py-12">
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold text-primary">HireOS</h1>
            <p className="mt-2 text-sm text-gray-500">Automated Hiring Platform</p>
          </div>
          
          {!isRegister ? (
            <Card key="login">
              <CardHeader>
                <CardTitle>Welcome to HireOS</CardTitle>
                <CardDescription>
                  Sign in to your account
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...loginForm}>
                  <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4" key="login-form">
                    <FormField
                      control={loginForm.control}
                      name="username"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Username</FormLabel>
                          <FormControl>
                            <Input placeholder="username" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={loginForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Password</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="••••••" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <Button 
                      type="submit" 
                      className="w-full"
                      disabled={loginMutation.isPending}
                    >
                      {loginMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Logging in...
                        </>
                      ) : (
                        "Log in"
                      )}
                    </Button>
                  </form>
                </Form>
              </CardContent>
              <CardFooter className="flex flex-col space-y-2">
                <p className="text-sm text-center text-gray-600">
                  Don't have an account?{" "}
                  <button
                    type="button"
                    onClick={switchToRegister}
                    className="text-primary hover:underline font-medium"
                  >
                    Register here
                  </button>
                </p>
              </CardFooter>
            </Card>
          ) : (
            <Card key="register">
              <CardHeader>
                <CardTitle>Create an Account</CardTitle>
                <CardDescription>
                  Sign up to get started with HireOS
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...registerForm}>
                  <form onSubmit={registerForm.handleSubmit(onRegisterSubmit)} className="space-y-4" key="register-form">
                    <FormField
                      control={registerForm.control}
                      name="fullName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Full Name</FormLabel>
                          <FormControl>
                            <Input placeholder="John Doe" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={registerForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input type="email" placeholder="john@example.com" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={registerForm.control}
                      name="username"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Username</FormLabel>
                          <FormControl>
                            <Input placeholder="username" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={registerForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Password</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="••••••" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <Button 
                      type="submit" 
                      className="w-full"
                      disabled={registerMutation.isPending}
                    >
                      {registerMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Creating account...
                        </>
                      ) : (
                        "Create Account"
                      )}
                    </Button>
                  </form>
                </Form>
              </CardContent>
              <CardFooter className="flex flex-col space-y-2">
                <p className="text-sm text-center text-gray-600">
                  Already have an account?{" "}
                  <button
                    type="button"
                    onClick={switchToLogin}
                    className="text-primary hover:underline font-medium"
                  >
                    Sign in here
                  </button>
                </p>
              </CardFooter>
            </Card>
          )}
        </div>
      </div>
      
      <div className="relative flex-1 hidden w-0 lg:block bg-primary h-screen sticky top-0">
        <div className="absolute inset-0 flex items-center justify-center p-12 text-white h-full">
          <div className="max-w-2xl">
            <h2 className="text-4xl font-bold mb-6">Accelerate your hiring process</h2>
            <p className="text-xl mb-8">
              HireOS automates your entire candidate lifecycle from job intake to final offer.
            </p>
            <ul className="space-y-3 text-lg">
              <li className="flex items-center">
                <svg className="h-6 w-6 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Auto-generated job descriptions and assessments
              </li>
              <li className="flex items-center">
                <svg className="h-6 w-6 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Automated candidate screening and follow-ups
              </li>
              <li className="flex items-center">
                <svg className="h-6 w-6 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Structured interview process and evaluations
              </li>
              <li className="flex items-center">
                <svg className="h-6 w-6 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                One-click offer generation and delivery
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
