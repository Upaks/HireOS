import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/use-auth";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Redirect } from "wouter";
import { Loader2, Eye, EyeOff } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Turnstile } from "@/components/ui/turnstile";
import { useToast } from "@/hooks/use-toast";

const loginSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const registerSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string().min(6, "Please confirm your password"),
  fullName: z.string().min(2, "Full name is required"),
  email: z.string().email("Invalid email address"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

// Feature data for the animated right panel (Layer9 style)
const FEATURES = [
  {
    label: "Job Intake",
    description: "AI generates job descriptions, requirements, and assessments automatically from minimal input.",
  },
  {
    label: "Candidate Screening",
    description: "Smart filtering and scoring to surface the best candidates from your applicant pool.",
  },
  {
    label: "Interview Scheduling",
    description: "Automated coordination with calendar integration and candidate communication.",
  },
  {
    label: "Offer Management",
    description: "One-click offer generation with templates, and approvals",
  },
];

export default function AuthPage() {
  const { user, loginMutation, registerMutation } = useAuth();
  const { toast } = useToast();
  const [isRegister, setIsRegister] = useState(false);
  const [activeFeature, setActiveFeature] = useState(0);
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // CAPTCHA token state
  const [loginCaptchaToken, setLoginCaptchaToken] = useState<string | null>(null);
  const [registerCaptchaToken, setRegisterCaptchaToken] = useState<string | null>(null);
  
  // CAPTCHA handlers
  const handleLoginCaptchaVerify = useCallback((token: string) => {
    setLoginCaptchaToken(token);
  }, []);
  
  const handleRegisterCaptchaVerify = useCallback((token: string) => {
    setRegisterCaptchaToken(token);
  }, []);
  
  const handleCaptchaError = useCallback(() => {
    toast({
      title: "CAPTCHA Error",
      description: "Failed to load CAPTCHA. Please refresh the page.",
      variant: "destructive",
    });
  }, [toast]);
  
  const handleCaptchaExpire = useCallback(() => {
    setLoginCaptchaToken(null);
    setRegisterCaptchaToken(null);
  }, []);
  
  // Auto-cycle through features
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveFeature((prev) => (prev + 1) % FEATURES.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);
  
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
      confirmPassword: "",
      fullName: "",
      email: "",
    },
  });

  const switchToRegister = () => {
    loginForm.reset();
    setLoginCaptchaToken(null);
    setIsRegister(true);
  };

  const switchToLogin = () => {
    registerForm.reset();
    setRegisterCaptchaToken(null);
    setIsRegister(false);
  };

  const onLoginSubmit = (values: z.infer<typeof loginSchema>) => {
    if (!loginCaptchaToken) {
      toast({
        title: "CAPTCHA Required",
        description: "Please complete the CAPTCHA verification.",
        variant: "destructive",
      });
      return;
    }
    loginMutation.mutate({
      ...values,
      captchaToken: loginCaptchaToken,
    });
  };

  const onRegisterSubmit = (values: z.infer<typeof registerSchema>) => {
    if (!registerCaptchaToken) {
      toast({
        title: "CAPTCHA Required",
        description: "Please complete the CAPTCHA verification.",
        variant: "destructive",
      });
      return;
    }
    registerMutation.mutate({
      ...values,
      role: "hiringManager", // Default role for new users
      captchaToken: registerCaptchaToken,
    });
  };

  // Redirect to dashboard if user is already logged in
  if (user) {
    return <Redirect to="/dashboard" />;
  }

  return (
    <div className="relative flex h-screen bg-[#0a0a0b] overflow-hidden">
      {/* Animated gradient background */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,.03)_1px,transparent_0)] [background-size:48px_48px]" />
        <motion.div
          animate={{
            background: [
              "radial-gradient(circle at 20% 30%, rgba(59,130,246,0.15) 0%, transparent 50%)",
              "radial-gradient(circle at 80% 70%, rgba(16,185,129,0.15) 0%, transparent 50%)",
              "radial-gradient(circle at 20% 30%, rgba(59,130,246,0.15) 0%, transparent 50%)",
            ],
          }}
          transition={{ duration: 8, repeat: Infinity }}
          className="absolute inset-0"
        />
      </div>
      
      <div className="relative z-10 flex-1 px-4 sm:px-6 lg:flex-none lg:px-20 xl:px-24 overflow-y-auto">
        <div className="w-full max-w-sm mx-auto lg:w-96 py-12">
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent">HireOS</h1>
            <p className="mt-2 text-sm text-zinc-500">Automated Hiring Platform</p>
          </div>
          
          {!isRegister ? (
            <Card key="login" className="bg-zinc-900/50 border-white/10 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-white">Welcome to HireOS</CardTitle>
                <CardDescription className="text-zinc-400">
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
                          <FormLabel className="text-zinc-300">Username</FormLabel>
                          <FormControl>
                            <Input placeholder="username" {...field} className="bg-zinc-800/50 border-white/10 text-white placeholder:text-zinc-500 focus:border-[hsl(var(--primary))]/50" />
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
                          <FormLabel className="text-zinc-300">Password</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input 
                                type={showLoginPassword ? "text" : "password"} 
                                placeholder="••••••" 
                                {...field} 
                                className="bg-zinc-800/50 border-white/10 text-white placeholder:text-zinc-500 focus:border-[hsl(var(--primary))]/50 pr-10" 
                              />
                              <button
                                type="button"
                                onClick={() => setShowLoginPassword(!showLoginPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-300 transition-colors"
                              >
                                {showLoginPassword ? (
                                  <EyeOff className="h-4 w-4" />
                                ) : (
                                  <Eye className="h-4 w-4" />
                                )}
                              </button>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    {/* CAPTCHA Widget */}
                    <div className="flex justify-center">
                      <Turnstile
                        onVerify={handleLoginCaptchaVerify}
                        onError={handleCaptchaError}
                        onExpire={handleCaptchaExpire}
                        theme="dark"
                      />
                    </div>
                    
                    <Button 
                      type="submit" 
                      className="w-full bg-[hsl(var(--primary))] hover:bg-[hsl(var(--primary))]/90 text-white"
                      disabled={loginMutation.isPending || !loginCaptchaToken}
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
                <p className="text-sm text-center text-zinc-400">
                  Don't have an account?{" "}
                  <button
                    type="button"
                    onClick={switchToRegister}
                    className="text-[hsl(var(--primary))] hover:underline font-medium"
                  >
                    Register here
                  </button>
                </p>
              </CardFooter>
            </Card>
          ) : (
            <Card key="register" className="bg-zinc-900/50 border-white/10 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-white">Create an Account</CardTitle>
                <CardDescription className="text-zinc-400">
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
                          <FormLabel className="text-zinc-300">Full Name</FormLabel>
                          <FormControl>
                            <Input placeholder="John Doe" {...field} className="bg-zinc-800/50 border-white/10 text-white placeholder:text-zinc-500 focus:border-[hsl(var(--primary))]/50" />
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
                          <FormLabel className="text-zinc-300">Email</FormLabel>
                          <FormControl>
                            <Input type="email" placeholder="john@example.com" {...field} className="bg-zinc-800/50 border-white/10 text-white placeholder:text-zinc-500 focus:border-[hsl(var(--primary))]/50" />
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
                          <FormLabel className="text-zinc-300">Username</FormLabel>
                          <FormControl>
                            <Input placeholder="username" {...field} className="bg-zinc-800/50 border-white/10 text-white placeholder:text-zinc-500 focus:border-[hsl(var(--primary))]/50" />
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
                          <FormLabel className="text-zinc-300">Password</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input 
                                type={showRegisterPassword ? "text" : "password"} 
                                placeholder="••••••" 
                                {...field} 
                                className="bg-zinc-800/50 border-white/10 text-white placeholder:text-zinc-500 focus:border-[hsl(var(--primary))]/50 pr-10" 
                              />
                              <button
                                type="button"
                                onClick={() => setShowRegisterPassword(!showRegisterPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-300 transition-colors"
                              >
                                {showRegisterPassword ? (
                                  <EyeOff className="h-4 w-4" />
                                ) : (
                                  <Eye className="h-4 w-4" />
                                )}
                              </button>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={registerForm.control}
                      name="confirmPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-zinc-300">Confirm Password</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input 
                                type={showConfirmPassword ? "text" : "password"} 
                                placeholder="••••••" 
                                {...field} 
                                className="bg-zinc-800/50 border-white/10 text-white placeholder:text-zinc-500 focus:border-[hsl(var(--primary))]/50 pr-10" 
                              />
                              <button
                                type="button"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-300 transition-colors"
                              >
                                {showConfirmPassword ? (
                                  <EyeOff className="h-4 w-4" />
                                ) : (
                                  <Eye className="h-4 w-4" />
                                )}
                              </button>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    {/* CAPTCHA Widget */}
                    <div className="flex justify-center">
                      <Turnstile
                        onVerify={handleRegisterCaptchaVerify}
                        onError={handleCaptchaError}
                        onExpire={handleCaptchaExpire}
                        theme="dark"
                      />
                    </div>
                    
                    <Button 
                      type="submit" 
                      className="w-full bg-[hsl(var(--primary))] hover:bg-[hsl(var(--primary))]/90 text-white"
                      disabled={registerMutation.isPending || !registerCaptchaToken}
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
                <p className="text-sm text-center text-zinc-400">
                  Already have an account?{" "}
                  <button
                    type="button"
                    onClick={switchToLogin}
                    className="text-[hsl(var(--primary))] hover:underline font-medium"
                  >
                    Sign in here
                  </button>
                </p>
              </CardFooter>
            </Card>
          )}
        </div>
      </div>
      
      <div className="relative z-10 flex-1 hidden w-0 lg:block bg-gradient-to-br from-zinc-900/80 to-[#0a0a0b]/80 backdrop-blur-sm h-screen sticky top-0 border-l border-white/5">
        <div className="absolute inset-0 flex items-center p-12 h-full">
          <div className="w-full grid grid-cols-[140px_1fr] gap-6 items-center">
            {/* Left side - Feature menu (not clickable) */}
            <div className="space-y-1">
              {FEATURES.map((feature, index) => (
                <div
                  key={feature.label}
                  className={`flex items-center gap-2 py-1.5 transition-all duration-300 ${
                    activeFeature === index 
                      ? "text-white" 
                      : "text-zinc-600"
                  }`}
                >
                  {/* Active indicator arrow */}
                  <motion.span
                    animate={{ 
                      opacity: activeFeature === index ? 1 : 0,
                      x: activeFeature === index ? 0 : -8
                    }}
                    className="text-[hsl(var(--primary))] text-xs"
                  >
                    ▶
                  </motion.span>
                  <span className="text-sm whitespace-nowrap">{feature.label}</span>
                </div>
              ))}
            </div>
            
            {/* Right side - Animated content */}
            <div className="relative h-80">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeFeature}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.4 }}
                  className="absolute inset-0 flex flex-col justify-center items-center"
                >
                  {/* Feature-specific visuals */}
                  <div className="relative w-72 h-44 mb-6">
                    {/* Job Intake - Form/Document */}
                    {activeFeature === 0 && (
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="w-full h-full rounded-xl border border-blue-500/30 bg-gradient-to-br from-zinc-900 to-zinc-950 p-4 shadow-[0_0_40px_rgba(59,130,246,0.15)]"
                      >
                        <div className="flex items-center gap-2 mb-3">
                          <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
                            <svg className="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          </div>
                          <div className="text-xs text-white/80">New Job Posting</div>
                        </div>
                        <div className="space-y-2">
                          <div className="h-2 rounded bg-white/10 w-full" />
                          <div className="h-2 rounded bg-white/10 w-3/4" />
                          <div className="flex gap-2 mt-3">
                            <div className="h-6 rounded bg-blue-500/30 w-20 flex items-center justify-center">
                              <span className="text-[10px] text-blue-300">Remote</span>
                            </div>
                            <div className="h-6 rounded bg-emerald-500/30 w-20 flex items-center justify-center">
                              <span className="text-[10px] text-emerald-300">Full-time</span>
                            </div>
                          </div>
                          <div className="h-2 rounded bg-white/5 w-full mt-2" />
                          <div className="h-2 rounded bg-white/5 w-5/6" />
                        </div>
                      </motion.div>
                    )}
                    
                    {/* Candidate Screening - Profile cards */}
                    {activeFeature === 1 && (
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="w-full h-full relative"
                      >
                        {[0, 1, 2].map((i) => (
                          <motion.div
                            key={i}
                            initial={{ x: 50, opacity: 0 }}
                            animate={{ x: i * 20, opacity: 1 - i * 0.2 }}
                            transition={{ delay: i * 0.1 }}
                            className="absolute top-0 right-0 w-56 h-36 rounded-xl border border-emerald-500/30 bg-gradient-to-br from-zinc-900 to-zinc-950 p-3 shadow-[0_0_30px_rgba(16,185,129,0.1)]"
                            style={{ zIndex: 3 - i }}
                          >
                            <div className="flex items-center gap-3 mb-2">
                              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400/30 to-blue-400/30 flex items-center justify-center">
                                <span className="text-white text-sm font-medium">JD</span>
                              </div>
                              <div>
                                <div className="text-xs text-white">John Doe</div>
                                <div className="text-[10px] text-zinc-500">Sr. Engineer</div>
                              </div>
                              <div className="ml-auto text-emerald-400 text-xs font-bold">94%</div>
                            </div>
                            <div className="space-y-1.5">
                              <div className="flex items-center gap-2">
                                <div className="w-full h-1.5 rounded-full bg-zinc-800">
                                  <div className="h-full rounded-full bg-emerald-400" style={{ width: '94%' }} />
                                </div>
                              </div>
                              <div className="flex gap-1 flex-wrap">
                                <span className="px-1.5 py-0.5 rounded bg-zinc-800 text-[8px] text-zinc-400">React</span>
                                <span className="px-1.5 py-0.5 rounded bg-zinc-800 text-[8px] text-zinc-400">Node.js</span>
                                <span className="px-1.5 py-0.5 rounded bg-zinc-800 text-[8px] text-zinc-400">AWS</span>
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </motion.div>
                    )}
                    
                    {/* Interview Scheduling - Calendar */}
                    {activeFeature === 2 && (
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="w-full h-full rounded-xl border border-purple-500/30 bg-gradient-to-br from-zinc-900 to-zinc-950 p-3 shadow-[0_0_40px_rgba(147,51,234,0.15)]"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="text-xs text-white/80">January 2026</div>
                          <div className="flex gap-1">
                            <div className="w-5 h-5 rounded bg-zinc-800 flex items-center justify-center text-[10px] text-zinc-400">◀</div>
                            <div className="w-5 h-5 rounded bg-zinc-800 flex items-center justify-center text-[10px] text-zinc-400">▶</div>
                          </div>
                        </div>
                        <div className="grid grid-cols-7 gap-1 text-[8px] text-zinc-500 mb-1">
                          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                            <div key={i} className="text-center">{d}</div>
                          ))}
                        </div>
                        <div className="grid grid-cols-7 gap-1">
                          {[...Array(31)].map((_, i) => (
                            <div 
                              key={i} 
                              className={`h-5 rounded text-[9px] flex items-center justify-center ${
                                i === 22 ? 'bg-purple-500/40 text-purple-300 ring-1 ring-purple-400' :
                                i === 24 ? 'bg-emerald-500/30 text-emerald-300' :
                                i === 27 ? 'bg-blue-500/30 text-blue-300' :
                                'text-zinc-500 hover:bg-zinc-800'
                              }`}
                            >
                              {i + 1}
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                    
                    {/* Offer Management - Document with signature */}
                    {activeFeature === 3 && (
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="w-full h-full rounded-xl border border-amber-500/30 bg-gradient-to-br from-zinc-900 to-zinc-950 p-4 shadow-[0_0_40px_rgba(245,158,11,0.15)]"
                      >
                        <div className="flex items-center gap-2 mb-3">
                          <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
                            <svg className="w-4 h-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </div>
                          <div className="text-xs text-white/80">Offer Letter</div>
                          <div className="ml-auto px-2 py-0.5 rounded bg-emerald-500/20 text-[9px] text-emerald-400">Ready to send</div>
                        </div>
                        <div className="space-y-1.5">
                          <div className="h-1.5 rounded bg-white/10 w-full" />
                          <div className="h-1.5 rounded bg-white/10 w-4/5" />
                          <div className="h-1.5 rounded bg-white/10 w-full" />
                        </div>
                        <div className="mt-3 pt-3 border-t border-white/5">
                          <div className="flex items-center justify-between">
                            <div className="text-[10px] text-zinc-500">Salary</div>
                            <div className="text-xs text-white font-medium">$145,000</div>
                          </div>
                          <div className="flex items-center justify-between mt-1">
                            <div className="text-[10px] text-zinc-500">Start Date</div>
                            <div className="text-xs text-white">Feb 1, 2026</div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </div>
                  
                  {/* Feature description */}
                  <div className="text-center px-4">
                    <h3 className="text-lg font-bold text-white mb-1">
                      {FEATURES[activeFeature].label}
                    </h3>
                    <p className="text-zinc-400 text-xs leading-relaxed max-w-xs">
                      {FEATURES[activeFeature].description}
                    </p>
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
