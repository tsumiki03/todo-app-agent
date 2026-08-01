import { describe, test, expect, beforeEach } from "vitest";
import { todoApi } from "./todoApi";
import { resetMockTodos } from "../../../mocks/handlers";

describe("todoApi", () => {
  beforeEach(() => {
    resetMockTodos();
  });

  describe("getAll", () => {
    test("Todo一覧を正しく取得できること", async () => {
      const todos = await todoApi.getAll();

      expect(todos).toBeInstanceOf(Array);
      expect(todos.length).toBeGreaterThan(0);
      expect(todos[0]).toMatchObject({
        id: 1,
        title: "Learn MSW",
        description: "Read the docs",
        is_done: false,
        created_at: "2026-01-01T00:00:00Z",
      });
    });
  });

  describe("create", () => {
    test("Todoを新規作成できること", async () => {
      const newInput = {
        title: "New Task",
        description: "Description of New Task",
      };

      const createdTodo = await todoApi.create(newInput);
      expect(createdTodo.id).toBeDefined();
      expect(createdTodo.title).toBe(newInput.title);
      expect(createdTodo.description).toBe(newInput.description);
      expect(createdTodo.is_done).toBe(false);
      expect(createdTodo.created_at).toBeDefined();
    });
  });

  describe("update", () => {
    test("指定したIDのTodoを更新できること", async () => {
      const updateInput = {
        title: "Updated Title",
        is_done: true,
      };

      const updatedTodo = await todoApi.update(1, updateInput);
      expect(updatedTodo.id).toBe(1);
      expect(updatedTodo.title).toBe(updateInput.title);
      expect(updatedTodo.description).toBe("Read the docs");
      expect(updatedTodo.is_done).toBe(updateInput.is_done);
      expect(updatedTodo.created_at).toBe("2026-01-01T00:00:00Z");
    });

    test("存在しないIDを指定した場合、404エラーが発生すること", async () => {
      const updateInput = { title: "Ghost" };
      await expect(todoApi.update(999, updateInput)).rejects.toThrow();
    });
  });

  describe("delete", () => {
    test("指定したIDのTodoを削除できること", async () => {
      const result = await todoApi.delete(1);
      expect(result).toEqual({ success: true });
    });

    test("存在しないIDを指定した場合、404エラーが発生すること", async () => {
      await expect(todoApi.delete(999)).rejects.toThrow();
    });
  });
});
