import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, test, expect, beforeEach, vi } from "vitest";
import { http, HttpResponse } from "msw";
import type { ReactNode } from "react";
import { useTodoBreakdown } from "./useTodoBreakdown";
import { resetMockTodos } from "../../../mocks/handlers";
import { server } from "../../../mocks/node";
import type { TodoBreakdownResponse } from "../types";

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

describe("useTodoBreakdown (TanStack Query)", () => {
  beforeEach(() => {
    resetMockTodos();
  });

  test("初期状態では通信を行わず、取得中でもエラーでもないこと", async () => {
    const onRequest = vi.fn();
    server.use(
      http.post(`${BASE_URL}/api/todo/:todo_id/breakdown`, () => {
        onRequest();
        return HttpResponse.json({ subtasks: [] });
      }),
    );

    const { result } = renderHook(() => useTodoBreakdown(), {
      wrapper: createWrapper(),
    });

    await act(async () => {});

    expect(result.current.isPending).toBe(false);
    expect(result.current.error).toBeNull();
    expect(onRequest).not.toHaveBeenCalled();
  });

  test("提案取得中はisPendingがtrueになり、成功するとレスポンスを返すこと", async () => {
    const response: TodoBreakdownResponse = {
      subtasks: [{ title: "提案された作業", description: "作業の説明" }],
    };
    let releaseResponse!: () => void;
    const responseReady = new Promise<void>((resolve) => {
      releaseResponse = resolve;
    });
    const onRequest = vi.fn();
    server.use(
      http.post(`${BASE_URL}/api/todo/:todo_id/breakdown`, async ({ params }) => {
        onRequest(params.todo_id);
        // 通信中の状態を確認できるまでレスポンスを待機する
        await responseReady;
        return HttpResponse.json(response);
      }),
    );

    const { result } = renderHook(() => useTodoBreakdown(), {
      wrapper: createWrapper(),
    });

    let request!: Promise<TodoBreakdownResponse>;
    act(() => {
      request = result.current.breakdownTodo(1);
    });

    try {
      await waitFor(() => {
        expect(result.current.isPending).toBe(true);
        expect(onRequest).toHaveBeenCalledWith("1");
      });
      expect(result.current.error).toBeNull();
    } finally {
      // アサーションが失敗した場合も、待機中の通信を終了させる
      await act(async () => {
        releaseResponse();
        await request;
      });
    }

    await expect(request).resolves.toEqual(response);
    await waitFor(() => expect(result.current.isPending).toBe(false));
    expect(result.current.error).toBeNull();
  });

  test("取得失敗時はPromiseがrejectされ、エラーを返して取得中の状態を終了すること", async () => {
    server.use(
      http.post(
        `${BASE_URL}/api/todo/:todo_id/breakdown`,
        () => new HttpResponse(null, { status: 500 }),
      ),
    );

    const { result } = renderHook(() => useTodoBreakdown(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await expect(result.current.breakdownTodo(1)).rejects.toThrow(
        "Request failed with status code 500",
      );
    });

    await waitFor(() => {
      expect(result.current.error).toBe("Request failed with status code 500");
    });
    expect(result.current.isPending).toBe(false);
  });

  test("取得失敗後にresetを呼ぶと、エラーが初期化されること", async () => {
    server.use(
      http.post(
        `${BASE_URL}/api/todo/:todo_id/breakdown`,
        () => new HttpResponse(null, { status: 500 }),
      ),
    );

    const { result } = renderHook(() => useTodoBreakdown(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      // 失敗は想定内なので処理し、reset前のエラー状態を確認する
      await result.current.breakdownTodo(1).catch(() => {});
    });
    await waitFor(() => {
      expect(result.current.error).toBe("Request failed with status code 500");
    });

    act(() => {
      result.current.reset();
    });

    await waitFor(() => expect(result.current.error).toBeNull());
    expect(result.current.isPending).toBe(false);
  });
});
