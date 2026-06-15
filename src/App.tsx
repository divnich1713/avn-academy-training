import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import LoginPage from "./components/academy/LoginPage";
import { useAuth } from "./lib/useAuth";
import Icon from "@/components/ui/icon";

const queryClient = new QueryClient();

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
    return <LoginPage onLogin={(u, _token) => login(u)} />;
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Index authUser={user} onLogout={logout} onReloadUser={reloadUser} />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
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
