import { http, HttpResponse } from "msw";

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

import type {
  Todo,
  TodoCreateInput,
  TodoUpdateInput,
} from "../features/todo/types";

const INITIAL_TODOS: Todo[] = [
  {
    id: 1,
    title: "Learn MSW",
    description: "Read the docs",
    is_done: false,
    created_at: "2026-01-01T00:00:00Z",
  },
];

export let mockTodos: Todo[] = [...INITIAL_TODOS];

export const resetMockTodos = () => {
  mockTodos = [...INITIAL_TODOS];
};

export const handlers = [
  http.get(`${BASE_URL}/api/todo/health`, () => {
    console.log("MSW: Intercepted GET /api/todo/health");
    return HttpResponse.json({ status: "ok" });
  }),

  http.get(`${BASE_URL}/api/todo/`, () => {
    console.log("MSW: Intercepted GET /api/todo/");
    return HttpResponse.json(mockTodos);
  }),

  http.post(`${BASE_URL}/api/todo/`, async ({ request }) => {
    console.log("MSW: Intercepted POST /api/todo/");
    const nextTodo = (await request.json()) as TodoCreateInput;
    const newTodo: Todo = {
      id: Math.max(...mockTodos.map((t) => t.id)) + 1,
      title: nextTodo.title,
      description: nextTodo.description ?? "",
      is_done: false,
      created_at: new Date().toISOString(),
    };
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

    mockTodos.splice(targetIndex, 1);
    return HttpResponse.json({ success: true }, { status: 200 });
  }),
];
