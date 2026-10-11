import { http, HttpResponse } from "msw";

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

import type { 
    Todo, 
    TodoCreateInput, 
    TodoUpdateInput,
    TodoTree,
    SubtaskBatchCreateInput,
} from "../features/todo/types";

const INITIAL_TODOS: Todo[] = [
  {
    id: 1,
    parent_id: null,
    title: "Learn MSW",
    description: "Read the docs",
    is_done: false,
    created_at: "2026-01-01T00:00:00Z",
  },
  {
    id: 101,
    parent_id: 1,
    title: "Read setup guide",
    description: "",
    is_done: false,
    created_at: "2026-01-01T01:00:00Z",
  },
];

// 初期データとオブジェクトを共有しないよう、各 Todo もコピーする
export let mockTodos: Todo[] = INITIAL_TODOS.map((todo) => ({ ...todo }));

// 初期データの最大 ID の次から採番する
let nextId = Math.max(0, ...INITIAL_TODOS.map((todo) => todo.id)) + 1;

export const resetMockTodos = () => {
  mockTodos = INITIAL_TODOS.map((todo) => ({ ...todo }));
  nextId = Math.max(0, ...INITIAL_TODOS.map((todo) => todo.id)) + 1;
};

export const handlers = [
  http.get(`${BASE_URL}/api/todo/health`, () => {
    console.log("MSW: Intercepted GET /api/todo/health");
    return HttpResponse.json({ status: "ok" });
  }),

  http.get(`${BASE_URL}/api/todo/`, () => {
    console.log("MSW: Intercepted GET /api/todo/");
    const sortedTodos = [...mockTodos].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
    return HttpResponse.json(sortedTodos);
  }),

  http.post(`${BASE_URL}/api/todo/`, async ({ request }) => {
    console.log("MSW: Intercepted POST /api/todo/");
    const nextTodo = (await request.json()) as TodoCreateInput;
    const newTodo: Todo = {
      id: nextId,
      parent_id: null,
      title: nextTodo.title,
      description: nextTodo.description ?? "",
      is_done: false,
      created_at: new Date().toISOString(),
    };
    // 次の作成で使う ID に進める
    nextId = nextId + 1;

    mockTodos.unshift(newTodo);
    return HttpResponse.json(newTodo, { status: 200 });
  }),

  http.put(`${BASE_URL}/api/todo/:todo_id`, async ({ request, params }) => {
    const { todo_id } = params;
    console.log(`MSW: Intercepted PUT /api/todo/${todo_id}`);
    const updateTodoInput = (await request.json()) as TodoUpdateInput;
    const targetIndex = mockTodos.findIndex((t) => t.id === Number(todo_id));

    if (targetIndex === -1) {
      return new HttpResponse(null, { status: 404 });
    }

    const targetTodo = mockTodos[targetIndex];
    const updatedTodo: Todo = {
      ...targetTodo,
      title: updateTodoInput.title ?? targetTodo.title,
      description: updateTodoInput.description ?? targetTodo.description,
      is_done: updateTodoInput.is_done ?? targetTodo.is_done,
    };

    mockTodos[targetIndex] = updatedTodo;
    return HttpResponse.json(updatedTodo, { status: 200 });
  }),

  http.delete(`${BASE_URL}/api/todo/:todo_id`, ({ params }) => {
    const { todo_id } = params;
    console.log(`MSW: Intercepted DELETE /api/todo/${todo_id}`);
    const targetIndex = mockTodos.findIndex((t) => t.id === Number(todo_id));

    if (targetIndex === -1) {
      return new HttpResponse(null, { status: 404 });
    }

    // 削除対象の Todo と、その子孫の ID を集める
    const idsToDelete = new Set<number>([Number(todo_id)]);
    const pendingIds = [Number(todo_id)];

    while (pendingIds.length > 0) {
      const parentId = pendingIds.pop()!;

      for (const todo of mockTodos) {
        if (todo.parent_id === parentId && !idsToDelete.has(todo.id)) {
          idsToDelete.add(todo.id);
          pendingIds.push(todo.id);
        }
      }
    }

    // 集めた ID に該当する Todo をまとめて削除する
    mockTodos = mockTodos.filter((todo) => !idsToDelete.has(todo.id));
    return HttpResponse.json({ success: true }, { status: 200 });
  }),
];
