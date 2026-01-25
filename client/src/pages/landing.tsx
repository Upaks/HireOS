import { createContext, useContext, useEffect, useRef, useState } from "react";
import { Link, Redirect, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { motion, useInView, useScroll, useTransform } from "framer-motion";
import { Button } from "@/components/ui/button";
import StackedLayers3D from "@/components/StackedLayers3D";
import {
  Zap,
  GitBranch,
  Plug,
  BarChart3,
  ArrowRight,
  Check,
  Users,
  FileSearch,
  Calendar,
  Shield,
  Sparkles,
  Menu,
  X,
  TrendingUp,
  Clock,
  Target,
  Workflow,
  Brain,
  Layers,
  Play,
  Pause,
} from "lucide-react";
import { cn } from "@/lib/utils";

const LandingScrollContext = createContext<React.RefObject<HTMLDivElement | null> | null>(null);

function Section({
  children,
  className,
  id,
}: {
  children: React.ReactNode;
  className?: string;
  id?: string;
}) {
  const ref = useRef<HTMLElement>(null);
  const scrollRoot = useContext(LandingScrollContext);
  const inView = useInView(ref, {
    once: true,
    margin: "-100px",
    ...(scrollRoot ? { root: scrollRoot as React.RefObject<Element> } : {}),
  });
  return (
    <section
      id={id}
      ref={ref}
      className={cn("relative py-20 md:py-28 lg:py-36 scroll-mt-24", className)}
    >
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10"
      >
        {children}
      </motion.div>
    </section>
  );
}

// Dashboard Mockup Component
function DashboardMockup() {
  return (
    <div className="relative w-full max-w-5xl mx-auto">
      <div className="relative rounded-2xl border border-white/10 bg-gradient-to-br from-zinc-900/50 to-zinc-950/80 backdrop-blur-xl shadow-2xl overflow-hidden">
        {/* Browser chrome */}
        <div className="flex items-center gap-2 px-4 py-3 bg-zinc-900/80 border-b border-white/5">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500/60" />
            <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
            <div className="w-3 h-3 rounded-full bg-green-500/60" />
          </div>
          <div className="flex-1 mx-4 h-7 rounded bg-zinc-800/50 border border-white/5" />
        </div>
        
        {/* Dashboard content */}
        <div className="p-6 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-semibold text-white">Dashboard</h3>
              <p className="text-sm text-zinc-400">Welcome back, Sarah</p>
            </div>
            <div className="flex gap-2">
              <div className="px-3 py-1.5 rounded-lg bg-[hsl(var(--primary))]/20 border border-[hsl(var(--primary))]/30 text-[hsl(var(--primary))] text-sm font-medium">
                12 Active Jobs
              </div>
            </div>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-4 gap-4">
            {[
              { label: "Candidates", value: "247", change: "+12%", icon: Users },
              { label: "Interviews", value: "18", change: "+5", icon: Calendar },
              { label: "Offers", value: "8", change: "+3", icon: Check },
              { label: "Time Saved", value: "42h", change: "This week", icon: Clock },
            ].map((stat, i) => (
              <div
                key={stat.label}
                className="rounded-xl bg-white/5 border border-white/10 p-4 backdrop-blur-sm"
              >
                <div className="flex items-center justify-between mb-2">
                  <stat.icon className="h-4 w-4 text-[hsl(var(--primary))]" />
                  <span className="text-xs text-emerald-400">{stat.change}</span>
                </div>
                <div className="text-2xl font-bold text-white">{stat.value}</div>
                <div className="text-xs text-zinc-400 mt-1">{stat.label}</div>
              </div>
            ))}
          </div>

          {/* Main content area */}
          <div className="grid grid-cols-3 gap-4">
            {/* Job pipeline */}
            <div className="col-span-2 rounded-xl bg-white/5 border border-white/10 p-4">
              <h4 className="text-sm font-semibold text-white mb-4">Active Pipeline</h4>
              <div className="space-y-3">
                {["Senior Engineer", "Product Manager", "Design Lead"].map((job, i) => (
                  <div
                    key={job}
                    className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/5"
                  >
                    <div>
                      <div className="text-sm font-medium text-white">{job}</div>
                      <div className="text-xs text-zinc-400 mt-0.5">
                        {[8, 12, 5][i]} candidates • {[3, 5, 2][i]} interviews
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-emerald-400" />
                      <span className="text-xs text-zinc-400">Active</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent activity */}
            <div className="rounded-xl bg-white/5 border border-white/10 p-4">
              <h4 className="text-sm font-semibold text-white mb-4">Recent Activity</h4>
              <div className="space-y-3">
                {[
                  "New candidate applied",
                  "Interview scheduled",
                  "Offer sent",
                ].map((activity, i) => (
                  <div key={i} className="text-xs text-zinc-400 flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-[hsl(var(--primary))]" />
                    {activity}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Glow effect */}
      <div className="absolute -inset-1 bg-gradient-to-r from-[hsl(var(--primary))]/20 via-emerald-500/20 to-[hsl(var(--primary))]/20 rounded-2xl blur-2xl opacity-50 -z-10" />
    </div>
  );
}

// Feature Showcase Component
function FeatureShowcase({
  title,
  description,
  visual,
  reverse = false,
}: {
  title: string;
  description: string;
  visual: React.ReactNode;
  reverse?: boolean;
}) {
  return (
    <div className={cn("grid lg:grid-cols-2 gap-12 lg:gap-16 items-center", reverse && "lg:grid-flow-dense")}>
      <motion.div
        initial={{ opacity: 0, x: reverse ? 40 : -40 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.6 }}
        className={cn(reverse && "lg:col-start-2")}
      >
        <div className="space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[hsl(var(--primary))]/10 border border-[hsl(var(--primary))]/20 text-[hsl(var(--primary))] text-sm font-medium">
            <Sparkles className="h-4 w-4" />
            Feature
          </div>
          <h3 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight text-white leading-tight">
            {title}
          </h3>
          <p className="text-lg text-zinc-400 leading-relaxed max-w-xl">
            {description}
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            {["90% faster", "Zero manual work", "AI-powered"].slice(0, 2).map((tag) => (
              <span
                key={tag}
                className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-sm text-zinc-300"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      </motion.div>
      <motion.div
        initial={{ opacity: 0, x: reverse ? -40 : 40 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className={cn(reverse && "lg:col-start-1")}
      >
        {visual}
      </motion.div>
    </div>
  );
}

const FEATURES = [
  {
    icon: Brain,
    title: "AI Matching & Screening",
    description:
      "Rank candidates, parse resumes, and automate follow-ups. Cut screening time by up to 90%.",
    visual: (
      <div className="relative w-full">
        {/* Mock UI Interface */}
        <div className="rounded-2xl border border-white/10 bg-zinc-900/50 backdrop-blur-sm overflow-hidden shadow-2xl">
          {/* Browser/App Header */}
          <div className="flex items-center gap-2 px-4 py-3 bg-zinc-800/50 border-b border-white/5">
            <div className="flex gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
              <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/60" />
              <div className="w-2.5 h-2.5 rounded-full bg-green-500/60" />
            </div>
            <div className="flex-1 mx-3 h-6 rounded bg-zinc-800/70 border border-white/5" />
          </div>
          
          {/* Content Area */}
          <div className="p-6 space-y-6 bg-gradient-to-br from-zinc-900 to-zinc-950">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-white mb-1">AI Candidate Matching</h3>
                <p className="text-sm text-zinc-400">Analyzing candidate profile...</p>
              </div>
              <div className="px-3 py-1.5 rounded-lg bg-emerald-500/20 border border-emerald-500/30">
                <span className="text-sm font-semibold text-emerald-400">94% Match</span>
              </div>
            </div>
            
            {/* Match Score Bar */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-zinc-400">Overall Match Score</span>
                <span className="text-emerald-400 font-semibold">94%</span>
              </div>
              <div className="h-3 bg-zinc-800 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: "94%" }}
                  transition={{ duration: 1, delay: 0.2 }}
                  className="h-full bg-gradient-to-r from-[hsl(var(--primary))] via-blue-500 to-emerald-400"
                />
              </div>
            </div>
            
            {/* Match Details */}
            <div className="grid grid-cols-2 gap-4 pt-4">
              {[
                { label: "Skills", score: 98, icon: Brain },
                { label: "Experience", score: 92, icon: Target },
                { label: "Education", score: 95, icon: Layers },
                { label: "Culture Fit", score: 91, icon: Users },
              ].map((item, i) => (
                <div key={item.label} className="p-3 rounded-lg bg-white/5 border border-white/10">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <item.icon className="h-4 w-4 text-[hsl(var(--primary))]" />
                      <span className="text-xs text-zinc-400">{item.label}</span>
                    </div>
                    <span className="text-xs font-semibold text-emerald-400">{item.score}%</span>
                  </div>
                  <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${item.score}%` }}
                      transition={{ duration: 0.8, delay: 0.3 + i * 0.1 }}
                      className="h-full bg-gradient-to-r from-[hsl(var(--primary))] to-emerald-400"
                    />
                  </div>
                </div>
              ))}
            </div>
            
            {/* Action Buttons */}
            <div className="flex gap-3 pt-2">
              <button className="flex-1 px-4 py-2.5 rounded-lg bg-[hsl(var(--primary))] text-white text-sm font-medium hover:bg-[hsl(var(--primary))]/90 transition-colors">
                View Full Profile
              </button>
              <button className="px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-zinc-300 text-sm font-medium hover:bg-white/10 transition-colors">
                Schedule Interview
              </button>
            </div>
          </div>
        </div>
      </div>
    ),
  },
  {
    icon: Workflow,
    title: "Workflows & Automation",
    description:
      "Custom stages, approvals, Calendly booking, and Slack alerts. From intake to offer on autopilot.",
    visual: (
      <div className="relative w-full">
        <div className="rounded-2xl border border-white/10 bg-zinc-900/50 backdrop-blur-sm overflow-hidden shadow-2xl">
          {/* App Header */}
          <div className="flex items-center gap-2 px-4 py-3 bg-zinc-800/50 border-b border-white/5">
            <Workflow className="h-5 w-5 text-[hsl(var(--primary))]" />
            <span className="text-sm font-semibold text-white">Hiring Workflow</span>
            <div className="ml-auto px-2 py-1 rounded bg-emerald-500/20 border border-emerald-500/30">
              <span className="text-xs text-emerald-400 font-medium">Active</span>
            </div>
          </div>
          
          {/* Workflow Steps */}
          <div className="p-6 space-y-6 bg-gradient-to-br from-zinc-900 to-zinc-950">
            {[
              { label: "Job Intake", status: "complete", icon: FileSearch, details: "Requirements captured", time: "2 days ago" },
              { label: "Candidate Screening", status: "complete", icon: Users, details: "12 candidates reviewed", time: "1 day ago" },
              { label: "Interview Scheduling", status: "active", icon: Calendar, details: "5 interviews scheduled", time: "In progress" },
              { label: "Offer & Onboarding", status: "pending", icon: Check, details: "Waiting for approval", time: "Next step" },
            ].map((step, i) => (
              <div key={step.label} className="relative">
                <div className="flex items-start gap-4">
                  <div className={cn(
                    "w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-all",
                    step.status === "complete" && "bg-emerald-500/20 border-2 border-emerald-500/40 shadow-lg shadow-emerald-500/20",
                    step.status === "active" && "bg-[hsl(var(--primary))]/20 border-2 border-[hsl(var(--primary))]/40 shadow-lg shadow-[hsl(var(--primary))]/20 animate-pulse",
                    step.status === "pending" && "bg-zinc-800 border-2 border-white/10"
                  )}>
                    <step.icon className={cn(
                      "h-6 w-6",
                      step.status === "complete" && "text-emerald-400",
                      step.status === "active" && "text-[hsl(var(--primary))]",
                      step.status === "pending" && "text-zinc-500"
                    )} />
                  </div>
                  <div className="flex-1 pt-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className={cn(
                        "text-base font-semibold",
                        step.status === "active" ? "text-white" : step.status === "complete" ? "text-zinc-300" : "text-zinc-500"
                      )}>
                        {step.label}
                      </span>
                      {step.status === "complete" && (
                        <Check className="h-5 w-5 text-emerald-400" />
                      )}
                    </div>
                    <p className="text-sm text-zinc-400 mb-1">{step.details}</p>
                    <p className="text-xs text-zinc-500">{step.time}</p>
                  </div>
                </div>
                {i < 3 && (
                  <div className={cn(
                    "absolute left-6 top-14 w-0.5 h-8 transition-colors",
                    step.status === "complete" ? "bg-emerald-500/40" : "bg-zinc-800"
                  )} />
                )}
              </div>
            ))}
            
            {/* Automation Badge */}
            <div className="mt-6 p-4 rounded-xl bg-[hsl(var(--primary))]/10 border border-[hsl(var(--primary))]/20">
              <div className="flex items-center gap-3">
                <Zap className="h-5 w-5 text-[hsl(var(--primary))]" />
                <div>
                  <p className="text-sm font-semibold text-white">Automated workflow</p>
                  <p className="text-xs text-zinc-400">Slack notifications • Calendly booking • Email follow-ups</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    ),
  },
  {
    icon: Plug,
    title: "Integrations",
    description:
      "GHL, Airtable, Google Sheets, Slack, Calendly. Your existing stack, unified in one hiring OS.",
    visual: (
      <div className="relative w-full">
        <div className="rounded-2xl border border-white/10 bg-zinc-900/50 backdrop-blur-sm overflow-hidden shadow-2xl">
          {/* App Header */}
          <div className="flex items-center gap-2 px-4 py-3 bg-zinc-800/50 border-b border-white/5">
            <Plug className="h-5 w-5 text-[hsl(var(--primary))]" />
            <span className="text-sm font-semibold text-white">Connected Integrations</span>
            <div className="ml-auto flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs text-emerald-400 font-medium">6 Active</span>
            </div>
          </div>
          
          {/* Integrations Grid */}
          <div className="p-6 bg-gradient-to-br from-zinc-900 to-zinc-950">
            <div className="grid grid-cols-3 gap-4 mb-6">
              {[
                { name: "GHL", icon: "🔗", status: "connected" },
                { name: "Airtable", icon: "📊", status: "connected" },
                { name: "Sheets", icon: "📈", status: "connected" },
                { name: "Slack", icon: "💬", status: "connected" },
                { name: "Calendly", icon: "📅", status: "connected" },
                { name: "CRM", icon: "👥", status: "connected" },
              ].map((integration, i) => (
                <motion.div
                  key={integration.name}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.1 }}
                  className="aspect-square rounded-xl bg-white/5 border border-white/10 flex flex-col items-center justify-center hover:bg-white/10 hover:border-[hsl(var(--primary))]/30 transition-all group relative overflow-hidden"
                >
                  <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-emerald-400" />
                  <span className="text-2xl mb-2">{integration.icon}</span>
                  <span className="text-xs font-medium text-zinc-300 group-hover:text-white transition-colors">
                    {integration.name}
                  </span>
                </motion.div>
              ))}
            </div>
            
            {/* Status Bar */}
            <div className="flex items-center justify-between p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
              <div className="flex items-center gap-3">
                <Check className="h-5 w-5 text-emerald-400" />
                <div>
                  <p className="text-sm font-semibold text-white">All integrations active</p>
                  <p className="text-xs text-zinc-400">Syncing data in real-time</p>
                </div>
              </div>
              <div className="px-3 py-1.5 rounded-lg bg-emerald-500/20 border border-emerald-500/30">
                <span className="text-xs font-semibold text-emerald-400">Live</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    ),
  },
  {
    icon: BarChart3,
    title: "Analytics & Forms",
    description:
      "Funnel views, intake forms, and compliance-ready reporting. Know exactly where every hire stands.",
    visual: (
      <div className="relative w-full">
        <div className="rounded-2xl border border-white/10 bg-zinc-900/50 backdrop-blur-sm overflow-hidden shadow-2xl">
          {/* App Header */}
          <div className="flex items-center gap-2 px-4 py-3 bg-zinc-800/50 border-b border-white/5">
            <BarChart3 className="h-5 w-5 text-[hsl(var(--primary))]" />
            <span className="text-sm font-semibold text-white">Analytics Dashboard</span>
            <div className="ml-auto text-xs text-zinc-400">Last 30 days</div>
          </div>
          
          {/* Analytics Content */}
          <div className="p-6 space-y-6 bg-gradient-to-br from-zinc-900 to-zinc-950">
            {/* Stats Overview */}
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: "Candidates", value: "247", change: "+12%", trend: "up" },
                { label: "Interviews", value: "45", change: "+8", trend: "up" },
                { label: "Offers", value: "12", change: "+5", trend: "up" },
              ].map((stat, i) => (
                <div key={stat.label} className="p-3 rounded-lg bg-white/5 border border-white/10">
                  <p className="text-xs text-zinc-400 mb-1">{stat.label}</p>
                  <p className="text-2xl font-bold text-white mb-1">{stat.value}</p>
                  <div className="flex items-center gap-1">
                    <TrendingUp className="h-3 w-3 text-emerald-400" />
                    <span className="text-xs text-emerald-400 font-medium">{stat.change}</span>
                  </div>
                </div>
              ))}
            </div>
            
            {/* Funnel Chart */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-sm font-semibold text-white">Hiring Funnel</h4>
                <span className="text-xs text-zinc-400">247 total candidates</span>
              </div>
              <div className="space-y-3">
                {[
                  { label: "Applied", value: 100, count: 247, color: "from-[hsl(var(--primary))] to-blue-500" },
                  { label: "Screened", value: 75, count: 185, color: "from-blue-500 to-cyan-500" },
                  { label: "Interviewed", value: 45, count: 111, color: "from-cyan-500 to-emerald-500" },
                  { label: "Offered", value: 20, count: 49, color: "from-emerald-500 to-green-500" },
                ].map((stage, i) => (
                  <div key={stage.label} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-zinc-300">{stage.label}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-zinc-400">{stage.count}</span>
                        <span className="text-xs font-semibold text-zinc-300">{stage.value}%</span>
                      </div>
                    </div>
                    <div className="h-3 bg-zinc-800 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${stage.value}%` }}
                        transition={{ duration: 1, delay: i * 0.15 }}
                        className={cn("h-full bg-gradient-to-r", stage.color)}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Quick Actions */}
            <div className="flex gap-3 pt-2">
              <button className="flex-1 px-4 py-2.5 rounded-lg bg-[hsl(var(--primary))] text-white text-sm font-medium hover:bg-[hsl(var(--primary))]/90 transition-colors">
                Export Report
              </button>
              <button className="px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-zinc-300 text-sm font-medium hover:bg-white/10 transition-colors">
                View Details
              </button>
            </div>
          </div>
        </div>
      </div>
    ),
  },
];

const TESTIMONIALS = [
  {
    quote:
      "HireOS cut our time-to-hire by 40%. The AI matching and workflow automation actually work.",
    author: "Sarah Chen",
    role: "VP Talent",
    company: "Scale Labs",
    avatar: "SC",
  },
  {
    quote:
      "We moved off spreadsheets in a week. Integrations with our CRM and Calendly were seamless.",
    author: "Marcus Webb",
    role: "Head of People",
    company: "FlowTech",
    avatar: "MW",
  },
  {
    quote:
      "Finally, one place for jobs, candidates, and interviews. Our team actually uses it every day.",
    author: "Elena Rodriguez",
    role: "COO",
    company: "Nexus Partners",
    avatar: "ER",
  },
];

const LOGOS = [
  "Scale Labs",
  "FlowTech",
  "Nexus",
  "Vertex",
  "Apex",
  "Stride",
];

// Interactive Features Section Component
function InteractiveFeaturesSection() {
  const [activeFeature, setActiveFeature] = useState(0);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="grid lg:grid-cols-2 gap-12 mb-16">
        <div>
          <h2 className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight text-white leading-tight mb-6">
            Hiring that transforms teams
          </h2>
        </div>
        <div className="flex items-center">
          <p className="text-lg md:text-xl text-zinc-400 leading-relaxed">
            From intake to offer — everything you need to hire faster, smarter, and at scale.
          </p>
        </div>
      </div>

      {/* Main Features Section */}
      <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-start">
        {/* Left Column: Feature Navigation */}
        <div className="space-y-10">
          <div className="space-y-0.5">
            {FEATURES.map((feature, index) => (
              <button
                key={feature.title}
                onClick={() => setActiveFeature(index)}
                className="w-full text-left group relative py-5 px-2 -mx-2 rounded-lg transition-all duration-300 hover:bg-white/5"
              >
                {/* Active indicator line (teal accent) */}
                <div
                  className={cn(
                    "absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 rounded-r-full transition-all duration-300",
                    activeFeature === index
                      ? "bg-emerald-400 opacity-100"
                      : "bg-transparent opacity-0 group-hover:bg-emerald-400/20"
                  )}
                />
                
                <div className="flex items-center gap-4">
                  <feature.icon
                    className={cn(
                      "h-6 w-6 transition-colors duration-300 flex-shrink-0",
                      activeFeature === index
                        ? "text-emerald-400"
                        : "text-zinc-500 group-hover:text-zinc-400"
                    )}
                  />
                  <span
                    className={cn(
                      "text-2xl font-semibold transition-colors duration-300",
                      activeFeature === index
                        ? "text-white"
                        : "text-zinc-500 group-hover:text-zinc-300"
                    )}
                  >
                    {feature.title}
                  </span>
                </div>
              </button>
            ))}
          </div>

          {/* Feature Description */}
          <motion.div
            key={activeFeature}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="pt-2 border-t border-white/5"
          >
            <p className="text-lg md:text-xl text-zinc-400 leading-relaxed">
              {FEATURES[activeFeature].description}
            </p>
          </motion.div>
        </div>

        {/* Right Column: Feature Visual */}
        <div className="relative lg:sticky lg:top-24">
          <motion.div
            key={activeFeature}
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="relative"
          >
            {/* Glow effect behind */}
            <div className="absolute -inset-2 bg-gradient-to-br from-[hsl(var(--primary))]/20 via-emerald-500/20 to-[hsl(var(--primary))]/20 rounded-3xl blur-2xl opacity-40" />
            
            {/* Main visual container */}
            <div className="relative rounded-3xl border border-white/10 bg-gradient-to-br from-zinc-900/95 to-zinc-950/95 backdrop-blur-xl overflow-hidden shadow-2xl">
              {/* Subtle depth overlay */}
              <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] via-transparent to-transparent pointer-events-none z-10" />
              
              {/* Visual content - clear but with depth */}
              <div className="relative p-6 md:p-10">
                {FEATURES[activeFeature].visual}
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

// Built for scale - Thrive-style horizontal carousel
const BUILT_FOR_SCALE_SLIDES = [
  {
    heading: "Smart connectors.",
    body: "HireOS unifies your HRIS, CRMs, meeting tools and everyday apps in one place. Candidates, jobs and interviews stay in sync—no jumping between spreadsheets or systems.",
    visual: "connectors",
  },
  {
    heading: "Security you can trust.",
    body: "Certified to high standards. HireOS keeps your people and data safe whether you're in the office, remote or on the go. Role-based access, encryption and audit logs built in.",
    visual: "security",
  },
  {
    heading: "Professional services and support.",
    body: "Our team works with you from day one. From setup to optimisation, we make sure HireOS delivers measurable impact through implementation support and responsive customer service.",
    visual: "support",
  },
  {
    heading: "Mentoring at scale.",
    body: "Connect data and people. Build a mentoring culture that scales. Match mentors and mentees, track progress, and measure impact—all in one platform.",
    visual: "workflows",
  },
  {
    heading: "Enterprise ready.",
    body: "Built for performance, flexibility and growth, HireOS supports teams of any size. Enterprise hiring without the complexity—role-based access, audit trails, and compliance-ready workflows.",
    visual: "enterprise",
  },
  {
    heading: "Workflows at scale.",
    body: "HireOS doesn't just store candidates—it connects your process. Build hiring workflows that span teams and time zones: intake, screening, interviews and offers in one connected experience.",
    visual: "workflows2",
  },
  {
    heading: "Analytics & insights.",
    body: "Track every metric that matters. From time-to-hire to candidate quality, get real-time insights that help you make data-driven hiring decisions.",
    visual: "analytics",
  },
];

// Lightweight 3-column Built for Scale Section - WITH LEFT BORDER LINES
function BuiltForScaleSection() {
  const features = [
    {
      title: "Enterprise Ready",
      description: "Security, compliance, and infrastructure built for scale. SSO, audit logs, and role-based access control.",
    },
    {
      title: "Fully Integrated",
      description: "Connect your entire tech stack. Sync with HRIS, email, calendar, and 100+ tools seamlessly.",
    },
    {
      title: "Built to Support",
      description: "Dedicated support team, training resources, and success managers to help you scale.",
    },
  ];

  return (
    <Section className="bg-gradient-to-b from-transparent via-white/[0.01] to-transparent" id="built-for-scale">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header Section - CENTERED */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-2xl mx-auto mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-3">
            Built for scale
          </h2>
          <p className="text-sm md:text-base text-zinc-400">
            Enterprise hiring without the complexity. Security, integrations, and support you can trust.
          </p>
        </motion.div>

        {/* 3-Column Grid - WITH LEFT BORDER LINES */}
        <div className="grid md:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ delay: index * 0.15, duration: 0.5 }}
              className="flex flex-col border-l-2 border-[hsl(var(--primary))]/50 pl-5"
            >
              {/* Title - at TOP */}
              <h3 className="text-base md:text-lg font-bold text-white mb-2">
                {feature.title}
              </h3>

              {/* Description - below title */}
              <p className="text-xs md:text-sm text-zinc-400 leading-relaxed mb-8">
                {feature.description}
              </p>

              {/* Illustration Area - Illustrations touch the left line */}
              <div className="w-full h-48 md:h-56 flex items-center justify-center -ml-5">
                {/* 3D Isometric Illustrations - DETAILED */}
                {index === 0 && (
                  /* Router/Network Device - MORE DETAILED */
                  <svg className="w-full h-full" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
                    {/* Back panel */}
                    <path d="M40 90L70 75L70 135L40 150Z" stroke="currentColor" strokeWidth="1.2" fill="none" className="text-zinc-600" />
                    {/* Main body - front */}
                    <path d="M70 75L140 50L170 75V130L140 155L70 135Z" stroke="currentColor" strokeWidth="1.5" fill="none" className="text-zinc-500" />
                    {/* Top surface detail */}
                    <path d="M140 50L170 75L170 85L140 60Z" stroke="currentColor" strokeWidth="1" fill="none" className="text-zinc-600" />
                    {/* Ports row 1 */}
                    <rect x="80" y="105" width="6" height="3" stroke="currentColor" strokeWidth="1" fill="none" className="text-zinc-500" />
                    <rect x="90" y="105" width="6" height="3" stroke="currentColor" strokeWidth="1" fill="none" className="text-zinc-500" />
                    <rect x="100" y="105" width="6" height="3" stroke="currentColor" strokeWidth="1" fill="none" className="text-zinc-500" />
                    <rect x="110" y="105" width="6" height="3" stroke="currentColor" strokeWidth="1" fill="none" className="text-zinc-500" />
                    {/* Ports row 2 */}
                    <rect x="80" y="115" width="6" height="3" stroke="currentColor" strokeWidth="1" fill="none" className="text-zinc-500" />
                    <rect x="90" y="115" width="6" height="3" stroke="currentColor" strokeWidth="1" fill="none" className="text-zinc-500" />
                    <rect x="100" y="115" width="6" height="3" stroke="currentColor" strokeWidth="1" fill="none" className="text-zinc-500" />
                    <rect x="110" y="115" width="6" height="3" stroke="currentColor" strokeWidth="1" fill="none" className="text-zinc-500" />
                    {/* LED indicators */}
                    <circle cx="75" cy="100" r="1.5" fill="currentColor" className="text-emerald-500/70" />
                    <circle cx="85" cy="97" r="1.5" fill="currentColor" className="text-emerald-500/70" />
                    <circle cx="95" cy="95" r="1.5" fill="currentColor" className="text-emerald-500/70" />
                    <circle cx="105" cy="97" r="1.5" fill="currentColor" className="text-emerald-500/70" />
                  </svg>
                )}
                {index === 1 && (
                  <>
                    {/* Keyboard - MUCH MORE DETAILED */}
                    <svg className="w-full h-full" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
                    {/* Left side panel */}
                    <path d="M35 85L60 70L60 140L35 155Z" stroke="currentColor" strokeWidth="1.2" fill="none" className="text-zinc-600" />
                    {/* Main keyboard */}
                    <path d="M60 70L145 45L170 70V135L145 160L60 140Z" stroke="currentColor" strokeWidth="1.5" fill="none" className="text-zinc-500" />
                    {/* Top surface */}
                    <path d="M145 45L170 70L170 80L145 55Z" stroke="currentColor" strokeWidth="1" fill="none" className="text-zinc-600" />
                    {/* Key rows */}
                    <line x1="70" y1="80" x2="155" y2="95" stroke="currentColor" strokeWidth="0.8" className="text-zinc-600" />
                    <line x1="70" y1="95" x2="155" y2="110" stroke="currentColor" strokeWidth="0.8" className="text-zinc-600" />
                    <line x1="70" y1="110" x2="155" y2="125" stroke="currentColor" strokeWidth="0.8" className="text-zinc-600" />
                    {/* Individual keys - Row 1 */}
                    <rect x="72" y="81" width="4" height="4" stroke="currentColor" strokeWidth="0.8" className="text-zinc-500" />
                    <rect x="80" y="84" width="4" height="4" stroke="currentColor" strokeWidth="0.8" className="text-zinc-500" />
                    <rect x="88" y="87" width="4" height="4" stroke="currentColor" strokeWidth="0.8" className="text-zinc-500" />
                    <rect x="96" y="90" width="4" height="4" stroke="currentColor" strokeWidth="0.8" className="text-zinc-500" />
                    <rect x="104" y="93" width="4" height="4" stroke="currentColor" strokeWidth="0.8" className="text-zinc-500" />
                    {/* Row 2 */}
                    <rect x="72" y="97" width="4" height="4" stroke="currentColor" strokeWidth="0.8" className="text-zinc-500" />
                    <rect x="80" y="100" width="4" height="4" stroke="currentColor" strokeWidth="0.8" className="text-zinc-500" />
                    <rect x="88" y="103" width="4" height="4" stroke="currentColor" strokeWidth="0.8" className="text-zinc-500" />
                    <rect x="96" y="106" width="4" height="4" stroke="currentColor" strokeWidth="0.8" className="text-zinc-500" />
                    {/* Row 3 */}
                    <rect x="72" y="113" width="4" height="4" stroke="currentColor" strokeWidth="0.8" className="text-zinc-500" />
                    <rect x="80" y="116" width="4" height="4" stroke="currentColor" strokeWidth="0.8" className="text-zinc-500" />
                    <rect x="88" y="119" width="4" height="4" stroke="currentColor" strokeWidth="0.8" className="text-zinc-500" />
                  </svg>
                  </>
                )}
                {index === 2 && (
                  <>
                    {/* Headset - MORE DETAILED WITH FULL ANATOMY */}
                    <svg className="w-full h-full" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
                    {/* Headband arc - thicker */}
                    <path d="M50 110Q60 65 100 60Q140 65 150 110" stroke="currentColor" strokeWidth="2.2" fill="none" className="text-zinc-500" />
                    {/* Left ear cup - detailed */}
                    <circle cx="50" cy="120" r="14" stroke="currentColor" strokeWidth="1.8" fill="none" className="text-zinc-500" />
                    <circle cx="50" cy="120" r="9" stroke="currentColor" strokeWidth="1" fill="none" className="text-zinc-600" />
                    <circle cx="50" cy="120" r="6" stroke="currentColor" strokeWidth="0.8" fill="none" className="text-zinc-600" />
                    {/* Right ear cup - detailed */}
                    <circle cx="150" cy="120" r="14" stroke="currentColor" strokeWidth="1.8" fill="none" className="text-zinc-500" />
                    <circle cx="150" cy="120" r="9" stroke="currentColor" strokeWidth="1" fill="none" className="text-zinc-600" />
                    <circle cx="150" cy="120" r="6" stroke="currentColor" strokeWidth="0.8" fill="none" className="text-zinc-600" />
                    {/* Microphone boom - left */}
                    <path d="M50 130Q45 140 40 150" stroke="currentColor" strokeWidth="1.8" fill="none" className="text-zinc-500" />
                    <circle cx="38" cy="152" r="3.5" stroke="currentColor" strokeWidth="1.5" fill="none" className="text-zinc-500" />
                    {/* Cable connector - center */}
                    <path d="M100 110L100 145" stroke="currentColor" strokeWidth="1.5" fill="none" className="text-zinc-600" />
                    <rect x="96" y="143" width="8" height="6" stroke="currentColor" strokeWidth="1" className="text-zinc-500" />
                    {/* Connection bridge */}
                    <line x1="50" y1="125" x2="150" y2="125" stroke="currentColor" strokeWidth="1" className="text-zinc-600" />
                  </svg>
                  </>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </Section>
  );
}

function BuiltForScaleVisualEnterprise() {
  return (
    <div className="w-full max-w-xs rounded-xl border border-white/10 bg-zinc-800/50 p-3 h-full flex flex-col justify-center">
      <div className="flex gap-1.5 mb-2">
        <div className="w-2 h-2 rounded-full bg-red-500/60" />
        <div className="w-2 h-2 rounded-full bg-yellow-500/60" />
        <div className="w-2 h-2 rounded-full bg-green-500/60" />
      </div>
      <div className="text-center py-3">
        <p className="text-xs font-semibold text-white mb-1">Your hiring hub</p>
        <p className="text-[10px] text-zinc-400">Dashboard • Jobs • Candidates • Analytics</p>
      </div>
      <div className="grid grid-cols-3 gap-1.5">
        {["Jobs", "Candidates", "Offers"].map((l) => (
          <div key={l} className="rounded-lg bg-white/5 border border-white/10 py-1.5 text-center">
            <span className="text-[10px] text-zinc-400">{l}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function BuiltForScaleVisualConnectors() {
  // Colorful app icons grid matching the image
  const appIcons = [
    { name: "SF", color: "bg-blue-500", glow: "shadow-blue-500/50" },
    { name: "O", color: "bg-red-500", glow: "shadow-red-500/50" },
    { name: "H", color: "bg-orange-500", glow: "shadow-orange-500/50" },
    { name: "MS", color: "bg-purple-500", glow: "shadow-purple-500/50" },
    { name: "d", color: "bg-cyan-500", glow: "shadow-cyan-500/50" },
    { name: "W", color: "bg-green-500", glow: "shadow-green-500/50" },
    { name: "Hi", color: "bg-pink-500", glow: "shadow-pink-500/50" },
    { name: "X", color: "bg-yellow-500", glow: "shadow-yellow-500/50" },
    { name: "G", color: "bg-indigo-500", glow: "shadow-indigo-500/50" },
  ];
  return (
    <div className="grid grid-cols-3 gap-2 w-full max-w-xs h-full flex items-center justify-center">
      {appIcons.map((app, i) => (
        <div
          key={i}
          className={cn(
            "rounded-lg flex items-center justify-center aspect-square text-xs font-bold text-white shadow-lg",
            app.color,
            app.glow
          )}
        >
          {app.name}
        </div>
      ))}
    </div>
  );
}

function BuiltForScaleVisualSecurity() {
  return (
    <div className="w-full max-w-xs rounded-xl border border-white/10 bg-zinc-800/80 p-4 space-y-2 shadow-2xl h-full flex flex-col justify-center">
      <div className="flex items-center gap-2 rounded-full bg-zinc-700/50 px-2 py-1 w-fit">
        <div className="w-5 h-5 rounded-full bg-gradient-to-br from-zinc-400 to-zinc-600 flex-shrink-0" />
        <span className="text-[10px] font-medium text-zinc-300">Two-Factor Authentication</span>
      </div>
      <h4 className="text-xs font-semibold text-white">Login to your account</h4>
      <input
        type="email"
        readOnly
        value="example@thrivelearning.com"
        className="w-full rounded-lg bg-zinc-900/80 border border-white/10 px-2.5 py-1.5 text-[10px] text-zinc-400 focus:outline-none"
      />
      <input
        type="password"
        readOnly
        placeholder="Password"
        className="w-full rounded-lg bg-zinc-900/80 border border-white/10 px-2.5 py-1.5 text-[10px] text-zinc-500 placeholder-zinc-500 focus:outline-none"
      />
      <button className="w-full rounded-lg bg-gradient-to-r from-emerald-500 to-emerald-600 py-1.5 text-[10px] font-semibold text-white shadow-lg shadow-emerald-500/20">
        Login
      </button>
      <p className="text-center text-[10px] text-zinc-500">Or login with</p>
      <div className="flex items-center justify-center gap-2">
        <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white/5 border border-white/10">
          <span className="text-[10px] font-medium text-zinc-300">G</span>
          <span className="text-[10px] text-zinc-400">Google</span>
        </div>
        <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white/5 border border-white/10">
          <span className="text-[10px] font-medium text-zinc-300">Azure</span>
        </div>
      </div>
    </div>
  );
}

function BuiltForScaleVisualSupport() {
  return (
    <div className="w-full h-full relative flex items-center justify-center">
      {/* Dark abstract background with profile silhouette */}
      <div className="absolute inset-0 bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 rounded-xl" />
      {/* Profile silhouette - illuminated from top right */}
      <div className="relative w-32 h-32">
        <div className="absolute inset-0 bg-gradient-to-br from-zinc-700/30 via-zinc-600/20 to-transparent rounded-full blur-xl" 
             style={{ 
               clipPath: "ellipse(60% 80% at 50% 50%)",
               transform: "rotate(-15deg)"
             }} 
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-20 h-24 bg-gradient-to-b from-zinc-600/40 to-zinc-800/60 rounded-full"
               style={{
                 clipPath: "ellipse(50% 60% at 50% 40%)",
                 boxShadow: "0 0 40px rgba(161, 161, 170, 0.2)"
               }}
          />
        </div>
      </div>
    </div>
  );
}

function BuiltForScaleVisualWorkflows() {
  return (
    <div className="w-full max-w-xs space-y-2 h-full flex flex-col justify-center overflow-hidden">
      {/* User profile header */}
      <div className="flex items-center gap-2 pb-2 border-b border-white/10">
        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
          CT
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-semibold text-white truncate">Chris Thompson</p>
          <div className="flex gap-1.5 mt-0.5">
            {["Overview", "Chat", "Session", "Skills"].map((tab) => (
              <span key={tab} className="text-[9px] text-zinc-500">{tab}</span>
            ))}
          </div>
        </div>
      </div>
      
      {/* Schedule session - compact */}
      <div className="rounded-lg border border-white/10 bg-zinc-800/50 p-2 space-y-1.5">
        <p className="text-[10px] font-semibold text-white">Schedule session</p>
        <div className="space-y-1">
          <div>
            <p className="text-[9px] text-zinc-400 mb-0.5">Topic</p>
            <p className="text-[10px] text-zinc-300 truncate">Chris / Jerry mentoring</p>
          </div>
          <div>
            <p className="text-[9px] text-zinc-400 mb-0.5">When</p>
            <div className="rounded bg-zinc-900/80 border border-white/10 p-1.5">
              <p className="text-[10px] text-zinc-300 truncate">Wednesday, October 1, 2025</p>
              <div className="grid grid-cols-7 gap-0.5 mt-1.5">
                {Array.from({ length: 7 }).map((_, i) => (
                  <div key={i} className={cn(
                    "aspect-square rounded flex items-center justify-center text-[9px]",
                    i === 0 ? "bg-emerald-500/20 text-emerald-400 font-semibold" : "text-zinc-500"
                  )}>
                    {i === 0 ? "1" : i + 1}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Upcoming session - compact */}
      <div className="rounded-lg border border-white/10 bg-zinc-800/50 p-2">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold text-white">Nov 10</p>
            <p className="text-[9px] text-zinc-400 mt-0.5 truncate">Chris / Jerry mentoring</p>
          </div>
          <button className="px-2 py-1 rounded bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-[9px] font-medium flex-shrink-0">
            Join
          </button>
        </div>
      </div>
    </div>
  );
}

function BuiltForScaleVisualWorkflows2() {
  return (
    <div className="w-full max-w-xs space-y-2">
      <div className="rounded-xl border border-white/10 bg-zinc-800/50 p-3">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold text-white">2h 20m</p>
          <span className="text-[10px] text-emerald-400">Design Check-in</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-400 to-blue-600" />
          <div>
            <p className="text-xs text-zinc-300">Team sync</p>
            <p className="text-[10px] text-zinc-500">In progress</p>
          </div>
        </div>
      </div>
      <div className="rounded-xl border border-white/10 bg-zinc-800/50 p-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-white">Nov 10</p>
            <p className="text-[10px] text-zinc-400 mt-0.5">Chris / Jerry mentoring</p>
          </div>
          <button className="px-3 py-1.5 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs font-medium">
            Join session
          </button>
        </div>
      </div>
    </div>
  );
}

function BuiltForScaleVisualAnalytics() {
  return (
    <div className="w-full max-w-xs h-full flex flex-col justify-center">
      <div className="rounded-xl border border-white/10 bg-zinc-800/50 p-3">
        <p className="text-[10px] font-semibold text-white mb-2">Hiring Metrics</p>
        <div className="space-y-1.5">
          {[
            { label: "Time to Hire", value: "12 days", change: "-3 days" },
            { label: "Offer Acceptance", value: "94%", change: "+5%" },
            { label: "Candidate Quality", value: "8.2/10", change: "+0.8" },
          ].map((metric) => (
            <div key={metric.label} className="flex items-center justify-between p-1.5 rounded-lg bg-white/5">
              <span className="text-[9px] text-zinc-400 truncate">{metric.label}</span>
              <div className="text-right flex-shrink-0 ml-2">
                <p className="text-[10px] font-semibold text-white">{metric.value}</p>
                <p className="text-[9px] text-emerald-400">{metric.change}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Integrations Scroll Section with PINNING - Forces user to interact with animation
function IntegrationsScrollSection() {
  const containerRef = useRef<HTMLDivElement>(null);
  const modelContainerRef = useRef<HTMLDivElement>(null);
  const scrollRoot = useContext(LandingScrollContext);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [isFullyVisible, setIsFullyVisible] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isPinned, setIsPinned] = useState(false); // NEW: Track if section is pinned
  const animationProgressRef = useRef(0);
  const pinnedScrollYRef = useRef(0); // Store scroll position when pinned
  
  // IntersectionObserver to detect when 3D model container is visible
  const previousVisibilityRef = useRef<number>(0);
  const approachDirectionRef = useRef<'top' | 'bottom' | null>(null);
  const lastScrollYRef = useRef<number>(0);
  
  useEffect(() => {
    if (!modelContainerRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const currentRatio = entry.intersectionRatio;
          const previousRatio = previousVisibilityRef.current;
          
          // Detect visibility TRANSITION, not just threshold
          // This catches fast scrolls where ratio jumps from low to high
          const wasHidden = previousRatio < 0.75;
          const isNowVisible = currentRatio >= 0.75;
          const transitionedToVisible = wasHidden && isNowVisible;
          
          const wasVisible = previousRatio >= 0.75;
          const isNowHidden = currentRatio < 0.75;
          const transitionedToHidden = wasVisible && isNowHidden;
          
          // Update stored visibility for next comparison
          previousVisibilityRef.current = currentRatio;
          
          if (transitionedToVisible && !isFullyVisible) {
            // Transitioning INTO view - start animation
            // Detect approach direction: are we scrolling down (from top) or up (from bottom)?
            const currentScrollY = scrollRoot?.current?.scrollTop || window.scrollY;
            const isScrollingDown = currentScrollY > lastScrollYRef.current;
            
            approachDirectionRef.current = isScrollingDown ? 'top' : 'bottom';
            
            console.log('Animation activated - approach direction:', approachDirectionRef.current, '(ratio:', (currentRatio * 100).toFixed(0) + '%)');
            setIsFullyVisible(true);
            setIsAnimating(true);
            setIsPinned(true); // PIN the section
            
            // Calculate centered scroll position for proper viewing
            if (modelContainerRef.current) {
              const modelRect = modelContainerRef.current.getBoundingClientRect();
              const currentScrollY = scrollRoot?.current?.scrollTop || window.scrollY;
              const modelTopInPage = modelRect.top + currentScrollY;
              const modelHeight = modelRect.height;
              const modelCenterInPage = modelTopInPage + modelHeight / 2;
              
              // Calculate scroll position to center model in viewport
              const viewportHeight = window.innerHeight;
              const viewportCenter = viewportHeight / 2;
              const centeredScrollPosition = modelCenterInPage - viewportCenter;
              
              // Pin at centered position
              pinnedScrollYRef.current = Math.max(0, centeredScrollPosition);
              
              console.log('Model centered for pinning - scroll locked at:', pinnedScrollYRef.current.toFixed(0));
            } else {
              pinnedScrollYRef.current = scrollRoot?.current?.scrollTop || window.scrollY;
            }
            // DON'T reset progress - preserve state!
          } else if (transitionedToHidden && isFullyVisible) {
            // Transitioning OUT of view - preserve animation state for when we come back
            console.log('Animation paused - model scrolled out (ratio:', (currentRatio * 100).toFixed(0) + '%) - state preserved');
            setIsFullyVisible(false);
            // DON'T reset progress - preserve state!
            // setScrollProgress(0);
          }
          
          // Update last scroll position for next comparison
          lastScrollYRef.current = scrollRoot?.current?.scrollTop || window.scrollY;
          
          // Debug: Log current visibility
          if (process.env.NODE_ENV === 'development') {
            console.log('Model visibility:', (currentRatio * 100).toFixed(0) + '% | Transition:', transitionedToVisible ? 'ENTER' : transitionedToHidden ? 'EXIT' : 'NONE');
          }
        });
      },
      {
        // Very granular thresholds to catch all visibility changes, even with fast scrolls
        threshold: [0, 0.05, 0.1, 0.15, 0.2, 0.25, 0.3, 0.35, 0.4, 0.45, 0.5, 0.55, 0.6, 0.65, 0.7, 0.75, 0.8, 0.85, 0.9, 0.95, 1.0],
        root: scrollRoot?.current || null,
      }
    );

    observer.observe(modelContainerRef.current);

    return () => {
      if (modelContainerRef.current) {
        observer.unobserve(modelContainerRef.current);
      }
    };
  }, [scrollRoot, isFullyVisible]);

  // Pinning effect: prevent page scroll when section is pinned
  useEffect(() => {
    if (!isPinned) return;

    const preventScroll = (e: WheelEvent | TouchEvent) => {
      const currentProgress = animationProgressRef.current;
      
      // Determine when to unpin based on approach direction
      const isFromTop = approachDirectionRef.current === 'top';
      const isFromBottom = approachDirectionRef.current === 'bottom';
      
      // Unpin when reaching the escape boundary:
      // - From top: unpin when progress = 100% (fully open, user scrolls down to escape)
      // - From bottom: unpin when progress = 0% (fully closed, user scrolls up to escape)
      const reachedEscapeBoundary = 
        (isFromTop && currentProgress >= 1.0) || 
        (isFromBottom && currentProgress <= 0.0);
      
      if (reachedEscapeBoundary) {
        // Animation complete - unpin and allow normal scrolling
        setIsPinned(false);
        console.log('Section unpinned - animation complete, normal scrolling resumed');
      } else {
        // Still animating - prevent page scroll
        e.preventDefault();
        e.stopPropagation();
        
        // Maintain scroll position - don't let page scroll
        if (scrollRoot?.current) {
          scrollRoot.current.scrollTop = pinnedScrollYRef.current;
        } else {
          window.scrollY = pinnedScrollYRef.current;
        }
      }
    };

    window.addEventListener('wheel', preventScroll, { passive: false });
    window.addEventListener('touchmove', preventScroll, { passive: false });

    return () => {
      window.removeEventListener('wheel', preventScroll);
      window.removeEventListener('touchmove', preventScroll);
    };
  }, [isPinned, scrollRoot]);
  useEffect(() => {
    if (!modelContainerRef.current) return;

    const checkVisibility = () => {
      if (!modelContainerRef.current) return;
      
      const rect = modelContainerRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      
      // Calculate visibility percentage
      const top = rect.top;
      const bottom = rect.bottom;
      const elementHeight = rect.height;
      
      // Element is in viewport
      const visibleTop = Math.max(0, top);
      const visibleBottom = Math.min(viewportHeight, bottom);
      const visibleHeight = Math.max(0, visibleBottom - visibleTop);
      const visibilityRatio = elementHeight > 0 ? visibleHeight / elementHeight : 0;
      
      const isVisible = visibilityRatio >= 0.75;
      
      // RECOVERY MECHANISM: If model is visible but animation didn't activate, force activate it
      if (isVisible && !isFullyVisible && !isAnimating) {
        console.log('RECOVERY: Animation forced to activate (scroll listener detected visibility)');
        setIsFullyVisible(true);
        setIsAnimating(true);
        animationProgressRef.current = 0;
        setScrollProgress(0);
      } else if (!isVisible && isFullyVisible && !isAnimating) {
        // If model is no longer visible, deactivate
        console.log('Scroll listener: Model hidden, deactivating animation');
        setIsFullyVisible(false);
        setScrollProgress(0);
        animationProgressRef.current = 0;
      }
    };

    // Add scroll listener on the container that's being scrolled
    const scrollContainer = scrollRoot?.current || window;
    
    // Use throttled scroll check (fires max every 100ms to avoid performance issues)
    let throttleTimer: NodeJS.Timeout | null = null;
    const throttledCheck = () => {
      if (throttleTimer) return;
      throttleTimer = setTimeout(() => {
        checkVisibility();
        throttleTimer = null;
      }, 100);
    };
    
    scrollContainer.addEventListener('scroll', throttledCheck, { passive: true });
    
    // Initial check in case element is already visible on mount
    checkVisibility();
    
    return () => {
      scrollContainer.removeEventListener('scroll', throttledCheck);
      if (throttleTimer) clearTimeout(throttleTimer);
    };
  }, [scrollRoot, isFullyVisible, isAnimating]);

  // Wheel event handler: convert wheel delta to reversible animation progress
  useEffect(() => {
    if (!isFullyVisible || !isAnimating) return;

    const handleWheel = (e: WheelEvent) => {
      // Use signed deltaY for reversible animation
      const sensitivity = 0.0001;
      const delta = e.deltaY * sensitivity;
      
      // Calculate new progress
      const newProgress = Math.max(
        0,
        Math.min(1, animationProgressRef.current + delta)
      );
      
      // Escape conditions - allow escape at ANY boundary regardless of approach direction
      const escapingAtZeroUp = newProgress <= 0.01 && e.deltaY < 0;
      const escapingAt100Down = newProgress >= 0.99 && e.deltaY > 0;
      const isEscaping = escapingAtZeroUp || escapingAt100Down;
      
      // ONLY prevent scroll if NOT escaping
      if (!isEscaping) {
        e.preventDefault();
        e.stopPropagation();
      }
      
      // Always update progress (allows reversing at any point)
      animationProgressRef.current = newProgress;
      setScrollProgress(newProgress);
      
      // Unpin when escaping
      if (isEscaping && isPinned) {
        setIsPinned(false);
        console.log('Escaping - unpinned, page scroll resumed');
      }
      
      // Debug: Log progress with direction
      if (process.env.NODE_ENV === 'development') {
        const direction = e.deltaY > 0 ? '↓ OPENING' : '↑ CLOSING';
        const action = isEscaping ? '(ESCAPING)' : '(animating)';
        console.log('Progress:', newProgress.toFixed(3), direction, action);
      }

      // When progress reaches 1, user can scroll down to escape
      if (newProgress >= 1.0 && isAnimating) {
        console.log('Layers fully open - can scroll down to escape');
      }
      
      // When progress reaches 0, user can scroll up to escape
      if (newProgress <= 0.0 && isAnimating) {
        console.log('Layers fully closed - can scroll up to escape');
      }
    };

    // Add wheel listener with passive: false to allow preventDefault
    const options = { passive: false };
    window.addEventListener('wheel', handleWheel, options);
    
    // Also handle touch for mobile
    const handleTouchMove = (e: TouchEvent) => {
      // Allow touch scroll through (don't prevent)
    };
    window.addEventListener('touchmove', handleTouchMove, options);

    return () => {
      window.removeEventListener('wheel', handleWheel);
      window.removeEventListener('touchmove', handleTouchMove);
    };
  }, [isFullyVisible, isAnimating]);

  // Right panel content changes for each layer (5 layers total)
  // Left panel stays static - it's the topic/heading
  const rightPanelContent = [
    {
      description: "Agents act on command -\nfrom users or other agents\n- across any tool or\nworkflow"
    },
    {
      description: "Intelligent agents respond\nto commands instantly\n- coordinating across\nmultiple systems"
    },
    {
      description: "Layers communicate\nseamlessly - sharing\ncontext and data\nin real-time"
    },
    {
      description: "Advanced orchestration\nenables complex workflows\n- with full context\nawareness"
    },
    {
      description: "Complete integration\nachieved - all layers\nworking in perfect\nharmony"
    }
  ];

  // Determine which layer is currently active based on scrollProgress
  // Aligned with layer opening thresholds: 0-0.15 (layer 0), 0.15-0.3 (layer 1), 0.3-0.45 (layer 2), 0.45-0.6 (layer 3), 0.6-1.0 (layer 4)
  const getActiveLayerIndex = (progress: number): number => {
    if (progress < 0.15) return 0;  // Layer 0 opening
    if (progress < 0.3) return 1;   // Layer 1 opening
    if (progress < 0.45) return 2; // Layer 2 opening
    if (progress < 0.6) return 3;  // Layer 3 opening
    return 4; // Layer 4 opening (final layer)
  };

  let activeLayerIndex = getActiveLayerIndex(scrollProgress);
  
  // If approaching from bottom, reverse the layer order (5→4→3→2→1 instead of 1→2→3→4→5)
  if (approachDirectionRef.current === 'bottom') {
    activeLayerIndex = 4 - activeLayerIndex; // Reverse: 0↔4, 1↔3, 2 stays 2
  }
  
  const currentRightContent = rightPanelContent[activeLayerIndex];

  return (
    <Section id="integrations" className="bg-white/[0.01] relative">
      <div ref={containerRef} className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8" style={{ minHeight: '100vh' }}>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="grid lg:grid-cols-[1fr_2fr_1fr] gap-8 lg:gap-12 items-center"
        >
          {/* Left Text Column - Static content (topic/heading) with active indicator */}
          <div className="space-y-4">
            {/* Heading - Stays the same */}
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-semibold text-white leading-tight">
              <span className="text-[hsl(var(--primary))]">+</span>{" "}
              <span className="text-[hsl(var(--primary))]">Application</span>
            </h2>
            
            {/* List - Static, but active item is highlighted based on layer */}
            <ul className="space-y-2 text-zinc-300">
              {[
                "Agent Swarm™",
                "Layer",
                "System of Context",
                "Data Sources",
                "Application"
              ].map((item, index) => (
                <motion.li
                  key={item}
                  className={`text-sm md:text-base flex items-center gap-2 transition-colors duration-300 ${
                    activeLayerIndex === index
                      ? "text-[hsl(var(--primary))]"
                      : "text-zinc-300"
                  }`}
                >
                  {/* Bullet point indicator */}
                  <span
                    className={`w-2 h-2 rounded-full transition-all duration-300 ${
                      activeLayerIndex === index
                        ? "bg-[hsl(var(--primary))] scale-125"
                        : "bg-zinc-500 scale-100"
                    }`}
                  />
                  <span>{item}</span>
                </motion.li>
              ))}
            </ul>
          </div>

          {/* Central 3D Isometric Diagram with Scroll-based Opening - More space */}
          <div ref={modelContainerRef} className="relative flex items-center justify-center h-96 lg:h-[500px] py-12 w-full">
            <div className="relative w-full h-full max-w-none">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
                className="w-full h-full"
              >
                <StackedLayers3D 
                  showDetails={false}
                  className="w-full h-full"
                  interactive={false}
                  scrollProgress={scrollProgress}
                />
              </motion.div>
            </div>
          </div>

          {/* Right Text Column - Dynamic content (explanation) changes with each layer */}
          <motion.div
            key={`right-${activeLayerIndex}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: "easeInOut" }}
            className="space-y-4"
          >
            {/* Heading - Stays the same */}
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-semibold text-[hsl(var(--primary))] leading-tight">
              Act from anywhere
            </h2>
            
            {/* Description - Changes based on active layer with color transition */}
            <motion.p
              key={`desc-${activeLayerIndex}`}
              initial={{ opacity: 0, color: "rgb(161 161 170)" }} // zinc-300
              animate={{ 
                opacity: 1, 
                color: activeLayerIndex === 4 
                  ? "hsl(var(--primary))" // Primary color on final layer
                  : "rgb(161 161 170)" // zinc-300 for other layers
              }}
              transition={{ duration: 0.4, ease: "easeInOut" }}
              className="text-sm md:text-base leading-relaxed whitespace-pre-line"
            >
              {currentRightContent.description}
            </motion.p>
          </motion.div>
        </motion.div>
      </div>
    </Section>
  );
}

export default function LandingPage() {
  const { user, isLoading } = useAuth();
  const [location] = useLocation();
  const [navOpen, setNavOpen] = useState(false);
  const [announceDismissed, setAnnounceDismissed] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { scrollY } = useScroll({ container: scrollRef });
  const heroOpacity = useTransform(scrollY, [0, 300], [1, 0]);
  const heroY = useTransform(scrollY, [0, 400], [0, 80]);

  useEffect(() => {
    if (navOpen) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [navOpen]);

  const scrollToSection = (id: string) => {
    setNavOpen(false);
    const el = document.getElementById(id);
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0a0a0b] flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-[hsl(var(--primary))] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (user && location === "/") {
    return <Redirect to="/dashboard" />;
  }

  return (
    <div
      ref={scrollRef}
      className="h-screen overflow-y-auto overflow-x-hidden bg-[#0a0a0b] text-white antialiased scroll-smooth landing-font"
    >
      <LandingScrollContext.Provider value={scrollRef}>
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

        {/* Announcement bar */}
        {!announceDismissed && (
          <motion.div
            initial={{ y: -40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="relative z-50 bg-gradient-to-r from-[#0d1117] via-[#0a0a0b] to-[#0d1117] border-b border-white/5"
          >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between gap-4">
              <p className="text-sm text-zinc-300">
                <span className="text-emerald-400 font-semibold">✨ HireOS is live</span>
                {" — "}
                <span>AI-powered hiring from intake to offer. Get started free →</span>
              </p>
              <div className="flex items-center gap-2 flex-shrink-0">
                <Button asChild size="sm" variant="ghost" className="text-zinc-300 hover:text-white">
                  <Link href="/auth">Get started</Link>
                </Button>
                <button
                  onClick={() => setAnnounceDismissed(true)}
                  className="p-1.5 rounded-md text-zinc-500 hover:text-zinc-300 hover:bg-white/5 transition-colors"
                  aria-label="Dismiss"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* Nav */}
        <nav className="sticky top-0 z-40 border-b border-white/5 bg-[#0a0a0b]/80 backdrop-blur-xl">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16 lg:h-18">
              <Link href="/" className="flex items-center gap-2 group">
                <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent group-hover:from-[hsl(var(--primary))] group-hover:to-emerald-400 transition-all">
                  HireOS
                </span>
              </Link>

              <div className="hidden md:flex items-center gap-8">
                <button
                  type="button"
                  onClick={() => scrollToSection("features")}
                  className="text-sm font-medium text-zinc-400 hover:text-white transition-colors"
                >
                  Features
                </button>
                <button
                  type="button"
                  onClick={() => scrollToSection("integrations")}
                  className="text-sm font-medium text-zinc-400 hover:text-white transition-colors"
                >
                  Integrations
                </button>
                <button
                  type="button"
                  onClick={() => scrollToSection("testimonials")}
                  className="text-sm font-medium text-zinc-400 hover:text-white transition-colors"
                >
                  Testimonials
                </button>
              </div>

              <div className="hidden md:flex items-center gap-3">
                <Button asChild variant="ghost" className="text-zinc-400 hover:text-white">
                  <Link href="/auth">Log in</Link>
                </Button>
                <Button asChild className="bg-[hsl(var(--primary))] hover:bg-[hsl(var(--primary))]/90 text-white shadow-lg shadow-[hsl(var(--primary))]/20">
                  <Link href="/auth">Get started</Link>
                </Button>
              </div>

              <button
                onClick={() => setNavOpen(!navOpen)}
                className="md:hidden p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
                aria-label="Menu"
              >
                {navOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            </div>
          </div>

          {navOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden border-t border-white/5 bg-[#0a0a0b]"
            >
              <div className="px-4 py-4 space-y-2">
                <button type="button" onClick={() => scrollToSection("features")} className="block w-full text-left py-2 text-zinc-400 hover:text-white transition-colors">
                  Features
                </button>
                <button type="button" onClick={() => scrollToSection("integrations")} className="block w-full text-left py-2 text-zinc-400 hover:text-white transition-colors">
                  Integrations
                </button>
                <button type="button" onClick={() => scrollToSection("testimonials")} className="block w-full text-left py-2 text-zinc-400 hover:text-white transition-colors">
                  Testimonials
                </button>
                <div className="pt-4 flex flex-col gap-2">
                  <Button asChild variant="ghost" className="w-full">
                    <Link href="/auth" onClick={() => setNavOpen(false)}>Log in</Link>
                  </Button>
                  <Button asChild className="w-full">
                    <Link href="/auth" onClick={() => setNavOpen(false)}>Get started</Link>
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </nav>

        <main className="relative z-10">
          {/* Hero */}
          <section className="relative min-h-[95vh] flex flex-col items-center justify-center px-4 sm:px-6 lg:px-8 pt-20 pb-32 overflow-hidden">
            <motion.div
              style={{ opacity: heroOpacity, y: heroY }}
              className="max-w-5xl mx-auto text-center relative z-10"
            >
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[hsl(var(--primary))]/10 border border-[hsl(var(--primary))]/20 text-[hsl(var(--primary))] text-sm font-medium mb-8"
              >
                <Sparkles className="h-4 w-4" />
                <span>AI-Powered Hiring Platform</span>
              </motion.div>
              
              <motion.h1
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.6 }}
                className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold tracking-tight text-white leading-[1.05] mb-6"
              >
                Hiring that runs{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[hsl(var(--primary))] via-blue-400 to-emerald-400 animate-gradient">
                  on autopilot
                </span>
              </motion.h1>
              
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 }}
                className="text-xl sm:text-2xl text-zinc-400 max-w-3xl mx-auto leading-relaxed mb-10"
              >
                HireOS unifies jobs, candidates, interviews, and offers. AI matching,
                workflows, and your favorite tools — one platform, zero chaos.
              </motion.p>
              
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16"
              >
                <Button
                  asChild
                  size="lg"
                  className="bg-[hsl(var(--primary))] hover:bg-[hsl(var(--primary))]/90 text-white px-8 h-14 text-base font-semibold shadow-xl shadow-[hsl(var(--primary))]/25 group"
                >
                  <Link href="/auth">
                    Get started free
                    <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="border-white/20 text-white hover:bg-white/5 hover:border-white/30 h-14 text-base font-semibold px-8"
                  onClick={() => scrollToSection("features")}
                >
                  <Play className="mr-2 h-5 w-5" />
                  See how it works
                </Button>
              </motion.div>
            </motion.div>

            {/* Hero Dashboard Mockup */}
            <motion.div
              initial={{ opacity: 0, y: 60, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: 0.7, duration: 0.8 }}
              className="w-full max-w-6xl mx-auto relative z-0"
            >
              <DashboardMockup />
            </motion.div>
          </section>

          {/* Logos */}
          <Section className="py-16 md:py-20 border-y border-white/5">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <p className="text-center text-sm font-medium text-zinc-500 mb-10 uppercase tracking-wider">
                Trusted by teams worldwide
              </p>
              <div className="flex flex-wrap items-center justify-center gap-12 md:gap-16 opacity-40 hover:opacity-60 transition-opacity">
                {LOGOS.map((name) => (
                  <span
                    key={name}
                    className="text-xl font-bold text-zinc-600"
                  >
                    {name}
                  </span>
                ))}
              </div>
            </div>
          </Section>

          {/* Features with Interactive Selection */}
          <Section id="features" className="bg-gradient-to-b from-transparent via-white/[0.01] to-transparent">
            <InteractiveFeaturesSection />
          </Section>

          {/* Integrations - Scroll-based Opening Animation */}
          <IntegrationsScrollSection />

          {/* Testimonials */}
          <Section id="testimonials" className="bg-gradient-to-b from-transparent via-white/[0.01] to-transparent">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center max-w-3xl mx-auto mb-16">
                <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-white mb-6">
                  Loved by hiring teams
                </h2>
                <p className="text-xl text-zinc-400 leading-relaxed">
                  See why teams are switching to HireOS to ship hires faster.
                </p>
              </div>
              <div className="grid md:grid-cols-3 gap-8">
                {TESTIMONIALS.map((t, i) => (
                  <motion.div
                    key={t.author}
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-50px" }}
                    transition={{ delay: i * 0.15, duration: 0.5 }}
                    className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.03] to-white/[0.01] p-8 hover:border-white/20 hover:bg-white/[0.05] transition-all backdrop-blur-sm"
                  >
                    <div className="flex items-start gap-1 mb-4">
                      {[...Array(5)].map((_, j) => (
                        <svg key={j} className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      ))}
                    </div>
                    <p className="text-zinc-300 leading-relaxed mb-6 text-lg">"{t.quote}"</p>
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[hsl(var(--primary))] to-emerald-400 flex items-center justify-center text-white font-bold text-sm">
                        {t.avatar}
                      </div>
                      <div>
                        <p className="font-semibold text-white">{t.author}</p>
                        <p className="text-sm text-zinc-500">
                          {t.role}, {t.company}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </Section>

          {/* Built for scale - Thrive-style carousel */}
          <BuiltForScaleSection />

          {/* CTA */}
          <Section className="pb-32 md:pb-40">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="grid lg:grid-cols-[60%_40%] gap-8 lg:gap-12 items-center"
              >
                {/* Left Content Block */}
                <div className="relative rounded-xl bg-zinc-900/30 border border-white/10 p-8 md:p-12 lg:p-16">
                  <h2 className="text-3xl md:text-4xl lg:text-5xl font-semibold text-white mb-12 leading-tight">
                    Ready to start hiring?
                  </h2>
                  
                  {/* Glowing Green Divider Line */}
                  <div className="mb-12">
                    <div className="h-[3px] bg-emerald-400 rounded-full shadow-[0_0_20px_rgba(16,185,129,0.5)]" />
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="flex flex-col sm:flex-row gap-4">
                    <Button
                      asChild
                      size="lg"
                      className="bg-white text-black font-semibold px-8 py-6 hover:bg-gray-100 transition-colors"
                    >
                      <Link href="/auth">Get started</Link>
                    </Button>
                    <Button
                      asChild
                      size="lg"
                      variant="outline"
                      className="border-white/30 bg-white/10 text-white hover:bg-white/20 px-8 py-6 backdrop-blur-sm"
                    >
                      <Link href="/auth">Log in</Link>
                    </Button>
                  </div>
                </div>

                {/* Right Abstract 3D Graphics */}
                <div className="relative h-64 md:h-80 lg:h-96 flex items-center justify-center overflow-hidden">
                  {/* Abstract 3D Geometric Shapes */}
                  <div className="relative w-full h-full">
                    {/* Large geometric shape */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 md:w-64 md:h-64 lg:w-80 lg:h-80">
                      <div className="relative w-full h-full transform rotate-45">
                        {/* Main dark shape */}
                        <div className="absolute inset-0 bg-gradient-to-br from-[#1a1a1a] via-[#252525] to-[#1a1a1a] border border-white/10 shadow-2xl" 
                             style={{ clipPath: "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)" }} />
                        {/* Green glowing accent */}
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1 h-full bg-emerald-400 shadow-[0_0_30px_rgba(16,185,129,0.8)]" />
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-emerald-400 shadow-[0_0_30px_rgba(16,185,129,0.8)]" />
                      </div>
                    </div>
                    
                    {/* Smaller geometric shapes */}
                    <div className="absolute top-1/4 right-1/4 w-24 h-24 md:w-32 md:h-32">
                      <div className="relative w-full h-full transform rotate-12">
                        <div className="absolute inset-0 bg-gradient-to-br from-[#1a1a1a] to-[#2a2a2a] border border-white/5 shadow-xl"
                             style={{ clipPath: "polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%)" }} />
                        <div className="absolute top-1/2 left-0 w-full h-0.5 bg-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.6)]" />
                      </div>
                    </div>
                    
                    <div className="absolute bottom-1/4 left-1/4 w-20 h-20 md:w-28 md:h-28">
                      <div className="relative w-full h-full transform -rotate-12">
                        <div className="absolute inset-0 bg-gradient-to-br from-[#2a2a2a] to-[#1a1a1a] border border-white/5 shadow-xl"
                             style={{ clipPath: "polygon(50% 0%, 100% 38%, 82% 100%, 18% 100%, 0% 38%)" }} />
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-0.5 h-full bg-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.6)]" />
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          </Section>

          {/* Footer */}
          <footer className="border-t border-white/5 py-16">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-8 mb-12">
                <div className="flex items-center gap-3">
                  <span className="text-2xl font-bold bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent">HireOS</span>
                  <span className="text-zinc-500 text-sm">Automated Hiring Platform</span>
                </div>
                <div className="flex flex-wrap gap-6 text-sm">
                  <button type="button" onClick={() => scrollToSection("features")} className="text-zinc-400 hover:text-white transition-colors font-medium">
                    Features
                  </button>
                  <button type="button" onClick={() => scrollToSection("integrations")} className="text-zinc-400 hover:text-white transition-colors font-medium">
                    Integrations
                  </button>
                  <button type="button" onClick={() => scrollToSection("testimonials")} className="text-zinc-400 hover:text-white transition-colors font-medium">
                    Testimonials
                  </button>
                  <Link href="/auth" className="text-zinc-400 hover:text-white transition-colors font-medium">
                    Log in
                  </Link>
                  <Link href="/auth" className="text-[hsl(var(--primary))] hover:underline font-semibold">
                    Get started
                  </Link>
                </div>
              </div>
              <div className="pt-8 border-t border-white/5 text-sm text-zinc-500 text-center">
                © {new Date().getFullYear()} HireOS. All rights reserved.
              </div>
            </div>
          </footer>
        </main>
      </LandingScrollContext.Provider>
    </div>
  );
}
