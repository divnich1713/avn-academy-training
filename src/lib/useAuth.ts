import { useState, useEffect } from "react";
import { apiMe, apiLogout, User } from "./api";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiMe().then((u) => {
      setUser(u);
      setLoading(false);
    });
  }, []);

  const login = (u: User) => setUser(u);

  const reloadUser = async () => {
    const u = await apiMe();
    setUser(u);
  };

  const logout = async () => {
    await apiLogout();
    setUser(null);
  };

  return { user, loading, login, reloadUser, logout };
}
