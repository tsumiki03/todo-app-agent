import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, test, expect, beforeEach, vi } from "vitest";
import { http, HttpResponse } from "msw";
import type { ReactNode } from "react";
import type { Todo } from "../types";
import { useTodoMutations } from "./useTodoMutations";
import { resetMockTodos } from "../../../mocks/handlers";
import { server } from "../../../mocks/node";

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

// キャッシュの無効化も確認できるよう、テストごとの QueryClient とラッパーを返す
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

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  return { queryClient, wrapper };
};

describe("useTodoMutations (TanStack Query)", () => {
  beforeEach(() => {
    resetMockTodos();
  });

  test("初期状態では通信を行わず、各操作が通信中でもエラーでもないこと", async () => {
    const onRequest = vi.fn();
    server.use(
      http.all(`${BASE_URL}/api/todo/*`, () => {
        onRequest();
        return HttpResponse.json({});
      }),
    );
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useTodoMutations(), { wrapper });

    await act(async () => {});

    expect(onRequest).not.toHaveBeenCalled();
    expect(result.current.isAdding).toBe(false);
    expect(result.current.isUpdating).toBe(false);
    expect(result.current.isDeleting).toBe(false);
    expect(result.current.addError).toBeNull();
    expect(result.current.updateError).toBeNull();
    expect(result.current.deleteError).toBeNull();
  });

  test("追加成功時は送信内容・戻り値・通信状態・両一覧の無効化を確認すること", async () => {
    const { queryClient, wrapper } = createWrapper();
    // 購読のないキャッシュを保持し、再取得を伴わずに無効化を確認する
    queryClient.setQueryDefaults(["todos"], { gcTime: Infinity });
    queryClient.setQueryData(["todos"], []);
    queryClient.setQueryData(["todos", "tree"], []);
    expect(queryClient.getQueryState(["todos"])?.isInvalidated).toBe(false);
    expect(queryClient.getQueryState(["todos", "tree"])?.isInvalidated).toBe(false);
    const response: Todo = {
      id: 2,
      parent_id: null,
      title: "新しいタスク",
      description: "説明",
      is_done: false,
      created_at: "2026-01-02T00:00:00Z",
    };
    let releaseResponse!: () => void;
    const responseReady = new Promise<void>((resolve) => {
      releaseResponse = resolve;
    });
    const onRequest = vi.fn();
    server.use(
      http.post(`${BASE_URL}/api/todo/`, async ({ request }) => {
        onRequest(await request.json());
        await responseReady;
        return HttpResponse.json(response);
      }),
    );
    const { result } = renderHook(() => useTodoMutations(), { wrapper });
    let request!: Promise<Todo>;
    act(() => {
      request = result.current.addTodo("新しいタスク", "説明");
    });

    try {
      await waitFor(() => {
        expect(result.current.isAdding).toBe(true);
        expect(result.current.isUpdating).toBe(false);
        expect(result.current.isDeleting).toBe(false);
        expect(onRequest).toHaveBeenCalledWith({ title: "新しいタスク", description: "説明" });
      });
      expect(result.current.addError).toBeNull();
      expect(result.current.updateError).toBeNull();
      expect(result.current.deleteError).toBeNull();
    } finally {
      // 検証に失敗した場合も待機中の通信を終了する
      await act(async () => {
        releaseResponse();
        await request;
      });
    }

    await expect(request).resolves.toEqual(response);
    await waitFor(() => {
      expect(result.current.isAdding).toBe(false);
      expect(queryClient.getQueryState(["todos"])?.isInvalidated).toBe(true);
      expect(queryClient.getQueryState(["todos", "tree"])?.isInvalidated).toBe(true);
    });
    expect(result.current.addError).toBeNull();
    expect(result.current.updateError).toBeNull();
    expect(result.current.deleteError).toBeNull();
  });

  test("追加失敗時はrejectと対応するエラーを返し、両一覧を無効化しないこと", async () => {
    const { queryClient, wrapper } = createWrapper();
    // 購読のないキャッシュを保持し、再取得を伴わずに無効化を確認する
    queryClient.setQueryDefaults(["todos"], { gcTime: Infinity });
    queryClient.setQueryData(["todos"], []);
    queryClient.setQueryData(["todos", "tree"], []);
    expect(queryClient.getQueryState(["todos"])?.isInvalidated).toBe(false);
    expect(queryClient.getQueryState(["todos", "tree"])?.isInvalidated).toBe(false);
    server.use(http.post(`${BASE_URL}/api/todo/`, () => new HttpResponse(null, { status: 500 })));
    const { result } = renderHook(() => useTodoMutations(), { wrapper });

    await act(async () => {
      await expect(result.current.addTodo("新しいタスク", "説明")).rejects.toThrow(
        "Request failed with status code 500",
      );
    });

    await waitFor(() => {
      expect(result.current.addError).toBe("Request failed with status code 500");
    });
    expect(result.current.isAdding).toBe(false);
    expect(result.current.isUpdating).toBe(false);
    expect(result.current.isDeleting).toBe(false);
    expect(result.current.addError).toBe("Request failed with status code 500");
    expect(result.current.updateError).toBeNull();
    expect(result.current.deleteError).toBeNull();
    expect(queryClient.getQueryState(["todos"])?.isInvalidated).toBe(false);
    expect(queryClient.getQueryState(["todos", "tree"])?.isInvalidated).toBe(false);
  });

  test("更新成功時は送信内容・戻り値・通信状態・両一覧の無効化を確認すること", async () => {
    const { queryClient, wrapper } = createWrapper();
    // 購読のないキャッシュを保持し、再取得を伴わずに無効化を確認する
    queryClient.setQueryDefaults(["todos"], { gcTime: Infinity });
    queryClient.setQueryData(["todos"], []);
    queryClient.setQueryData(["todos", "tree"], []);
    expect(queryClient.getQueryState(["todos"])?.isInvalidated).toBe(false);
    expect(queryClient.getQueryState(["todos", "tree"])?.isInvalidated).toBe(false);
    const response: Todo = {
      id: 101,
      parent_id: 1,
      title: "更新後の子タスク",
      description: "子の説明",
      is_done: true,
      created_at: "2026-01-01T00:00:00Z",
    };
    let releaseResponse!: () => void;
    const responseReady = new Promise<void>((resolve) => {
      releaseResponse = resolve;
    });
    const onRequest = vi.fn();
    server.use(
      http.put(`${BASE_URL}/api/todo/:todo_id`, async ({ params, request }) => {
        onRequest(params.todo_id, await request.json());
        await responseReady;
        return HttpResponse.json(response);
      }),
    );
    const { result } = renderHook(() => useTodoMutations(), { wrapper });
    let request!: Promise<Todo>;
    act(() => {
      request = result.current.updateTodo(101, { title: "更新後の子タスク", is_done: true });
    });

    try {
      await waitFor(() => {
        expect(result.current.isAdding).toBe(false);
        expect(result.current.isUpdating).toBe(true);
        expect(result.current.isDeleting).toBe(false);
        expect(onRequest).toHaveBeenCalledWith("101", { title: "更新後の子タスク", is_done: true });
      });
      expect(result.current.addError).toBeNull();
      expect(result.current.updateError).toBeNull();
      expect(result.current.deleteError).toBeNull();
    } finally {
      // 検証に失敗した場合も待機中の通信を終了する
      await act(async () => {
        releaseResponse();
        await request;
      });
    }

    await expect(request).resolves.toEqual(response);
    await waitFor(() => {
      expect(result.current.isUpdating).toBe(false);
      expect(queryClient.getQueryState(["todos"])?.isInvalidated).toBe(true);
      expect(queryClient.getQueryState(["todos", "tree"])?.isInvalidated).toBe(true);
    });
    expect(result.current.addError).toBeNull();
    expect(result.current.updateError).toBeNull();
    expect(result.current.deleteError).toBeNull();
  });

  test("更新失敗時はrejectと対応するエラーを返し、両一覧を無効化しないこと", async () => {
    const { queryClient, wrapper } = createWrapper();
    // 購読のないキャッシュを保持し、再取得を伴わずに無効化を確認する
    queryClient.setQueryDefaults(["todos"], { gcTime: Infinity });
    queryClient.setQueryData(["todos"], []);
    queryClient.setQueryData(["todos", "tree"], []);
    expect(queryClient.getQueryState(["todos"])?.isInvalidated).toBe(false);
    expect(queryClient.getQueryState(["todos", "tree"])?.isInvalidated).toBe(false);
    server.use(
      http.put(`${BASE_URL}/api/todo/:todo_id`, () => new HttpResponse(null, { status: 500 })),
    );
    const { result } = renderHook(() => useTodoMutations(), { wrapper });

    await act(async () => {
      await expect(
        result.current.updateTodo(101, { title: "更新後の子タスク", is_done: true }),
      ).rejects.toThrow("Request failed with status code 500");
    });

    await waitFor(() => {
      expect(result.current.updateError).toBe("Request failed with status code 500");
    });
    expect(result.current.isAdding).toBe(false);
    expect(result.current.isUpdating).toBe(false);
    expect(result.current.isDeleting).toBe(false);
    expect(result.current.addError).toBeNull();
    expect(result.current.updateError).toBe("Request failed with status code 500");
    expect(result.current.deleteError).toBeNull();
    expect(queryClient.getQueryState(["todos"])?.isInvalidated).toBe(false);
    expect(queryClient.getQueryState(["todos", "tree"])?.isInvalidated).toBe(false);
  });

  test("削除成功時は送信内容・戻り値・通信状態・両一覧の無効化を確認すること", async () => {
    const { queryClient, wrapper } = createWrapper();
    // 購読のないキャッシュを保持し、再取得を伴わずに無効化を確認する
    queryClient.setQueryDefaults(["todos"], { gcTime: Infinity });
    queryClient.setQueryData(["todos"], []);
    queryClient.setQueryData(["todos", "tree"], []);
    expect(queryClient.getQueryState(["todos"])?.isInvalidated).toBe(false);
    expect(queryClient.getQueryState(["todos", "tree"])?.isInvalidated).toBe(false);

    let releaseResponse!: () => void;
    const responseReady = new Promise<void>((resolve) => {
      releaseResponse = resolve;
    });
    const onRequest = vi.fn();
    server.use(
      http.delete(`${BASE_URL}/api/todo/:todo_id`, async ({ params }) => {
        onRequest(params.todo_id);
        await responseReady;
        return HttpResponse.json({ success: true });
      }),
    );
    const { result } = renderHook(() => useTodoMutations(), { wrapper });
    let request!: Promise<void>;
    act(() => {
      request = result.current.deleteTodo(1);
    });

    try {
      await waitFor(() => {
        expect(result.current.isAdding).toBe(false);
        expect(result.current.isUpdating).toBe(false);
        expect(result.current.isDeleting).toBe(true);
        expect(onRequest).toHaveBeenCalledWith("1");
      });
      expect(result.current.addError).toBeNull();
      expect(result.current.updateError).toBeNull();
      expect(result.current.deleteError).toBeNull();
    } finally {
      // 検証に失敗した場合も待機中の通信を終了する
      await act(async () => {
        releaseResponse();
        await request;
      });
    }

    await expect(request).resolves.toBeUndefined();
    await waitFor(() => {
      expect(result.current.isDeleting).toBe(false);
      expect(queryClient.getQueryState(["todos"])?.isInvalidated).toBe(true);
      expect(queryClient.getQueryState(["todos", "tree"])?.isInvalidated).toBe(true);
    });
    expect(result.current.addError).toBeNull();
    expect(result.current.updateError).toBeNull();
    expect(result.current.deleteError).toBeNull();
  });

  test("削除失敗時はrejectと対応するエラーを返し、両一覧を無効化しないこと", async () => {
    const { queryClient, wrapper } = createWrapper();
    // 購読のないキャッシュを保持し、再取得を伴わずに無効化を確認する
    queryClient.setQueryDefaults(["todos"], { gcTime: Infinity });
    queryClient.setQueryData(["todos"], []);
    queryClient.setQueryData(["todos", "tree"], []);
    expect(queryClient.getQueryState(["todos"])?.isInvalidated).toBe(false);
    expect(queryClient.getQueryState(["todos", "tree"])?.isInvalidated).toBe(false);
    server.use(
      http.delete(`${BASE_URL}/api/todo/:todo_id`, () => new HttpResponse(null, { status: 500 })),
    );
    const { result } = renderHook(() => useTodoMutations(), { wrapper });

    await act(async () => {
      await expect(result.current.deleteTodo(1)).rejects.toThrow(
        "Request failed with status code 500",
      );
    });

    await waitFor(() => {
      expect(result.current.deleteError).toBe("Request failed with status code 500");
    });
    expect(result.current.isAdding).toBe(false);
    expect(result.current.isUpdating).toBe(false);
    expect(result.current.isDeleting).toBe(false);
    expect(result.current.addError).toBeNull();
    expect(result.current.updateError).toBeNull();
    expect(result.current.deleteError).toBe("Request failed with status code 500");
    expect(queryClient.getQueryState(["todos"])?.isInvalidated).toBe(false);
    expect(queryClient.getQueryState(["todos", "tree"])?.isInvalidated).toBe(false);
  });

  test("resetAddで追加エラーだけを初期化し、他の操作のエラーを保持すること", async () => {
    server.use(
      http.post(`${BASE_URL}/api/todo/`, () => new HttpResponse(null, { status: 500 })),
      http.put(`${BASE_URL}/api/todo/:todo_id`, () => new HttpResponse(null, { status: 500 })),
      http.delete(`${BASE_URL}/api/todo/:todo_id`, () => new HttpResponse(null, { status: 500 })),
    );
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useTodoMutations(), { wrapper });

    await act(async () => {
      await expect(result.current.addTodo("新しいタスク", "説明")).rejects.toThrow(
        "Request failed with status code 500",
      );
      await expect(
        result.current.updateTodo(101, { title: "更新後の子タスク", is_done: true }),
      ).rejects.toThrow("Request failed with status code 500");
      await expect(result.current.deleteTodo(1)).rejects.toThrow(
        "Request failed with status code 500",
      );
    });
    await waitFor(() => {
      expect(result.current.addError).toBe("Request failed with status code 500");
      expect(result.current.updateError).toBe("Request failed with status code 500");
      expect(result.current.deleteError).toBe("Request failed with status code 500");
    });

    act(() => result.current.resetAdd());

    await waitFor(() => {
      expect(result.current.addError).toBeNull();
    });
    expect(result.current.updateError).toBe("Request failed with status code 500");
    expect(result.current.deleteError).toBe("Request failed with status code 500");
    expect(result.current.isAdding).toBe(false);
    expect(result.current.isUpdating).toBe(false);
    expect(result.current.isDeleting).toBe(false);
  });

  test("resetUpdateで更新エラーだけを初期化し、他の操作のエラーを保持すること", async () => {
    server.use(
      http.post(`${BASE_URL}/api/todo/`, () => new HttpResponse(null, { status: 500 })),
      http.put(`${BASE_URL}/api/todo/:todo_id`, () => new HttpResponse(null, { status: 500 })),
      http.delete(`${BASE_URL}/api/todo/:todo_id`, () => new HttpResponse(null, { status: 500 })),
    );
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useTodoMutations(), { wrapper });

    await act(async () => {
      await expect(result.current.addTodo("新しいタスク", "説明")).rejects.toThrow(
        "Request failed with status code 500",
      );
      await expect(
        result.current.updateTodo(101, { title: "更新後の子タスク", is_done: true }),
      ).rejects.toThrow("Request failed with status code 500");
      await expect(result.current.deleteTodo(1)).rejects.toThrow(
        "Request failed with status code 500",
      );
    });
    await waitFor(() => {
      expect(result.current.addError).toBe("Request failed with status code 500");
      expect(result.current.updateError).toBe("Request failed with status code 500");
      expect(result.current.deleteError).toBe("Request failed with status code 500");
    });

    act(() => result.current.resetUpdate());

    await waitFor(() => {
      expect(result.current.updateError).toBeNull();
    });
    expect(result.current.addError).toBe("Request failed with status code 500");
    expect(result.current.deleteError).toBe("Request failed with status code 500");
    expect(result.current.isAdding).toBe(false);
    expect(result.current.isUpdating).toBe(false);
    expect(result.current.isDeleting).toBe(false);
  });

  test("resetDeleteで削除エラーだけを初期化し、他の操作のエラーを保持すること", async () => {
    server.use(
      http.post(`${BASE_URL}/api/todo/`, () => new HttpResponse(null, { status: 500 })),
      http.put(`${BASE_URL}/api/todo/:todo_id`, () => new HttpResponse(null, { status: 500 })),
      http.delete(`${BASE_URL}/api/todo/:todo_id`, () => new HttpResponse(null, { status: 500 })),
    );
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useTodoMutations(), { wrapper });

    await act(async () => {
      await expect(result.current.addTodo("新しいタスク", "説明")).rejects.toThrow(
        "Request failed with status code 500",
      );
      await expect(
        result.current.updateTodo(101, { title: "更新後の子タスク", is_done: true }),
      ).rejects.toThrow("Request failed with status code 500");
      await expect(result.current.deleteTodo(1)).rejects.toThrow(
        "Request failed with status code 500",
      );
    });
    await waitFor(() => {
      expect(result.current.addError).toBe("Request failed with status code 500");
      expect(result.current.updateError).toBe("Request failed with status code 500");
      expect(result.current.deleteError).toBe("Request failed with status code 500");
    });

    act(() => result.current.resetDelete());

    await waitFor(() => {
      expect(result.current.deleteError).toBeNull();
    });
    expect(result.current.addError).toBe("Request failed with status code 500");
    expect(result.current.updateError).toBe("Request failed with status code 500");
    expect(result.current.isAdding).toBe(false);
    expect(result.current.isUpdating).toBe(false);
    expect(result.current.isDeleting).toBe(false);
  });
});
