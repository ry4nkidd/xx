import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { User } from "@shared/schema";

interface AuthUser extends User {
  sessionId?: string;
}

interface LoginCredentials {
  username: string;
  password: string;
}

interface SignupData {
  username: string;
  displayName: string;
  password: string;
  confirmPassword: string;
}

export function useAuth() {
  const queryClient = useQueryClient();
  
  // Get session from localStorage
  const getStoredSession = () => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('sessionId');
    }
    return null;
  };

  const { data: user, isLoading, error } = useQuery<AuthUser>({
    queryKey: ["/api/auth/me"],
    queryFn: async ({ queryKey }) => {
      const sessionId = getStoredSession();
      if (!sessionId) {
        throw new Error("No session");
      }

      const response = await fetch(queryKey[0], {
        headers: {
          'Authorization': `Bearer ${sessionId}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem('sessionId');
          throw new Error("Not authenticated");
        }
        throw new Error("Failed to fetch user");
      }

      return response.json();
    },
    retry: false,
    enabled: !!getStoredSession(),
  });

  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginCredentials) => {
      const response = await apiRequest("POST", "/api/auth/login", credentials);
      return response.json();
    },
    onSuccess: (userData: AuthUser) => {
      if (userData.sessionId) {
        localStorage.setItem('sessionId', userData.sessionId);
        queryClient.setQueryData(["/api/auth/me"], userData);
        queryClient.invalidateQueries({ queryKey: ["/api/rooms"] });
      }
    },
  });

  const signupMutation = useMutation({
    mutationFn: async (signupData: SignupData) => {
      const response = await apiRequest("POST", "/api/auth/signup", signupData);
      return response.json();
    },
    onSuccess: (userData: AuthUser) => {
      if (userData.sessionId) {
        localStorage.setItem('sessionId', userData.sessionId);
        queryClient.setQueryData(["/api/auth/me"], userData);
        queryClient.invalidateQueries({ queryKey: ["/api/rooms"] });
      }
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      const sessionId = getStoredSession();
      if (sessionId) {
        await apiRequest("POST", "/api/auth/logout", { sessionId });
      }
    },
    onSuccess: () => {
      localStorage.removeItem('sessionId');
      queryClient.setQueryData(["/api/auth/me"], null);
      queryClient.removeQueries();
    },
  });

  const isAuthenticated = !!user && !error;
  const hasSession = !!getStoredSession();

  return {
    user,
    isLoading: isLoading && hasSession,
    isAuthenticated,
    hasSession,
    login: loginMutation.mutate,
    signup: signupMutation.mutate,
    logout: logoutMutation.mutate,
    loginError: loginMutation.error,
    signupError: signupMutation.error,
    isLoginPending: loginMutation.isPending,
    isSignupPending: signupMutation.isPending,
    isLogoutPending: logoutMutation.isPending,
  };
}