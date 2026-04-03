import axios from "axios";
import useAuthStore from "../store/useAuthStore";
import { queryClient } from "../main";

export const API = axios.create({
  baseURL: "https://easypos.uz/api",
  headers: {
    "Content-Type": "application/json",
  },
});

API.interceptors.request.use((config) => {
  const { token, expiresAt, logout } = useAuthStore.getState();

  if (expiresAt && Date.now() > expiresAt) {
    logout();
    return config;
  }

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

API.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      logoutAndRedirect();
    }
    return Promise.reject(error);
  },
);

function logoutAndRedirect() {
  const { logout } = useAuthStore.getState();
  logout();

  queryClient?.clear();
}
