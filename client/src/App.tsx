import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import GroupList from "@/pages/GroupList";
import CreateGroup from "@/pages/CreateGroup";
import GroupDetail from "@/pages/GroupDetail";
import { Sidebar, MobileSidebarTrigger } from "@/components/Sidebar";

function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-background font-sans text-foreground antialiased">
      {/* Sidebar */}
      <Sidebar />
      
      {/* Main content */}
      <div className="flex flex-col flex-1">
        <header className="border-b h-16 flex items-center px-4 md:pl-0">
          <div className="md:hidden mr-2">
            <MobileSidebarTrigger />
          </div>
          <h1 className="font-semibold md:ml-6">Expense Splitter</h1>
        </header>

        <main className="flex-1 overflow-auto">
          <div className="container mx-auto p-6">
            {children}
          </div>
        </main>

        <footer className="border-t py-4">
          <div className="container mx-auto px-4">
            <p className="text-center text-muted-foreground text-sm">
              &copy; {new Date().getFullYear()} Expense Splitter. All rights reserved.
            </p>
          </div>
        </footer>
      </div>
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
