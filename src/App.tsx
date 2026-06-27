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
      sessionStorage.removeItem("chunk_reload_count");
      return await importFn();
    } catch (error) {
      console.error("Chunk loading failed:", error);
      const reloads = parseInt(sessionStorage.getItem("chunk_reload_count") || "0", 10);
      if (reloads < 3) {
        sessionStorage.setItem("chunk_reload_count", (reloads + 1).toString());
        window.location.reload();
      } else {
        console.error("Max chunk reload attempts reached. Rendering fallback error.");
        return {
          default: () => (
            <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 text-center">
              <h2 className="text-xl font-bold text-red-500 mb-2">Ошибка загрузки страницы</h2>
              <p className="text-muted-foreground mb-4">Сетевой сбой или обновление приложения. Пожалуйста, обновите страницу.</p>
              <button 
                onClick={() => { sessionStorage.removeItem("chunk_reload_count"); window.location.reload(); }}
                className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 font-mono text-xs uppercase"
              >
                Обновить вручную
              </button>
            </div>
          )
        };
      }
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
