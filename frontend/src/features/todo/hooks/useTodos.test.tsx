import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, test, expect, beforeEach } from "vitest";
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

  test("初期化時にTodo一覧を自動的に取得し、todosに格納されること", async () => {
    const { result } = renderHook(() => useTodos(), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.todos).toEqual([]);

    await waitFor(() => {
      expect(result.current.todos.length).toBeGreaterThan(0);
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.todos[0]).toMatchObject({
      id: 1,
      title: "Learn MSW",
      is_done: false,
    });
  });

  test("addTodo を呼び出すと、新しいTodoが先頭に追加されること", async () => {
    const { result } = renderHook(() => useTodos(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.addTodo("New Task", "Description");
    });

    await waitFor(() => {
      expect(result.current.todos.length).toBe(2);
    });

    console.log("Current todos:", result.current.todos);

    expect(result.current.todos[0]).toMatchObject({
      title: "New Task",
      description: "Description",
      is_done: false,
    });

    expect(result.current.todos[1].id).toBe(1);
  });

  test("toggleTodo を呼び出すと、指定したTodoの is_done が反転すること", async () => {
    const { result } = renderHook(() => useTodos(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.todos[0].is_done).toBe(false);

    await act(async () => {
      await result.current.toggleTodo(1);
    });

    await waitFor(() => {
      expect(result.current.todos[0].is_done).toBe(true);
    });
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
      expect(result.current.todos[0]).toMatchObject({
        id: 1,
        title: "Edited Title",
        description: "Edited Description",
        is_done: false,
      });
    });
  });

  test("deleteTodo を呼び出すと、指定したTodoが配列から除外されること", async () => {
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
