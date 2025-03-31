import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";

// Icons
import { 
  PlusCircle, 
  Menu,
  List,
  ChevronLeft,
  ChevronRight,
  LogOut,
  User,
  Users
} from "lucide-react";

// UI Components
import { Button } from "./ui/button";
import { Sheet, SheetContent, SheetTrigger } from "./ui/sheet";
import { Separator } from "./ui/separator";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { getQueryFn, queryClient } from "@/lib/queryClient";

// Types
import type { User as UserType } from "@shared/schema";

// Logo Component
const Logo = () => (
  <svg 
    className="h-6 w-6 text-primary" 
    viewBox="0 0 24 24" 
    fill="none" 
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M3 6.5C3 4.01472 5.01472 2 7.5 2C9.98528 2 12 4.01472 12 6.5C12 8.98528 9.98528 11 7.5 11C5.01472 11 3 8.98528 3 6.5Z" fill="currentColor" fillOpacity="0.8"/>
    <path d="M12 6.5C12 4.01472 14.0147 2 16.5 2C18.9853 2 21 4.01472 21 6.5C21 8.98528 18.9853 11 16.5 11C14.0147 11 12 8.98528 12 6.5Z" fill="currentColor"/>
    <path d="M3 17.5C3 15.0147 5.01472 13 7.5 13C9.98528 13 12 15.0147 12 17.5C12 19.9853 9.98528 22 7.5 22C5.01472 22 3 19.9853 3 17.5Z" fill="currentColor"/>
    <path d="M12 17.5C12 15.0147 14.0147 13 16.5 13C18.9853 13 21 15.0147 21 17.5C21 19.9853 18.9853 22 16.5 22C14.0147 22 12 19.9853 12 17.5Z" fill="currentColor" fillOpacity="0.8"/>
  </svg>
);

// User Profile Component
function UserProfile({ isCollapsed = false }: { isCollapsed?: boolean }) {
  const { data: currentUser, isLoading } = useQuery<UserType | null>({
    queryKey: ['/api/auth/me'],
    queryFn: getQueryFn({ 
      on401: "returnNull" 
    }),
    staleTime: 60000,
    retry: false
  });

  if (isLoading) {
    return (
      <div className={cn(
        "flex items-center gap-2 px-2 py-2 mb-3 border-b border-border/50 pb-3",
        isCollapsed && "justify-center"
      )}>
        <div className="relative">
          <Avatar className="h-8 w-8 ring-2 ring-primary/10 ring-offset-1">
            <AvatarFallback className="text-xs bg-primary/10 text-primary/70">...</AvatarFallback>
          </Avatar>
          <div className="absolute -bottom-1 -right-1 h-3 w-3 rounded-full bg-green-500 border-2 border-background"></div>
        </div>
        {!isCollapsed && <div className="h-3.5 w-16 bg-muted rounded animate-pulse"></div>}
      </div>
    );
  }

  const userInitial = currentUser?.firstName 
    ? currentUser.firstName.charAt(0) 
    : (currentUser?.displayName?.charAt(0) || currentUser?.email?.charAt(0) || 'G');
  
  const displayName = currentUser?.firstName && currentUser?.lastName 
    ? `${currentUser.firstName} ${currentUser.lastName}` 
    : currentUser?.displayName || currentUser?.email?.split('@')[0] || 'Guest User';

  return (
    <div className={cn(
      "flex items-center gap-2 px-2 py-2 mb-3 border-b border-border/50 pb-3",
      isCollapsed && "justify-center"
    )}>
      <div className="relative">
        <Avatar className="h-8 w-8 ring-2 ring-primary/10 ring-offset-1">
          <AvatarFallback className="text-xs bg-primary/10 text-primary/70">{userInitial}</AvatarFallback>
        </Avatar>
        <div className="absolute -bottom-1 -right-1 h-3 w-3 rounded-full bg-green-500 border-2 border-background"></div>
      </div>
      {!isCollapsed && (
        <span className="text-sm font-medium truncate" title={displayName}>
          {displayName}
        </span>
      )}
    </div>
  );
};

