import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import ChatPage from "@/pages/chat";
import LoginPage from "@/pages/login";
import { useAuth } from "@/hooks/useAuth";

function AuthenticatedRouter() {
  const { isAuthenticated, isLoading, hasSession } = useAuth();
  
  // Show loading while checking authentication
  if (isLoading && hasSession) {
    return (
      <div className="min-h-screen bg-win-bg flex items-center justify-center">
        <div className="text-win-text">Loading...</div>
      </div>
    );
  }
  
  // Show login page if not authenticated
  if (!isAuthenticated) {
    return <LoginPage />;
  }
  
  // Show main app if authenticated
  return (
    <Switch>
      <Route path="/" component={ChatPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <div className="dark">
          <Toaster />
          <AuthenticatedRouter />
        </div>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
