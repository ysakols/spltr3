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
import PrivacyPolicy from "@/pages/PrivacyPolicy";
import TermsOfService from "@/pages/TermsOfService";
import Profile from "@/pages/Profile";
import { Header } from "@/components/Header";
import { BalanceSidebar } from "@/components/BalanceSidebar";
import { SettlementModal } from "@/components/SettlementModal";
import { useState, useEffect } from "react";

function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col min-h-screen max-h-screen bg-background font-sans text-foreground antialiased">
      {/* Header with navigation */}
      <Header />
      
      {/* Main content with right sidebar */}
      <div className="flex flex-1 overflow-hidden">
        {/* Main content */}
        <main className="flex-1 overflow-auto bg-muted/5">
          <div className="container mx-auto px-1 sm:px-2 md:px-3 pt-4 pb-16 max-w-full md:max-w-[800px] lg:max-w-[900px]">
            {children}
          </div>
        </main>
        
        {/* Right sidebar - Balance summary */}
        <div className="hidden md:block w-[450px] border-l border-border/30 bg-background overflow-auto z-10">
          <BalanceSidebar />
        </div>
      </div>

      <footer className="border-t py-1.5 absolute bottom-0 w-full bg-background">
        <div className="container mx-auto px-2 sm:px-3">
          <p className="text-center text-muted-foreground text-xs">
            &copy; {new Date().getFullYear()} spltr3. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}

function App() {
  const [location] = useLocation();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Check if user is authenticated
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/auth/me');
        if (response.ok) {
          const userData = await response.json();
          setUser(userData);
        }
      } catch (error) {
        console.error('Auth check failed:', error);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  // Check if current route is authentication-related or legal pages
  const isAuthRoute = location.startsWith('/login') || 
                      location.startsWith('/invitation') || 
                      location.startsWith('/privacy-policy') || 
                      location.startsWith('/terms-of-service');

  // Show loading state while checking authentication
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Redirect to login if not authenticated and not on an auth route
  if (!user && !isAuthRoute) {
    // Use the wouter navigation instead of window.location to prevent full page reload
    window.location.replace(`/login?redirect=${encodeURIComponent(location)}`);
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        <span className="ml-2">Redirecting to login...</span>
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      {isAuthRoute ? (
        // Authentication routes (no layout)
        <Switch>
          <Route path="/login" component={Login} />
          <Route path="/invitation/:token" component={Invitation} />
          <Route path="/privacy-policy" component={PrivacyPolicy} />
          <Route path="/terms-of-service" component={TermsOfService} />
          <Route component={NotFound} />
        </Switch>
      ) : (
        // Main app with layout - only accessible when authenticated
        <Layout>
          <Switch>
            <Route path="/" component={GroupList} />
            <Route path="/create" component={CreateGroup} />
            <Route path="/groups/:groupId" component={GroupDetail} />
            <Route path="/profile" component={Profile} />
            <Route component={NotFound} />
          </Switch>
        </Layout>
      )}
      <SettlementModal />
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;
