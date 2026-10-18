import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, test, expect, beforeEach } from "vitest";
import { http, HttpResponse } from "msw";
import type { ReactNode } from "react";
import { useTodoTree } from "./useTodoTree";
import { resetMockTodos } from "../../../mocks/handlers";
import { server } from "../../../mocks/node";

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

// テストごとに独立した QueryClient と Provider ラッパーを作成するヘルパー関数
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

  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe("useTodoTree (TanStack Query)", () => {
  beforeEach(() => {
    resetMockTodos();
  });

  test("初期化時に親子一覧を自動的に取得し、todoTreesに格納されること", async () => {
    const { result } = renderHook(() => useTodoTree(), {
      wrapper: createWrapper(),
    });

    expect(result.current.todoTrees).toEqual([]);
    expect(result.current.isLoading).toBe(true);
    expect(result.current.error).toBeNull();

    await waitFor(() => {
      expect(result.current.todoTrees).toHaveLength(1);
    });

    expect(result.current.todoTrees[0]).toMatchObject({
      id: 1,
      subtasks: [{ id: 101, parent_id: 1 }],
    });
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  test("取得に失敗した場合、エラーメッセージを返してローディングを終了すること", async () => {
    // このテストだけ親子一覧APIを500エラーに上書きする
    server.use(
      http.get(`${BASE_URL}/api/todo/tree`, () => new HttpResponse(null, { status: 500 })),
    );

    const { result } = renderHook(() => useTodoTree(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.error).toBe("Request failed with status code 500");
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.todoTrees).toEqual([]);
  });
});
