import { create } from 'zustand';

interface User {
  id: number;
  name: string;
  role: string;
}

interface AuthState {
  token: string | null;
  user: User | null;
  isAuth: boolean;
  setToken: (token: string) => void;
  setUser: (user: User) => void;
  logout: () => void;
}

const useAuthStore = create<AuthState>((set) => ({
  token: localStorage.getItem('access'),
  user: JSON.parse(localStorage.getItem('user') || 'null'),
  isAuth: !!localStorage.getItem('access'),

  setToken: (token) => {
    localStorage.setItem('access', token);
    set({ token, isAuth: true });
  },

  setUser: (user) => {
    localStorage.setItem('user', JSON.stringify(user));
    set({ user });
  },

  logout: () => {
    localStorage.removeItem('access');
    localStorage.removeItem('user');
    set({ token: null, user: null, isAuth: false });
  },
}));

export default useAuthStore;
