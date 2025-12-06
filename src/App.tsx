import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { AuthProvider } from "./contexts/AuthContext";
import Home from "./pages/Home";
import Servers from "./pages/Servers";
import ServerSettings from "./pages/ServerSettings";
import Premium from "./pages/Premium";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/servers" component={Servers} />
      <Route path="/dashboard/:guildId" component={ServerSettings} />
      <Route path="/dashboard/:guildId/premium" component={Premium} />
      <Route>
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="text-center">
            <h1 className="font-display text-4xl font-bold text-neon mb-4">404</h1>
            <p className="text-muted-foreground">Page not found</p>
          </div>
        </div>
      </Route>
    </Switch>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router />
      </AuthProvider>
    </QueryClientProvider>
  );
}
