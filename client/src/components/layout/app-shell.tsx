import { ReactNode, useState } from "react";
import Sidebar from "./sidebar";
import MobileHeader from "./mobile-header";
import { cn } from "@/lib/utils";

interface AppShellProps {
  children: ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      
      <div className="flex flex-col flex-1 overflow-hidden">
        <MobileHeader title="HireOS" />
        
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
