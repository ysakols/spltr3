import { Link } from "wouter";
import { cn } from "@/lib/utils";
import { useState } from "react";

// Icons
import { 
  PlusCircle, 
  Menu,
  List,
  ChevronLeft,
  ChevronRight
} from "lucide-react";

// UI Components
import { Button } from "./ui/button";
import { Sheet, SheetContent, SheetTrigger } from "./ui/sheet";
import { Separator } from "./ui/separator";

// Logo Component
const Logo = () => (
  <svg 
    className="h-8 w-8 text-primary" 
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

// Navigation Links Component
const NavLinks = ({ isCollapsed = false }: { isCollapsed?: boolean }) => (
  <div className="space-y-1">
    <Link href="/">
      <Button variant="ghost" className={cn(
        "w-full justify-start",
        isCollapsed && "justify-center px-2"
      )}>
        <List className={cn("h-5 w-5", !isCollapsed && "mr-2")} />
        {!isCollapsed && <span>Groups</span>}
      </Button>
    </Link>
    <Link href="/create">
      <Button variant="ghost" className={cn(
        "w-full justify-start",
        isCollapsed && "justify-center px-2"
      )}>
        <PlusCircle className={cn("h-5 w-5", !isCollapsed && "mr-2")} />
        {!isCollapsed && <span>Create Group</span>}
      </Button>
    </Link>
  </div>
);

// Mobile Menu Trigger
export function MobileSidebarTrigger() {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className="block md:hidden"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[240px] sm:w-[280px] p-0">
        <nav className="h-full flex flex-col bg-muted/40">
          <div className="px-3 py-4">
            <div className="flex items-center mb-10">
              <Logo />
              <h1 className="ml-2 font-bold text-xl">Expense Splitter</h1>
            </div>
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
        isCollapsed ? "w-[60px]" : "w-[240px]",
        className
      )}
    >
      <div className="px-3 py-4 flex-1">
        <div className={cn(
          "flex items-center h-12 mb-10",
          isCollapsed && "justify-center"
        )}>
          <Logo />
          {!isCollapsed && <h1 className="ml-2 font-bold text-xl">Expense Splitter</h1>}
        </div>
        
        <NavLinks isCollapsed={isCollapsed} />
      </div>
      
      <Separator />
      
      <div className="p-2 flex justify-end">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => setIsCollapsed(!isCollapsed)}
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {isCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  );
}