// Navigation Links Component
function NavLinks({ isCollapsed = false }: { isCollapsed?: boolean }) {
  const [location, setLocation] = useLocation();
  
  // Check if user is authenticated
  const { data: currentUser, isLoading } = useQuery<UserType | null>({
    queryKey: ['/api/auth/me'],
    queryFn: getQueryFn({ 
      on401: "returnNull" 
    }),
    staleTime: 60000,
    retry: false
  });
  
  const isAuthenticated = !!currentUser;
  
  const handleLogout = async () => {
    try {
      await fetch('/auth/logout');
      // Force query client to reset auth state
      queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
      queryClient.setQueryData(['/api/auth/me'], null);
      // Redirect to login page after logout
      window.location.href = '/login';
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };
  
  const handleLogin = () => {
    window.location.href = '/login';
  };

  // Check if a route is active
  const isActive = (path: string) => {
    if (path === '/' && location === '/') return true;
    if (path !== '/' && location.startsWith(path)) return true;
    return false;
  };

  return (
    <div className="space-y-1">
      <div className="pb-1">
        <Link href="/">
          <Button 
            variant={isActive('/') ? "secondary" : "ghost"} 
            size="sm" 
            className={cn(
              "w-full justify-start text-xs py-1.5 rounded-md",
              isCollapsed ? "justify-center px-1.5" : "pl-2.5 pr-3",
              isActive('/') && "font-medium"
            )}
          >
            <List className={cn(
              "h-3.5 w-3.5", 
              !isCollapsed && "mr-2",
              isActive('/') ? "text-primary" : "text-muted-foreground"
            )} />
            {!isCollapsed && <span>Groups</span>}
          </Button>
        </Link>
      </div>
      
      <Separator className="my-2" />
      
      <div className="pt-1">
        {isAuthenticated && (
          <Link href="/profile">
            <Button 
              variant={isActive('/profile') ? "secondary" : "ghost"} 
              size="sm" 
              className={cn(
                "w-full justify-start text-xs py-1.5 rounded-md",
                isCollapsed ? "justify-center px-1.5" : "pl-2.5 pr-3",
                isActive('/profile') && "font-medium"
              )}
            >
              <User className={cn(
                "h-3.5 w-3.5", 
                !isCollapsed && "mr-2",
                isActive('/profile') ? "text-primary" : "text-muted-foreground"
              )} />
              {!isCollapsed && <span>Profile</span>}
            </Button>
          </Link>
        )}
        
        {isAuthenticated ? (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleLogout}
            className={cn(
              "w-full justify-start text-xs py-1.5 mt-1 rounded-md",
              isCollapsed ? "justify-center px-1.5" : "pl-2.5 pr-3",
              "text-red-600 hover:text-red-700 hover:bg-red-100/30"
            )}
          >
            <LogOut className={cn("h-3.5 w-3.5", !isCollapsed && "mr-2")} />
            {!isCollapsed && <span>Sign Out</span>}
          </Button>
        ) : (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleLogin}
            className={cn(
              "w-full justify-start text-xs py-1.5 mt-1 rounded-md",
              isCollapsed ? "justify-center px-1.5" : "pl-2.5 pr-3",
              "text-green-600 hover:text-green-700 hover:bg-green-100/30"
            )}
          >
            <LogOut className={cn("h-3.5 w-3.5 rotate-180", !isCollapsed && "mr-2")} />
            {!isCollapsed && <span>Sign In</span>}
          </Button>
        )}
      </div>
    </div>
  );
};

// Mobile Menu Trigger
export function MobileSidebarTrigger() {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm"
          className="block md:hidden h-8 w-8 p-1 rounded-full bg-primary/5 hover:bg-primary/10 border border-border/50"
          aria-label="Open menu"
        >
          <Menu className="h-4 w-4 text-primary" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[240px] p-0 border-r-primary/10">
        <nav className="h-full flex flex-col bg-background">
          <div className="px-3 py-4">
            <div className="flex items-center mb-5">
              <div className="p-1.5 rounded-md bg-primary/5 mr-2">
                <Logo />
              </div>
              <h1 className="font-bold text-base bg-gradient-to-r from-primary to-primary/70 text-transparent bg-clip-text">spltr3</h1>
            </div>
            <UserProfile />
            <NavLinks />
            

          </div>
        </nav>
      </SheetContent>
    </Sheet>
  );
}

// Desktop Sidebar
interface SidebarProps {
  className?: string;
}

export function Sidebar({ className }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  
  return (
    <div 
      className={cn(
        "hidden md:flex flex-col h-screen bg-muted/20 border-r border-border/60 transition-all duration-300 relative",
        isCollapsed ? "w-[50px]" : "w-[200px]",
        className
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="px-2 py-4 flex-1">
        <div className={cn(
          "flex items-center mb-6",
          isCollapsed && "justify-center"
        )}>
          <div className={cn(
            "flex items-center justify-center",
            !isCollapsed && "mr-1.5",
            "p-1 rounded-md",
            isHovered && "bg-primary/5"
          )}>
            <Logo />
          </div>
          {!isCollapsed && 
            <h1 className="font-bold text-base bg-gradient-to-r from-primary to-primary/70 text-transparent bg-clip-text">
              spltr3
            </h1>
          }
        </div>
        
        <UserProfile isCollapsed={isCollapsed} />
        <NavLinks isCollapsed={isCollapsed} />
      </div>
      
      <Separator className="bg-border/40" />
      
      <div className="p-2 flex justify-end">
        <Button 
          variant="ghost" 
          size="sm" 
          className={cn(
            "h-6 w-6 p-0.5 rounded-full",
            isHovered && "bg-muted hover:bg-muted/80"
          )}
          onClick={() => setIsCollapsed(!isCollapsed)}
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {isCollapsed ? (
            <ChevronRight className="h-3.5 w-3.5" />
          ) : (
            <ChevronLeft className="h-3.5 w-3.5" />
          )}
        </Button>
      </div>
    </div>
  );
}