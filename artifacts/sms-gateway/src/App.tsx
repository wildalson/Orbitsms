import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { LanguageProvider } from "@/hooks/useLang";
import Layout from "@/components/Layout";
import AdminLayout from "@/components/AdminLayout";
import LoginPage from "@/pages/login";
import DashboardPage from "@/pages/dashboard";
import TasksPage from "@/pages/tasks";
import CreateTaskPage from "@/pages/create-task";
import TaskDetailPage from "@/pages/task-detail";
import RecordsPage from "@/pages/records";
import BillingPage from "@/pages/billing";
import StatsPage from "@/pages/stats";
import WorkspacesPage from "@/pages/workspaces";
import NotFound from "@/pages/not-found";
import AdminDashboard from "@/pages/admin/admin-dashboard";
import AdminClients from "@/pages/admin/admin-clients";
import AdminClientDetail from "@/pages/admin/admin-client-detail";
import AdminChannels from "@/pages/admin/admin-channels";
import AdminLogs from "@/pages/admin/admin-logs";
import AdminSettings from "@/pages/admin/admin-settings";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
  },
});

function Spinner() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center dark">
      <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return <Spinner />;
  if (!user) return <Redirect to="/login" />;
  return (
    <Layout>
      <Component />
    </Layout>
  );
}

function AdminRoute({ component: Component }: { component: React.ComponentType }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return <Spinner />;
  if (!user) return <Redirect to="/login" />;
  if (user.role !== "admin") return <Redirect to="/" />;
  return (
    <AdminLayout>
      <Component />
    </AdminLayout>
  );
}

function AuthRoute({ component: Component }: { component: React.ComponentType }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return <Spinner />;
  if (user) return <Redirect to={user.role === "admin" ? "/admin" : "/"} />;
  return <Component />;
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={() => <AuthRoute component={LoginPage} />} />
      {/* Admin routes */}
      <Route path="/admin" component={() => <AdminRoute component={AdminDashboard} />} />
      <Route path="/admin/clients" component={() => <AdminRoute component={AdminClients} />} />
      <Route path="/admin/clients/:id" component={() => <AdminRoute component={AdminClientDetail} />} />
      <Route path="/admin/channels" component={() => <AdminRoute component={AdminChannels} />} />
      <Route path="/admin/logs" component={() => <AdminRoute component={AdminLogs} />} />
      <Route path="/admin/settings" component={() => <AdminRoute component={AdminSettings} />} />
      {/* Client routes */}
      <Route path="/" component={() => <ProtectedRoute component={DashboardPage} />} />
      <Route path="/workspaces" component={() => <ProtectedRoute component={WorkspacesPage} />} />
      <Route path="/tasks/new" component={() => <ProtectedRoute component={CreateTaskPage} />} />
      <Route path="/tasks/:id" component={() => <ProtectedRoute component={TaskDetailPage} />} />
      <Route path="/tasks" component={() => <ProtectedRoute component={TasksPage} />} />
      <Route path="/records" component={() => <ProtectedRoute component={RecordsPage} />} />
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
        <LanguageProvider>
          <TooltipProvider>
            <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
              <Router />
            </WouterRouter>
            <Toaster />
          </TooltipProvider>
        </LanguageProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
