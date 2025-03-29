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
import { getQueryFn } from "@/lib/queryClient";

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
        "flex items-center gap-2 px-2 py-2 mb-3 border-b border-gray-100 pb-3",
        isCollapsed && "justify-center"
      )}>
        <Avatar className="h-7 w-7">
          <AvatarFallback className="text-xs bg-primary/20">...</AvatarFallback>
        </Avatar>
        {!isCollapsed && <div className="h-3.5 w-16 bg-gray-200 rounded animate-pulse"></div>}
      </div>
    );
  }

  const userInitial = currentUser?.firstName 
    ? currentUser.firstName.charAt(0) 
    : currentUser?.username?.charAt(0) || 'U';
  
  const displayName = currentUser?.firstName && currentUser?.lastName 
    ? `${currentUser.firstName} ${currentUser.lastName}` 
    : currentUser?.displayName || currentUser?.username || 'User';

  return (
    <div className={cn(
      "flex items-center gap-2 px-2 py-2 mb-3 border-b border-gray-100 pb-3",
      isCollapsed && "justify-center"
    )}>
      <Avatar className="h-7 w-7">
        <AvatarFallback className="text-xs bg-primary/20">{userInitial}</AvatarFallback>
      </Avatar>
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
  const [, setLocation] = useLocation();
  
  const handleLogout = async () => {
    try {
      await fetch('/auth/logout');
      // Redirect to login page after logout
      setLocation('/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <div className="space-y-0.5">
      <Link href="/">
        <Button variant="ghost" size="sm" className={cn(
          "w-full justify-start text-xs py-1",
          isCollapsed && "justify-center px-1"
        )}>
          <List className={cn("h-3.5 w-3.5", !isCollapsed && "mr-1")} />
          {!isCollapsed && <span>Groups</span>}
        </Button>
      </Link>
      <Link href="/contacts">
        <Button variant="ghost" size="sm" className={cn(
          "w-full justify-start text-xs py-1",
          isCollapsed && "justify-center px-1"
        )}>
          <Users className={cn("h-3.5 w-3.5", !isCollapsed && "mr-1")} />
          {!isCollapsed && <span>Contacts</span>}
        </Button>
      </Link>
      <Link href="/create">
        <Button variant="ghost" size="sm" className={cn(
          "w-full justify-start text-xs py-1",
          isCollapsed && "justify-center px-1"
        )}>
          <PlusCircle className={cn("h-3.5 w-3.5", !isCollapsed && "mr-1")} />
          {!isCollapsed && <span>Create Group</span>}
        </Button>
      </Link>
      
      <Separator className="my-2" />
      
      <Link href="/profile">
        <Button 
          variant="ghost" 
          size="sm" 
          className={cn(
            "w-full justify-start text-xs py-1",
            isCollapsed && "justify-center px-1"
          )}
        >
          <User className={cn("h-3.5 w-3.5", !isCollapsed && "mr-1")} />
          {!isCollapsed && <span>Profile</span>}
        </Button>
      </Link>
      
      <Button 
        variant="ghost" 
        size="sm" 
        onClick={handleLogout}
        className={cn(
          "w-full justify-start text-xs py-1 text-red-600 hover:text-red-700 hover:bg-red-100/30",
          isCollapsed && "justify-center px-1"
        )}
      >
        <LogOut className={cn("h-3.5 w-3.5", !isCollapsed && "mr-1")} />
        {!isCollapsed && <span>Sign Out</span>}
      </Button>
    </div>
  );
};

// Mobile Menu Trigger
export function MobileSidebarTrigger() {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button 
          variant="outline" 
          size="sm"
          className="block md:hidden h-7 w-7 p-1"
          aria-label="Open menu"
        >
          <Menu className="h-4 w-4 text-primary" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[160px] sm:w-[180px] p-0">
        <nav className="h-full flex flex-col bg-muted/40">
          <div className="px-2 py-3">
            <div className="flex items-center mb-4">
              <Logo />
              <h1 className="ml-1.5 font-bold text-base bg-gradient-to-r from-primary to-primary/70 text-transparent bg-clip-text">spltr3</h1>
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
  
  return (
    <div 
      className={cn(
        "hidden md:flex flex-col h-screen bg-muted/40 border-r transition-all duration-300",
        isCollapsed ? "w-[40px]" : "w-[160px]",
        className
      )}
    >
      <div className="px-1.5 py-3 flex-1">
        <div className={cn(
          "flex items-center mb-4",
          isCollapsed && "justify-center"
        )}>
          <Logo />
          {!isCollapsed && <h1 className="ml-1.5 font-bold text-base bg-gradient-to-r from-primary to-primary/70 text-transparent bg-clip-text">spltr3</h1>}
        </div>
        
        <UserProfile isCollapsed={isCollapsed} />
        <NavLinks isCollapsed={isCollapsed} />
      </div>
      
      <Separator />
      
      <div className="p-1.5 flex justify-end">
        <Button 
          variant="ghost" 
          size="sm" 
          className="h-6 w-6 p-0.5"
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