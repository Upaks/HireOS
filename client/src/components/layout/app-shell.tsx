import { ReactNode, useState } from "react";
import { useLocation } from "wouter";
import Sidebar from "./sidebar";
import MobileHeader from "./mobile-header";
import { cn } from "@/lib/utils";

interface AppShellProps {
  children: ReactNode;
  hideSidebar?: boolean;
}

export default function AppShell({ children, hideSidebar }: AppShellProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [location] = useLocation();
  
  // Hide sidebar for workflow builder
  const shouldHideSidebar = hideSidebar || location.includes("/workflows/new") || location.includes("/workflows/") && location.includes("/edit");

  return (
    <div className="flex h-screen overflow-hidden">
      {!shouldHideSidebar && <Sidebar />}
      
      <div className="flex flex-col flex-1 overflow-hidden">
        {!shouldHideSidebar && <MobileHeader title="HireOS" />}
        
        <main className={cn(
          "flex-1 overflow-y-auto",
          mobileMenuOpen && "hidden md:block"
        )}>
          {children}
        </main>
      </div>
    </div>
  );
}
