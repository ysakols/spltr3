import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import GroupList from "@/pages/GroupList";
import CreateGroup from "@/pages/CreateGroup";
import GroupDetail from "@/pages/GroupDetail";
import Login from "@/pages/Login";
import Invitation from "@/pages/Invitation";
import { Sidebar, MobileSidebarTrigger } from "@/components/Sidebar";
import { BalanceSidebar } from "@/components/BalanceSidebar";
import { useState, useEffect } from "react";

function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col min-h-screen max-h-screen bg-background font-sans text-foreground antialiased">
      {/* Main content with sidebars */}
      <div className="flex flex-1 overflow-hidden">
        {/* Mobile Sidebar Trigger - Now floating at the top left corner for mobile */}
        <div className="md:hidden fixed top-2.5 left-2.5 z-30">
          <div className="bg-background/80 backdrop-blur-sm rounded-lg shadow-sm p-0.5">
            <MobileSidebarTrigger />
          </div>
        </div>
        {/* Left sidebar - Navigation */}
        <Sidebar className="z-20" />
        
        {/* Main content */}
        <main className="flex-1 overflow-auto">
          <div className="container mx-auto p-3 pt-10 md:pt-3 pb-16">
            {children}
          </div>
        </main>
        
        {/* Right sidebar - Balance summary */}
        <div className="hidden md:block w-64 border-l bg-muted/10 overflow-hidden">
          <BalanceSidebar />
        </div>
      </div>

      <footer className="border-t py-1.5 absolute bottom-0 w-full bg-background">
        <div className="container mx-auto px-3">
          <p className="text-center text-muted-foreground text-xs">
            &copy; {new Date().getFullYear()} spltr3. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={GroupList} />
      <Route path="/create" component={CreateGroup} />
      <Route path="/groups/:groupId" component={GroupDetail} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Layout>
        <Router />
      </Layout>
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;
