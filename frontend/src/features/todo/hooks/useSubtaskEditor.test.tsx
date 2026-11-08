import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { http, HttpResponse } from "msw";
import type { ReactNode } from "react";
import { resetMockTodos } from "../../../mocks/handlers";
import { server } from "../../../mocks/node";
import { useSubtaskEditor } from "./useSubtaskEditor";
import type { SubtaskProposal, Todo } from "../types";

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

// キャッシュの無効化も確認できるよう、QueryClient とラッパーを返す
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
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

describe("useSubtaskEditor (TanStack Query)", () => {
  beforeEach(() => {
    resetMockTodos();
  });

  test("初期状態では下書きが空で、通信を行わないこと", async () => {
    const onRequest = vi.fn();
    server.use(
      http.post(`${BASE_URL}/api/todo/:todo_id/subtasks`, () => {
        onRequest();
        return HttpResponse.json([]);
      }),
    );
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useSubtaskEditor(), { wrapper });

    await act(async () => {});

    expect(result.current.drafts).toEqual([]);
    expect(result.current.isPending).toBe(false);
    expect(result.current.error).toBeNull();
    expect(onRequest).not.toHaveBeenCalled();
  });

  test("提案に異なるtempIdを付けて下書きを作り、再初期化時は置き換えること", () => {
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useSubtaskEditor(), { wrapper });
    const proposals: SubtaskProposal[] = [
      { title: "資料を集める", description: "公式サイトを調べる" },
      { title: "資料を読む", description: "要点をまとめる" },
    ];

    act(() => result.current.initializeDrafts(proposals));

    expect(result.current.drafts).toEqual(
      proposals.map((proposal) => ({ ...proposal, tempId: expect.any(String) })),
    );
    const tempIds = result.current.drafts.map((draft) => draft.tempId);
    expect(tempIds.every((tempId) => tempId.length > 0)).toBe(true);
    expect(new Set(tempIds).size).toBe(2);

    const nextProposals = [{ title: "別の作業", description: "新しい提案" }];
    act(() => result.current.initializeDrafts(nextProposals));

    expect(result.current.drafts).toEqual([{ ...nextProposals[0], tempId: expect.any(String) }]);
  });

  test("指定した下書きの項目だけを編集し、他の候補と元の提案を保持すること", () => {
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useSubtaskEditor(), { wrapper });
    const proposals: SubtaskProposal[] = [
      { title: "資料を集める", description: "公式サイトを調べる" },
      { title: "資料を読む", description: "要点をまとめる" },
    ];
    const originalProposals = structuredClone(proposals);
    act(() => result.current.initializeDrafts(proposals));
    expect(result.current.drafts).toHaveLength(2);
    const [first, second] = result.current.drafts;

    act(() => result.current.updateDraft(first.tempId, { title: "参考資料を集める" }));
    expect(result.current.drafts).toEqual([{ ...first, title: "参考資料を集める" }, second]);

    act(() => result.current.updateDraft(first.tempId, { description: "書籍も調べる" }));
    expect(result.current.drafts).toEqual([
      { ...first, title: "参考資料を集める", description: "書籍も調べる" },
      second,
    ]);
    expect(proposals).toEqual(originalProposals);
  });

  test("編集後の内容を一括登録し、通信状態・戻り値・両一覧の無効化を確認すること", async () => {
    const { queryClient, wrapper } = createWrapper();
    // 購読のないキャッシュを用意し、再取得による状態変化を避けて無効化を確認する
    queryClient.setQueryDefaults(["todos"], { gcTime: Infinity });
    queryClient.setQueryData(["todos"], []);
    queryClient.setQueryData(["todos", "tree"], []);
    expect(queryClient.getQueryState(["todos"])?.isInvalidated).toBe(false);
    expect(queryClient.getQueryState(["todos", "tree"])?.isInvalidated).toBe(false);

    const response: Todo[] = [
      {
        id: 102,
        parent_id: 1,
        title: "編集後の作業",
        description: "編集後の説明",
        is_done: false,
        created_at: "2026-01-02T00:00:00Z",
      },
    ];
    let releaseResponse!: () => void;
    const responseReady = new Promise<void>((resolve) => {
      releaseResponse = resolve;
    });
    const onRequest = vi.fn();
    server.use(
      http.post(`${BASE_URL}/api/todo/:todo_id/subtasks`, async ({ params, request }) => {
        onRequest(params.todo_id, await request.json());
        await responseReady;
        return HttpResponse.json(response);
      }),
    );
    const { result } = renderHook(() => useSubtaskEditor(), { wrapper });
    act(() => {
      result.current.initializeDrafts([{ title: "元の作業", description: "元の説明" }]);
    });
    expect(result.current.drafts).toHaveLength(1);
    act(() => {
      result.current.updateDraft(result.current.drafts[0].tempId, {
        title: "編集後の作業",
        description: "編集後の説明",
      });
    });
    const draftsBeforeSave = structuredClone(result.current.drafts);
    let request!: Promise<Todo[]>;
    act(() => {
      request = result.current.saveSubtasks(1);
    });

    try {
      await waitFor(() => {
        expect(result.current.isPending).toBe(true);
        // 完全一致で検証し、tempId が送信されないことも確認する
        expect(onRequest).toHaveBeenCalledWith("1", {
          subtasks: [{ title: "編集後の作業", description: "編集後の説明" }],
        });
      });
      expect(result.current.error).toBeNull();
    } finally {
      // 検証に失敗した場合も待機中の通信を終了する
      await act(async () => {
        releaseResponse();
        await request;
      });
    }

    await expect(request).resolves.toEqual(response);
    await waitFor(() => {
      expect(result.current.isPending).toBe(false);
      expect(queryClient.getQueryState(["todos"])?.isInvalidated).toBe(true);
      expect(queryClient.getQueryState(["todos", "tree"])?.isInvalidated).toBe(true);
    });
    expect(result.current.error).toBeNull();
    expect(result.current.drafts).toEqual(draftsBeforeSave);
  });

  test("登録失敗時はrejectとエラーを返し、下書きとキャッシュを保持すること", async () => {
    const { queryClient, wrapper } = createWrapper();
    queryClient.setQueryDefaults(["todos"], { gcTime: Infinity });
    queryClient.setQueryData(["todos"], []);
    queryClient.setQueryData(["todos", "tree"], []);
    server.use(
      http.post(
        `${BASE_URL}/api/todo/:todo_id/subtasks`,
        () => new HttpResponse(null, { status: 500 }),
      ),
    );
    const { result } = renderHook(() => useSubtaskEditor(), { wrapper });
    act(() => {
      result.current.initializeDrafts([{ title: "登録する作業", description: "説明" }]);
    });
    expect(result.current.drafts).toHaveLength(1);
    const draftsBeforeSave = structuredClone(result.current.drafts);

    await act(async () => {
      await expect(result.current.saveSubtasks(1)).rejects.toThrow(
        "Request failed with status code 500",
      );
    });

    await waitFor(() => {
      expect(result.current.error).toBe("Request failed with status code 500");
    });
    expect(result.current.isPending).toBe(false);
    expect(result.current.drafts).toEqual(draftsBeforeSave);
    expect(queryClient.getQueryState(["todos"])?.isInvalidated).toBe(false);
    expect(queryClient.getQueryState(["todos", "tree"])?.isInvalidated).toBe(false);
  });

  test("resetで編集済みの下書きと登録エラーを初期化すること", async () => {
    const { wrapper } = createWrapper();
    server.use(
      http.post(
        `${BASE_URL}/api/todo/:todo_id/subtasks`,
        () => new HttpResponse(null, { status: 500 }),
      ),
    );
    const { result } = renderHook(() => useSubtaskEditor(), { wrapper });
    act(() => {
      result.current.initializeDrafts([{ title: "元の作業", description: "説明" }]);
    });
    expect(result.current.drafts).toHaveLength(1);
    act(() => {
      result.current.updateDraft(result.current.drafts[0].tempId, { title: "編集後の作業" });
    });
    expect(result.current.drafts[0].title).toBe("編集後の作業");
    await act(async () => {
      // reset 前にエラーが発生していることを確認する
      await result.current.saveSubtasks(1).catch(() => {});
    });
    await waitFor(() => {
      expect(result.current.error).toBe("Request failed with status code 500");
    });

    act(() => result.current.reset());

    await waitFor(() => {
      expect(result.current.drafts).toEqual([]);
      expect(result.current.error).toBeNull();
    });
    expect(result.current.isPending).toBe(false);
  });
});
