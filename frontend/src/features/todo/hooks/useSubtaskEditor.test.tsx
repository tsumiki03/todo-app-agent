import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe } from "vitest";
import type { ReactNode } from "react";
import { resetMockTodos } from "../../../mocks/handlers";

// キャッシュの無効化も確認できるよう、QueryClient とラッパーを返す
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
        staleTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  return { queryClient, wrapper };
};

describe("useSubtaskEditor (TanStack Query)", () => {
  beforeEach(() => {
    resetMockTodos();
  });
});
