import { useAuth } from "@/hooks/use-auth";
import { UserRoles } from "@shared/schema";
import { Link, useLocation } from "wouter";
import { 
  LayoutDashboard, 
  FileText, 
  Users, 
  Calendar, 
  BarChart3, 
  CheckCircle,
  Settings,
  LogOut,
  RefreshCw,
  FileEdit,
  Plug
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

interface SidebarProps {
  mobileMenuOpen?: boolean;
  onCloseMobileMenu?: () => void;
}

export default function Sidebar({ mobileMenuOpen, onCloseMobileMenu }: SidebarProps) {
  const [location] = useLocation();
  const { user, logoutMutation } = useAuth();
  
  const isActive = (path: string) => {
    return location === path;
  };
  
  const handleLogout = () => {
    logoutMutation.mutate();
  };
  
  // Type declarations for nav items and roles
  type UserRoleValue = typeof UserRoles[keyof typeof UserRoles];
  
  interface NavItem {
    title: string;
    icon: React.ReactNode;
    href: string;
    roles: UserRoleValue[];
  }
  
  const navItems: NavItem[] = [
    {
      title: "Dashboard",
      icon: <LayoutDashboard className="h-5 w-5 mr-3" />,
      href: "/",
      roles: [UserRoles.HIRING_MANAGER, UserRoles.PROJECT_MANAGER, UserRoles.COO, UserRoles.CEO, UserRoles.DIRECTOR, UserRoles.ADMIN]
    },
    {
      title: "Job Postings",
      icon: <FileText className="h-5 w-5 mr-3" />,
      href: "/jobs",
      roles: [UserRoles.HIRING_MANAGER, UserRoles.PROJECT_MANAGER, UserRoles.COO, UserRoles.CEO, UserRoles.DIRECTOR, UserRoles.ADMIN]
    },
    {
      title: "Candidates",
      icon: <Users className="h-5 w-5 mr-3" />,
      href: "/candidates",
      roles: [UserRoles.HIRING_MANAGER, UserRoles.PROJECT_MANAGER, UserRoles.COO, UserRoles.CEO, UserRoles.DIRECTOR, UserRoles.ADMIN]
    },
    {
      title: "Interviews",
      icon: <Calendar className="h-5 w-5 mr-3" />,
      href: "/interviews",
      roles: [UserRoles.HIRING_MANAGER, UserRoles.PROJECT_MANAGER, UserRoles.COO, UserRoles.CEO, UserRoles.DIRECTOR, UserRoles.ADMIN]
    },
    {
      title: "Forms",
      icon: <FileEdit className="h-5 w-5 mr-3" />,
      href: "/forms",
      roles: [UserRoles.HIRING_MANAGER, UserRoles.PROJECT_MANAGER, UserRoles.COO, UserRoles.CEO, UserRoles.DIRECTOR, UserRoles.ADMIN]
    },
    {
      title: "Analytics",
      icon: <BarChart3 className="h-5 w-5 mr-3" />,
      href: "/analytics",
      roles: [UserRoles.PROJECT_MANAGER, UserRoles.COO, UserRoles.CEO, UserRoles.DIRECTOR, UserRoles.ADMIN]
    },
    {
      title: "Integrations",
      icon: <Plug className="h-5 w-5 mr-3" />,
      href: "/integrations",
      roles: [UserRoles.HIRING_MANAGER, UserRoles.PROJECT_MANAGER, UserRoles.COO, UserRoles.CEO, UserRoles.DIRECTOR, UserRoles.ADMIN]
    }
  ];
  
  const cooItems: NavItem[] = [
    {
      title: "Final Approvals",
      icon: <CheckCircle className="h-5 w-5 mr-3" />,
      href: "/reviews",
      roles: [UserRoles.COO, UserRoles.CEO, UserRoles.DIRECTOR, UserRoles.ADMIN]
    }
  ];
  
  const adminItems: NavItem[] = [
    {
      title: "System Settings",
      icon: <Settings className="h-5 w-5 mr-3" />,
      href: "/settings",
      roles: [UserRoles.COO, UserRoles.CEO, UserRoles.DIRECTOR, UserRoles.ADMIN]
    },
    {
      title: "CRM Sync",
      icon: <RefreshCw className="h-5 w-5 mr-3" />,
      href: "/crm-sync",
      roles: [UserRoles.COO, UserRoles.CEO, UserRoles.DIRECTOR, UserRoles.ADMIN]
    }
  ];
  
  // Helper function to check if the user's role is allowed
  const isRoleAllowed = (allowedRoles: UserRoleValue[]): boolean => {
    if (!user?.role) return false;
    return allowedRoles.includes(user.role as UserRoleValue);
  };
  
  // Filter navigation items by user role
  const filteredNavItems = navItems.filter(item => isRoleAllowed(item.roles));
  const filteredCooItems = cooItems.filter(item => isRoleAllowed(item.roles));
  const filteredAdminItems = adminItems.filter(item => isRoleAllowed(item.roles));
  
  const handleNavigation = () => {
    if (onCloseMobileMenu) {
      onCloseMobileMenu();
    }
  };
  
  const navLinkClasses = (active: boolean) => `
    flex items-center px-2 py-2 text-sm font-medium rounded-md
    ${active 
      ? "bg-sidebar-accent text-sidebar-foreground" 
      : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"}
  `;

  const sidebarClasses = `
    bg-sidebar text-sidebar-foreground flex flex-col w-64
    ${mobileMenuOpen ? 'fixed inset-0 z-40 md:hidden' : 'hidden md:flex md:flex-shrink-0'}
  `;

  if (!user) return null;
  
  return (
    <div className={sidebarClasses}>
      <div className="flex flex-col flex-1">
        <div className="px-4 py-6 border-b border-sidebar-border">
          <h1 className="text-xl font-semibold">HireOS</h1>
          <p className="text-xs text-sidebar-foreground/70 mt-1">Automated Hiring Platform</p>
        </div>
        
        <nav className="flex-1 px-2 py-4 space-y-1">
          {filteredNavItems.map((item) => (
            <Link 
              key={item.href} 
              href={item.href} 
              onClick={handleNavigation}
              className={navLinkClasses(isActive(item.href))}
            >
              {item.icon}
              {item.title}
            </Link>
          ))}
          
          {filteredCooItems.length > 0 && (
            <div className="pt-4 mt-4 border-t border-sidebar-border">
              <h3 className="px-3 text-xs font-semibold text-sidebar-foreground/50 uppercase tracking-wider">
                Executive View
              </h3>
              {filteredCooItems.map((item) => (
                <Link 
                  key={item.href} 
                  href={item.href}
                  onClick={handleNavigation}
                  className={`mt-1 ${navLinkClasses(isActive(item.href))}`}
                >
                  {item.icon}
                  {item.title}
                </Link>
              ))}
            </div>
          )}
          
          {filteredAdminItems.length > 0 && (
            <div className="pt-4 mt-4 border-t border-sidebar-border">
              <h3 className="px-3 text-xs font-semibold text-sidebar-foreground/50 uppercase tracking-wider">
                Admin Controls
              </h3>
              {filteredAdminItems.map((item) => (
                <Link 
                  key={item.href} 
                  href={item.href}
                  onClick={handleNavigation}
                  className={`mt-1 ${navLinkClasses(isActive(item.href))}`}
                >
                  {item.icon}
                  {item.title}
                </Link>
              ))}
            </div>
          )}
        </nav>
        
        <div className="px-4 py-4 border-t border-sidebar-border">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="h-8 w-8 rounded-full bg-sidebar-accent flex items-center justify-center text-white font-medium">
                {user.fullName.split(' ').map(n => n[0]).join('').toUpperCase()}
              </div>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium">{user.fullName}</p>
              <p className="text-xs text-sidebar-foreground/70">{
                user.role === UserRoles.HIRING_MANAGER 
                  ? "Hiring Manager" 
                  : user.role === UserRoles.PROJECT_MANAGER
                    ? "Project Manager"
                    : user.role === UserRoles.COO 
                      ? "Chief Operating Officer"
                      : user.role === UserRoles.CEO
                        ? "Chief Executive Officer"
                        : user.role === UserRoles.DIRECTOR
                          ? "Director"
                          : "Administrator"
              }</p>
            </div>
            <Button 
              variant="ghost" 
              size="icon"
              className="ml-auto text-sidebar-foreground/70 hover:text-sidebar-foreground"
              onClick={handleLogout}
            >
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
