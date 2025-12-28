import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import Sidebar from "./sidebar";

interface MobileHeaderProps {
  title: string;
}

export default function MobileHeader({ title }: MobileHeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };
  
  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
  };
  
  return (
    <>
      <div className="md:hidden bg-sidebar text-sidebar-foreground">
        <div className="flex items-center justify-between px-4 py-3">
          <h1 className="text-lg font-semibold">HireOS</h1>
          <Button
            variant="ghost"
            size="sm"
            className="text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
            onClick={toggleMobileMenu}
          >
            {!mobileMenuOpen && (
              <Menu className="h-6 w-6" />
            )}
          </Button>
        </div>
      </div>
      
      {mobileMenuOpen && (
        <Sidebar 
          mobileMenuOpen={mobileMenuOpen} 
          onCloseMobileMenu={closeMobileMenu} 
        />
      )}
    </>
  );
}
