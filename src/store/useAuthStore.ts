import { create } from "zustand";

interface Permission {
  id: number;
  name: string;
}

interface UserRole {
  id: number;
  name: string;
  permissions?: Permission[];
}

interface User {
  id: number;
  name?: string;
  full_name?: string;
  username?: string;
  role?: string;
  roles?: UserRole[];
}

interface AuthState {
  token: string | null;
  user: User | null;
  isAuth: boolean;
  expiresAt: number | null;

  setAuth: (token: string, user: User) => void;
  setUser: (user: User) => void;
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

  setUser: (user) => {
    localStorage.setItem("user", JSON.stringify(user));
    set({ user });
  },

  logout: () => {
    localStorage.removeItem("access");
    localStorage.removeItem("user");
    localStorage.removeItem("expiresAt");

    set({ token: null, user: null, expiresAt: null, isAuth: false });
  },
}));

export default useAuthStore;
