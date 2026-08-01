import { describe, test, expect, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { useTodos } from "./useTodos";
import { resetMockTodos } from "../../../mocks/handlers";

describe("useTodos", () => {
  beforeEach(() => {
    resetMockTodos();
  });

  test("初期化時にTodo一覧を自動的に取得し、todosに格納されること", async () => {
    const { result } = renderHook(() => useTodos());

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
    const { result } = renderHook(() => useTodos());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.addTodo("New Task", "Description");
    });

    expect(result.current.todos[0]).toMatchObject({
      title: "New Task",
      description: "Description",
      is_done: false,
    });

    expect(result.current.todos[1].id).toBe(1);
  });

  test("toggleTodo を呼び出すと、指定したTodoの is_done が反転すること", async () => {
    const { result } = renderHook(() => useTodos());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.todos[0].is_done).toBe(false);

    await act(async () => {
      await result.current.toggleTodo(1);
    });

    expect(result.current.todos[0].is_done).toBe(true);
  });

  test("updateTodo を呼び出すと、指定したフィールドのみが更新されること", async () => {
    const { result } = renderHook(() => useTodos());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const updateFields = {
      title: "Edited Title",
      description: "Edited Description",
    };

    await act(async () => {
      await result.current.updateTodo(1, updateFields);
    });

    expect(result.current.todos[0]).toMatchObject({
      id: 1,
      title: "Edited Title",
      description: "Edited Description",
      is_done: false,
    });
  });

  test("deleteTodo を呼び出すと、指定したTodoが配列から除外されること", async () => {
    const { result } = renderHook(() => useTodos());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.deleteTodo(1);
    });

    expect(result.current.todos.length).toBe(0);
  });
});
