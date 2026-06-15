import { useState } from "react";
import Icon from "@/components/ui/icon";
import { apiLogin, setToken, User } from "@/lib/api";
import { fmtStaticId } from "./SectionsShared";
import { HUDParticles } from "./HUDParticles";

interface LoginPageProps {
  onLogin: (user: User, token: string) => void;
}

export default function LoginPage({ onLogin }: LoginPageProps) {
  const [staticId, setStaticId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { token, user } = await apiLogin(staticId, password);
      setToken(token);
      onLogin(user, token);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Ошибка входа");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 relative overflow-hidden">
      <div 
        className="absolute inset-0 bg-cover bg-center opacity-40 pointer-events-none"
        style={{ 
          backgroundImage: 'url("/academy_bg.jpg")'
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/80 to-background pointer-events-none" />
      <HUDParticles />
      <div className="w-full max-w-sm relative z-10">
        <div className="flex flex-col items-center mb-8">
          <img
            src="/rosgvardia_emblem.png"
            alt="Эмблема АВНГ"
            className="w-24 h-24 object-contain mb-4 filter drop-shadow-[0_0_12px_rgba(200,168,74,0.4)]"
          />
          <h1 className="font-oswald text-2xl tracking-widest uppercase text-foreground">
            РОСГВАРДИЯ АВНГ
          </h1>
          <p className="text-xs font-mono text-muted-foreground tracking-[0.15em] uppercase mt-1">
            Учебный портал · Авторизация
          </p>
        </div>

        <div className="corner-mark bg-tactical-card border border-tactical-border p-6 card-glow">
          <div className="h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent mb-6" />

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="rank-badge text-muted-foreground block mb-1.5">
                Static ID (6 цифр)
              </label>
              <div className="relative">
                <Icon
                  name="Hash"
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                />
                <input
                  type="text"
                  maxLength={7}
                  value={fmtStaticId(staticId)}
                  onChange={(e) =>
                    setStaticId(e.target.value.replace(/\D/g, "").slice(0, 6))
                  }
                  placeholder="000-000"
                  className="w-full bg-tactical-panel border border-tactical-border pl-9 pr-3 py-2.5 text-sm text-foreground font-mono tracking-widest focus:outline-none focus:border-primary transition-colors"
                  autoComplete="username"
                />
              </div>
            </div>

            <div>
              <label className="rank-badge text-muted-foreground block mb-1.5">
                Пароль
              </label>
              <div className="relative">
                <Icon
                  name="Lock"
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-tactical-panel border border-tactical-border pl-9 pr-3 py-2.5 text-sm text-foreground font-ibm focus:outline-none focus:border-primary transition-colors"
                  autoComplete="current-password"
                />
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 bg-red-900/20 border border-red-800 px-3 py-2">
                <Icon
                  name="AlertTriangle"
                  size={14}
                  className="text-red-400 flex-shrink-0"
                />
                <p className="text-xs text-red-400 font-ibm">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || staticId.length !== 6 || !password}
              className="w-full bg-primary text-primary-foreground font-oswald text-sm tracking-widest uppercase py-2.5 px-4 hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
            >
              {loading ? (
                <>
                  <Icon name="Loader2" size={14} className="animate-spin" />
                  Вход...
                </>
              ) : (
                <>
                  <Icon name="LogIn" size={14} />
                  Войти
                </>
              )}
            </button>
          </form>

          <div className="h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent mt-6" />
        </div>

        <p className="text-center rank-badge text-muted-foreground mt-4">
          Нет доступа — обратитесь к инструктору
        </p>
      </div>
    </div>
  );
}
