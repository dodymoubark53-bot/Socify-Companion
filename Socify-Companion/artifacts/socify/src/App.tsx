import { useEffect } from "react";
import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { setAuthTokenGetter, setBaseUrl } from "@workspace/api-client-react/src/custom-fetch";
import { useStore } from "@/store/use-store";
import { AppShell } from "@/components/layout/app-shell";
import NotFound from "@/pages/not-found";

import Login from "@/pages/auth/login";
import Register from "@/pages/auth/register";
import ForgotPassword from "@/pages/auth/forgot-password";
import ResetPassword from "@/pages/auth/reset-password";
import Dashboard from "@/pages/dashboard";
import Inbox from "@/pages/inbox";
import Composer from "@/pages/composer";
import Calendar from "@/pages/calendar";
import Analytics from "@/pages/analytics";
import CRM from "@/pages/crm";
import Campaigns from "@/pages/campaigns";
import Listening from "@/pages/listening";
import Automations from "@/pages/automations";
import Influencers from "@/pages/influencers";
import LinkInBio from "@/pages/link-in-bio";
import Admin from "@/pages/admin";
import Settings from "@/pages/settings";
import Notifications from "@/pages/notifications";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function ProtectedRoute({ component: Component }: { component: React.ComponentType<any> }) {
  const { token } = useStore();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!token) {
      setLocation("/login");
    }
  }, [token, setLocation]);

  if (!token) return null;
  return <Component />;
}

function Router() {
  const [, setLocation] = useLocation();
  const { token } = useStore();

  useEffect(() => {
    if (window.location.pathname === "/" || window.location.pathname === import.meta.env.BASE_URL) {
      setLocation(token ? "/dashboard" : "/login");
    }
  }, [token, setLocation]);

  return (
    <AppShell>
      <Switch>
        <Route path="/login" component={Login} />
        <Route path="/register" component={Register} />
        <Route path="/forgot-password" component={ForgotPassword} />
        <Route path="/reset-password" component={ResetPassword} />
        <Route path="/dashboard"><ProtectedRoute component={Dashboard} /></Route>
        <Route path="/inbox"><ProtectedRoute component={Inbox} /></Route>
        <Route path="/composer"><ProtectedRoute component={Composer} /></Route>
        <Route path="/calendar"><ProtectedRoute component={Calendar} /></Route>
        <Route path="/analytics"><ProtectedRoute component={Analytics} /></Route>
        <Route path="/crm"><ProtectedRoute component={CRM} /></Route>
        <Route path="/campaigns"><ProtectedRoute component={Campaigns} /></Route>
        <Route path="/listening"><ProtectedRoute component={Listening} /></Route>
        <Route path="/automations"><ProtectedRoute component={Automations} /></Route>
        <Route path="/influencers"><ProtectedRoute component={Influencers} /></Route>
        <Route path="/link-in-bio"><ProtectedRoute component={LinkInBio} /></Route>
        <Route path="/admin"><ProtectedRoute component={Admin} /></Route>
        <Route path="/settings"><ProtectedRoute component={Settings} /></Route>
        <Route path="/notifications"><ProtectedRoute component={Notifications} /></Route>
        <Route path="/" component={() => null} />
        <Route component={NotFound} />
      </Switch>
    </AppShell>
  );
}

function App() {
  useEffect(() => {
    document.documentElement.classList.add("dark");
    setAuthTokenGetter(() => {
      const state = useStore.getState();
      return state.token;
    });
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
