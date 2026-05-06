import { Switch, Route, Router as WouterRouter, useLocation, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import Layout from "@/components/Layout";
import LoginPage from "@/pages/login";
import DashboardPage from "@/pages/dashboard";
import TasksPage from "@/pages/tasks";
import CreateTaskPage from "@/pages/create-task";
import TaskDetailPage from "@/pages/task-detail";
import RecordsPage from "@/pages/records";
import ChannelsPage from "@/pages/channels";
import BillingPage from "@/pages/billing";
import StatsPage from "@/pages/stats";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
  },
});

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { user, isLoading } = useAuth();
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center dark">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  if (!user) return <Redirect to="/login" />;
  return (
    <Layout>
      <Component />
    </Layout>
  );
}

function AuthRoute({ component: Component }: { component: React.ComponentType }) {
  const { user, isLoading } = useAuth();
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center dark">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  if (user) return <Redirect to="/" />;
  return <Component />;
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={() => <AuthRoute component={LoginPage} />} />
      <Route path="/" component={() => <ProtectedRoute component={DashboardPage} />} />
      <Route path="/tasks/new" component={() => <ProtectedRoute component={CreateTaskPage} />} />
      <Route path="/tasks/:id" component={() => <ProtectedRoute component={TaskDetailPage} />} />
      <Route path="/tasks" component={() => <ProtectedRoute component={TasksPage} />} />
      <Route path="/records" component={() => <ProtectedRoute component={RecordsPage} />} />
      <Route path="/channels" component={() => <ProtectedRoute component={ChannelsPage} />} />
      <Route path="/billing" component={() => <ProtectedRoute component={BillingPage} />} />
      <Route path="/stats" component={() => <ProtectedRoute component={StatsPage} />} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
