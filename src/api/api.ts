import axios from "axios";
import useAuthStore from "../store/useAuthStore";
import { queryClient } from "../main";
import { notifications } from "@mantine/notifications";

export const API = axios.create({
  baseURL: "https://easypos.uz/api",
  headers: {
    "Content-Type": "application/json",
  },
});

let isNotifying = false;

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
    const status = error?.response?.status;
    const message = error?.response?.data?.message;

    if (status === 401) {
      logoutAndRedirect();
      return Promise.reject(error);
    }

    if (!isNotifying) {
      isNotifying = true;

      notifications.clean();

      notifications.show({
        color: "red",
        title: "Xatolik",
        message:
          status === 403
            ? "Sahifaga kirishga ruxsat yo'q"
            : message || "Xatolik yuz berdi",
      });

      setTimeout(() => {
        isNotifying = false;
      }, 2000);
    }

    return Promise.reject(error);
  },
);

function logoutAndRedirect() {
  const { logout } = useAuthStore.getState();
  logout();

  queryClient?.clear();
}
