import { createRoot, type Root } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { MantineProvider } from "@mantine/core";
import App from "./App.tsx";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { Notifications } from "@mantine/notifications";
import "./i18n";
import "./index.css";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 15 * 60 * 1000,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      refetchOnMount: false,
      retry: (failureCount: number, error: unknown) => {
        const err = error as { response?: { status?: number } };
        if (err?.response?.status === 403) return false;
        return failureCount < 2;
      },
    },
  },
});

const container = document.getElementById("root")!;
const globalForRoot = globalThis as unknown as { __reactRoot?: Root };
const root = globalForRoot.__reactRoot ?? (globalForRoot.__reactRoot = createRoot(container));

root.render(
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <MantineProvider>
        <App />
        <Notifications position="top-right" />
      </MantineProvider>
    </BrowserRouter>
    <ReactQueryDevtools initialIsOpen={false} />
  </QueryClientProvider>,
);
