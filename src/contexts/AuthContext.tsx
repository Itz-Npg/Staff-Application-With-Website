import { createContext, useContext, ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { DiscordUser } from "@shared/schema";

interface AuthContextType {
  user: DiscordUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  refetch: () => void;
  logout: () => Promise<void>;
  login: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  
  const { data: authStatus, isLoading: statusLoading } = useQuery<{ connected: boolean }>({
    queryKey: ["/api/auth/status"],
  });

  const { data: user, isLoading: userLoading, refetch } = useQuery<DiscordUser>({
    queryKey: ["/api/auth/user"],
    enabled: authStatus?.connected === true,
  });

  const isLoading = statusLoading || (authStatus?.connected && userLoading);
  const isAuthenticated = !!user && authStatus?.connected === true;

  const login = async () => {
    try {
      const response = await fetch("/api/auth/login");
      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error("Failed to get login URL:", error);
    }
  };

  const logout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      queryClient.setQueryData(["/api/auth/status"], { connected: false });
      queryClient.setQueryData(["/api/auth/user"], null);
    } catch (error) {
      console.error("Failed to logout:", error);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user: user || null,
        isLoading,
        isAuthenticated,
        refetch,
        logout,
        login,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
