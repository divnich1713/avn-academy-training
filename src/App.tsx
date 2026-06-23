import React, { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useAuth } from "./lib/useAuth";
import Icon from "@/components/ui/icon";

// Helper to reload page when lazy load fails (e.g. after a redeployment when old chunks are deleted)
const safeLazy = (importFn: () => Promise<any>) => {
  return lazy(async () => {
    try {
      return await importFn();
    } catch (error) {
      console.error("Chunk loading failed, forcing page reload:", error);
      window.location.reload();
      return { default: () => null };
    }
  });
};

// Lazy-load pages
const Index = safeLazy(() => import("./pages/Index"));
const NotFound = safeLazy(() => import("./pages/NotFound"));
const LoginPage = safeLazy(() => import("./components/academy/LoginPage"));

// Configure default cache options for optimization
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000, // Consider data fresh for 30 seconds
      gcTime: 5 * 60 * 1000, // Keep unused cache for 5 minutes (gcTime replaces cacheTime in react-query v5)
      refetchOnWindowFocus: false, // Prevent redundant background refetches
    },
  },
});

function AppContent() {
  const { user, loading, login, reloadUser, logout } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Icon name="Loader2" size={32} className="text-primary animate-spin" />
          <p className="rank-badge text-muted-foreground">Проверка авторизации...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <Suspense fallback={
        <div className="min-h-screen bg-background flex items-center justify-center">
          <Icon name="Loader2" size={32} className="text-primary animate-spin" />
        </div>
      }>
        <LoginPage onLogin={(u, _token) => login(u)} />
      </Suspense>
    );
  }

  return (
    <BrowserRouter>
      <Suspense fallback={
        <div className="min-h-screen bg-background flex items-center justify-center">
          <Icon name="Loader2" size={32} className="text-primary animate-spin" />
        </div>
      }>
        <Routes>
          <Route path="/" element={<Index authUser={user} onLogout={logout} onReloadUser={reloadUser} />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AppContent />
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
