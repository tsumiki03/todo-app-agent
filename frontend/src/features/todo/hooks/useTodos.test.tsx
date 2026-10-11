import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";
import type { ReactNode } from "react";
import { useTodos } from "./useTodos";
import { resetMockTodos } from "../../../mocks/handlers";

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

describe("useTodos (TanStack Query)", () => {
  beforeEach(() => {
    resetMockTodos();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test("初期化時にTodo一覧を自動的に取得し、todosに格納されること", async () => {
    const { result } = renderHook(() => useTodos(), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.todos).toEqual([]);

    await waitFor(() => {
      expect(result.current.todos.map((todo) => todo.id)).toEqual([101, 1]);
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.todos.find((todo) => todo.id === 1)).toMatchObject({
      id: 1,
      parent_id: null,
      title: "Learn MSW",
      is_done: false,
    });
  });

  test("addTodo を呼び出すと、新しいTodoが先頭に追加されること", async () => {
    // 実行日に左右されず、新規 Todo が初期データより新しくなる日時に固定する
    const createdAt = "2026-01-02T00:00:00.000Z";
    // Date だけを固定し、waitFor などが使うタイマーは実時間で動かす
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(createdAt));

    const { result } = renderHook(() => useTodos(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.addTodo("New Task", "Description");
    });

    await waitFor(() => {
      expect(result.current.todos.length).toBe(3);
    });

    expect(result.current.todos[0]).toMatchObject({
      title: "New Task",
      parent_id: null,
      description: "Description",
      is_done: false,
      created_at: createdAt,
    });

    expect(result.current.todos.slice(1).map((todo) => todo.id)).toEqual([101, 1]);
  });

  test("toggleTodo を呼び出すと、指定したTodoの is_done が反転すること", async () => {
    const { result } = renderHook(() => useTodos(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.todos.find((todo) => todo.id === 1)?.is_done).toBe(false);

    await act(async () => {
      await result.current.toggleTodo(1);
    });

    await waitFor(() => {
      expect(result.current.todos.find((todo) => todo.id === 1)?.is_done).toBe(true);
    });
    expect(result.current.todos.find((todo) => todo.id === 101)?.is_done).toBe(false);
  });

  test("updateTodo を呼び出すと、指定したフィールドのみが更新されること", async () => {
    const { result } = renderHook(() => useTodos(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const updateFields = {
      title: "Edited Title",
      description: "Edited Description",
    };

    await act(async () => {
      await result.current.updateTodo(1, updateFields);
    });

    await waitFor(() => {
      expect(result.current.todos.find((todo) => todo.id === 1)).toMatchObject({
        id: 1,
        title: "Edited Title",
        description: "Edited Description",
        is_done: false,
      });
    });
  });

  test("deleteTodo で親Todoを削除すると、再取得後の一覧から子Todoも除外されること", async () => {
    const { result } = renderHook(() => useTodos(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.deleteTodo(1);
    });

    await waitFor(() => {
      expect(result.current.todos.length).toBe(0);
    });
  });
});
