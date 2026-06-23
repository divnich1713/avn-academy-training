import { useState, useEffect, useCallback } from "react";
import { apiMe, apiLogout, User, getToken } from "./api";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    const timeout = setTimeout(() => {
      if (!cancelled) {
        console.warn("Auth check timed out after 10s");
        setLoading(false);
      }
    }, 10_000);

    apiMe()
      .then((u) => {
        if (!cancelled) {
          setUser(u);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error("Auth check failed:", err);
        if (!cancelled) {
          setLoading(false);
        }
      })
      .finally(() => {
        clearTimeout(timeout);
      });

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, []);

  const login = useCallback((u: User) => setUser(u), []);

  const reloadUser = useCallback(async () => {
    const u = await apiMe();
    setUser(u);
  }, []);

  const logout = useCallback(async () => {
    await apiLogout();
    setUser(null);
  }, []);

  return { user, loading, login, reloadUser, logout };
}
