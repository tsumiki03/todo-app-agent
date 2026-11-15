import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, test, expect, beforeEach, vi } from "vitest";
import { http, HttpResponse } from "msw";
import type { ReactNode } from "react";
import type { Todo } from "../types";
import { useTodoMutations } from "./useTodoMutations";
import { resetMockTodos } from "../../../mocks/handlers";
import { server } from "../../../mocks/node";

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

// キャッシュの無効化も確認できるよう、テストごとの QueryClient とラッパーを返す
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        // テスト中に余計なリトライが発生して遅延するのを防ぐ
        retry: false,
        // キャッシュの保持時間を 0 にしてテスト間の影響を排除
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

describe("useTodoMutations (TanStack Query)", () => {
  beforeEach(() => {
    resetMockTodos();
  });
});
