import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import GroupList from "@/pages/GroupList";
import CreateGroup from "@/pages/CreateGroup";
import GroupDetail from "@/pages/GroupDetail";
import { Sidebar, MobileSidebarTrigger } from "@/components/Sidebar";
import { BalanceSidebar } from "@/components/BalanceSidebar";

function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col min-h-screen bg-background font-sans text-foreground antialiased">
      {/* Top app bar */}
      <header className="border-b h-16 flex items-center px-4 bg-background border-b shadow-sm z-10">
        <div className="md:hidden mr-2">
          <MobileSidebarTrigger />
        </div>
        <h1 className="font-bold text-xl mx-auto">spltr3</h1>
      </header>
      
      {/* Main content with sidebars */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left sidebar - Navigation */}
        <Sidebar className="z-20" />
        
        {/* Main content */}
        <main className="flex-1 overflow-auto">
          <div className="container mx-auto p-6">
            {children}
          </div>
        </main>
        
        {/* Right sidebar - Balance summary */}
        <div className="hidden md:block w-72 border-l bg-muted/10 overflow-y-auto">
          <BalanceSidebar />
        </div>
      </div>

      <footer className="border-t py-4">
        <div className="container mx-auto px-4">
          <p className="text-center text-muted-foreground text-sm">
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
