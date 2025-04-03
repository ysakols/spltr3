import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";

// Icons
import { 
  PlusCircle, 
  Menu,
  List,
  LogOut,
  User,
  Users
} from "lucide-react";

// UI Components
import { Button } from "./ui/button";
import { Sheet, SheetContent, SheetTrigger } from "./ui/sheet";
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

// Mobile Menu
export function MobileMenu() {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm"
          className="h-9 w-9 p-0 rounded-full"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
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
            
            <div className="space-y-2">
              {/* Home Link */}
              <Link href="/">
                <Button 
                  variant="ghost"
                  size="sm" 
                  className="w-full justify-start"
                >
                  <List className="h-4 w-4 mr-2" />
                  <span>Groups</span>
                </Button>
              </Link>
              
              {/* Profile Link */}
              <Link href="/profile">
                <Button 
                  variant="ghost"
                  size="sm" 
                  className="w-full justify-start"
                >
                  <User className="h-4 w-4 mr-2" />
                  <span>Profile</span>
                </Button>
              </Link>
              
              {/* Logout Button */}
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => {
                  fetch('/auth/logout').then(() => {
                    queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
                    queryClient.setQueryData(['/api/auth/me'], null);
                    window.location.href = '/login';
                  });
                }}
                className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-100/30"
              >
                <LogOut className="h-4 w-4 mr-2" />
                <span>Sign Out</span>
              </Button>
            </div>
          </div>
        </nav>
      </SheetContent>
    </Sheet>
  );
}

export function Header() {
  const [location] = useLocation();
  
  // Check if user is authenticated
  const { data: currentUser, isLoading } = useQuery<UserType | null>({
    queryKey: ['/api/auth/me'],
    queryFn: getQueryFn({ 
      on401: "returnNull" 
    }),
    staleTime: 60000,
    retry: false
  });

  // Get user initial for avatar
  const userInitial = currentUser?.name 
    ? currentUser.name.charAt(0) 
    : (currentUser?.email?.charAt(0) || 'G');
  
  // Get display name
  const displayName = currentUser?.name
    ? currentUser.name
    : currentUser?.email?.split('@')[0] || 'Guest User';

  // Check if a route is active
  const isActive = (path: string) => {
    if (path === '/' && location === '/') return true;
    if (path !== '/' && location.startsWith(path)) return true;
    return false;
  };

  return (
    <header className="border-b border-border/30 bg-background py-2.5 px-4">
      <div className="flex items-center justify-between">
        {/* Left section - Logo and main navigation */}
        <div className="flex items-center">
          {/* Mobile menu button - visible on mobile only */}
          <div className="block md:hidden mr-2">
            <MobileMenu />
          </div>
          
          {/* Logo */}
          <Link href="/">
            <div className="flex items-center mr-6">
              <div className="p-1 rounded-md bg-primary/5 mr-1.5">
                <Logo />
              </div>
              <h1 className="font-bold text-base bg-gradient-to-r from-primary to-primary/70 text-transparent bg-clip-text">spltr3</h1>
            </div>
          </Link>
          
          {/* Main navigation - hidden on mobile */}
          <div className="hidden md:flex items-center space-x-1">
            <Link href="/">
              <Button 
                variant={isActive('/') ? "secondary" : "ghost"} 
                size="sm" 
                className={cn(
                  "h-9",
                  isActive('/') && "font-medium"
                )}
              >
                <List className={cn(
                  "h-4 w-4 mr-2", 
                  isActive('/') ? "text-primary" : "text-muted-foreground"
                )} />
                Groups
              </Button>
            </Link>
            
            <Link href="/create">
              <Button 
                variant="outline" 
                size="sm" 
                className="h-9"
              >
                <PlusCircle className="h-4 w-4 mr-1 text-primary" />
                New Group
              </Button>
            </Link>
          </div>
        </div>
        
        {/* Right section - User profile and actions */}
        <div className="flex items-center space-x-2">
          <Link href="/profile">
            <Button 
              variant={isActive('/profile') ? "secondary" : "ghost"} 
              size="sm" 
              className="h-9"
            >
              <User className={cn(
                "h-4 w-4 mr-2",
                isActive('/profile') ? "text-primary" : "text-muted-foreground"
              )} />
              Profile
            </Button>
          </Link>
          
          <div className="flex items-center border-l border-border/30 pl-3 ml-1">
            <div className="relative">
              <Avatar className="h-8 w-8 ring-1 ring-primary/10">
                <AvatarFallback className="text-xs bg-primary/10 text-primary/70">
                  {isLoading ? '...' : userInitial}
                </AvatarFallback>
              </Avatar>
              <div className="absolute -bottom-1 -right-1 h-2.5 w-2.5 rounded-full bg-green-500 border-2 border-background"></div>
            </div>
            
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => {
                fetch('/auth/logout').then(() => {
                  queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
                  queryClient.setQueryData(['/api/auth/me'], null);
                  window.location.href = '/login';
                });
              }}
              className="ml-2 h-8 text-sm font-normal text-red-600 hover:text-red-700 hover:bg-red-100/30"
            >
              <LogOut className="h-3.5 w-3.5 mr-1.5" />
              Sign Out
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}