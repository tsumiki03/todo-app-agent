import { http, HttpResponse } from "msw";

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

import type { 
    Todo, 
    TodoCreateInput, 
    TodoUpdateInput,
    TodoBreakdownResponse,
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

  http.get(`${BASE_URL}/api/todo/tree`, () => {
    console.log("MSW: Intercepted GET /api/todo/tree");

    // 親だけを抽出し、作成日時の降順に並べる
    const parentTodos = mockTodos
      .filter((todo) => todo.parent_id === null)
      .sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );

    // 各親をレスポンスの形に変換する（親の parent_id は含めない）
    const todoTrees: TodoTree[] = parentTodos.map((parent) => ({
      id: parent.id,
      title: parent.title,
      description: parent.description,
      is_done: parent.is_done,
      created_at: parent.created_at,
      // この親に直接紐づく子だけを集める
      subtasks: mockTodos
        .filter((todo) => todo.parent_id === parent.id)
        .map((todo) => ({
          ...todo,
          parent_id: parent.id,
        })),
    }));

    return HttpResponse.json(todoTrees);
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

  http.post(`${BASE_URL}/api/todo/:todo_id/breakdown`, ({ params }) => {
    const { todo_id } = params;
    console.log(`MSW: Intercepted POST /api/todo/${todo_id}/breakdown`);

    const targetTodo = mockTodos.find((todo) => todo.id === Number(todo_id));

    if (!targetTodo) {
      return new HttpResponse(null, { status: 404 });
    }

    // 提案のみを返し、保存済みの Todo は変更しない
    const response: TodoBreakdownResponse = {
      subtasks: [
        {
          title: "必要な情報を整理する",
          description: "タスクの目的と完了条件を確認",
        },
        {
          title: "作業を実行する",
          description: "整理した内容に沿って作業を進める",
        },
        {
          title: "結果を確認する",
          description: "完了条件を満たしているか確認",
        },
      ],
    };

    return HttpResponse.json(response, { status: 200 });
  }),

  http.post(`${BASE_URL}/api/todo/:todo_id/subtasks`, async ({ request, params }) => {
    const { todo_id } = params;
    console.log(`MSW: Intercepted POST /api/todo/${todo_id}/subtasks`);
    const data: unknown = await request.json();

    // 全件の検証が終わるまで、保存データと採番を変更しない
    if (
      typeof data !== "object" ||
      data === null ||
      !("subtasks" in data) ||
      !Array.isArray(data.subtasks) ||
      data.subtasks.length === 0 ||
      data.subtasks.some(
        (item: unknown) =>
          typeof item !== "object" ||
          item === null ||
          !("title" in item) ||
          typeof item.title !== "string" ||
          Array.from(item.title).length < 1 ||
          Array.from(item.title).length > 200 ||
          ("description" in item && typeof item.description !== "string"),
      )
    ) {
      return new HttpResponse(null, { status: 422 });
    }

    const parentTodo = mockTodos.find((todo) => todo.id === Number(todo_id));

    if (!parentTodo) {
      return new HttpResponse(null, { status: 404 });
    }

    const payload = data as SubtaskBatchCreateInput;
    const createdSubtasks: Todo[] = [];

    for (const item of payload.subtasks) {
      const newSubtask: Todo = {
        id: nextId,
        parent_id: parentTodo.id,
        title: item.title,
        description: item.description ?? "",
        is_done: false,
        created_at: new Date().toISOString(),
      };

      nextId = nextId + 1;
      createdSubtasks.push(newSubtask);
    }

    // 既存のサブタスクを残し、今回作成した分をまとめて追加する
    mockTodos.push(...createdSubtasks);

    return HttpResponse.json(createdSubtasks, { status: 200 });
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
