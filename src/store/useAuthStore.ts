import { create } from "zustand";

interface User {
  id: number;
  name: string;
  role: string;
}

interface AuthState {
  token: string | null;
  user: User | null;
  isAuth: boolean;
  expiresAt: number | null;

  setAuth: (token: string, user: User) => void;
  logout: () => void;
}

const SIX_HOURS = 6 * 60 * 60 * 1000;

const useAuthStore = create<AuthState>((set) => ({
  token: localStorage.getItem("access"),
  user: JSON.parse(localStorage.getItem("user") || "null"),
  isAuth: !!localStorage.getItem("access"),
  expiresAt: Number(localStorage.getItem("expiresAt")) || null,

  setAuth: (token, user) => {
    const expiresAt = Date.now() + SIX_HOURS;

    localStorage.setItem("access", token);
    localStorage.setItem("user", JSON.stringify(user));
    localStorage.setItem("expiresAt", String(expiresAt));

    set({ token, user, expiresAt, isAuth: true });
  },

  logout: () => {
    localStorage.removeItem("access");
    localStorage.removeItem("user");
    localStorage.removeItem("expiresAt");

    set({ token: null, user: null, expiresAt: null, isAuth: false });
  },
}));

export default useAuthStore;
