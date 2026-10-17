import { describe, test, expect, beforeEach } from "vitest";
import { todoApi } from "./todoApi";
import { mockTodos, resetMockTodos } from "../../../mocks/handlers";

describe("todoApi", () => {
  beforeEach(() => {
    resetMockTodos();
  });

  describe("getAll", () => {
    test("Todo一覧を作成日時の降順で取得できること", async () => {
      const todos = await todoApi.getAll();

      expect(todos).toBeInstanceOf(Array);
      expect(todos.map((todo) => todo.id)).toEqual([101, 1]);
      expect(todos.find((todo) => todo.id === 1)).toMatchObject({
        id: 1,
        parent_id: null,
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
      expect(createdTodo.parent_id).toBeNull();
      expect(createdTodo.title).toBe(newInput.title);
      expect(createdTodo.description).toBe(newInput.description);
      expect(createdTodo.is_done).toBe(false);
      expect(createdTodo.created_at).toBeDefined();
    });

    test("Todoが0件になった後も有効なIDで作成できること", async () => {
      await todoApi.delete(1);
      expect(await todoApi.getAll()).toEqual([]);

      const createdTodo = await todoApi.create({ title: "New Task" });

      expect(Number.isInteger(createdTodo.id)).toBe(true);
      expect(createdTodo.id).toBeGreaterThan(0);
      expect((await todoApi.getAll()).map((todo) => todo.id)).toEqual([createdTodo.id]);
    });

    test("削除したIDを再利用せず次のIDで作成できること", async () => {
      const firstTodo = await todoApi.create({ title: "First Task" });
      await todoApi.delete(firstTodo.id);

      const secondTodo = await todoApi.create({ title: "Second Task" });

      expect(secondTodo.id).toBe(firstTodo.id + 1);
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
    test("親Todoを削除すると子Todoも削除されること", async () => {
      const result = await todoApi.delete(1);
      expect(result).toEqual({ success: true });
      expect(await todoApi.getAll()).toEqual([]);
    });

    test("親Todoの削除で孫まで削除され、無関係なTodoは残ること", async () => {
      // 孫を登録するAPIモックは未実装のため、テスト用データを直接追加する
      mockTodos.push({
        id: 201,
        parent_id: 101,
        title: "Grandchild Task",
        description: "",
        is_done: false,
        created_at: "2026-01-01T02:00:00Z",
      });
      const unrelatedTodo = await todoApi.create({ title: "Unrelated Task" });

      await todoApi.delete(1);

      expect((await todoApi.getAll()).map((todo) => todo.id)).toEqual([unrelatedTodo.id]);
    });

    test("子Todoの削除で孫も削除され、親Todoは残ること", async () => {
      mockTodos.push({
        id: 201,
        parent_id: 101,
        title: "Grandchild Task",
        description: "",
        is_done: false,
        created_at: "2026-01-01T02:00:00Z",
      });

      await todoApi.delete(101);

      expect((await todoApi.getAll()).map((todo) => todo.id)).toEqual([1]);
    });

    test("存在しないIDを指定した場合、404エラーが発生すること", async () => {
      await expect(todoApi.delete(999)).rejects.toThrow();
    });
  });

  describe("breakdown", () => {
    test("指定したTodoのサブタスク提案を取得できること", async () => {
      const result = await todoApi.breakdown(1);

      expect(result.subtasks).toHaveLength(3);
      expect(result.subtasks[0]).toMatchObject({
        title: "必要な情報を整理する",
        description: "タスクの目的と完了条件を確認",
      });
    });

    test("存在しないIDを指定した場合、404エラーが発生すること", async () => {
      await expect(todoApi.breakdown(999)).rejects.toMatchObject({
        response: { status: 404 },
      });
    });

    test("提案を取得しても保存済みのTodoが変更されないこと", async () => {
      const beforeTodos = await todoApi.getAll();

      await todoApi.breakdown(1);

      const afterTodos = await todoApi.getAll();
      expect(afterTodos).toEqual(beforeTodos);
    });
  });

  describe("resetMockTodos", () => {
    test("リセットすると採番が初期値に戻ること", async () => {
      const firstTodo = await todoApi.create({ title: "Before Reset" });

      resetMockTodos();

      expect((await todoApi.getAll()).map((todo) => todo.id)).toEqual([101, 1]);
      const createdTodo = await todoApi.create({ title: "After Reset" });
      expect(createdTodo.id).toBe(firstTodo.id);
    });

    test("作業用Todoを直接変更しても、リセットで初期データに戻ること", async () => {
      // 直接変更し、初期データとオブジェクトを共有していないことを確認する
      mockTodos.find((todo) => todo.id === 1)!.title = "Changed Before Reset";
      resetMockTodos();

      // リセット後のオブジェクトも初期データから独立していることを確認する
      mockTodos.find((todo) => todo.id === 1)!.title = "Changed After Reset";
      resetMockTodos();

      expect((await todoApi.getAll()).find((todo) => todo.id === 1)).toMatchObject({
        title: "Learn MSW",
      });
    });
  });
});
