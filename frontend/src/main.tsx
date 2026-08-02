import "@mantine/core/styles.css";

import { MantineProvider } from "@mantine/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";

// QueryClient のインスタンスを作成
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // 必要に応じてオプションを設定
      // ウィンドウフォーカス時の自動再取得をオフ
      refetchOnWindowFocus: false,
      // エラー時のリトライ回数（デフォルトは 3 回）
      retry: 1,
    },
  },
});

async function enableMocking() {
  if (import.meta.env.VITE_ENABLE_MOCK !== "true") {
    return;
  }

  const { worker } = await import("./mocks/browser");

  return worker.start({
    onUnhandledRequest: "bypass",
  });
}

enableMocking().then(() => {
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <MantineProvider>
          <App />
        </MantineProvider>
      </QueryClientProvider>
    </StrictMode>,
  );
});
