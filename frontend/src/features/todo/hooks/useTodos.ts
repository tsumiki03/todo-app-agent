import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Todo, TodoUpdateInput } from "../types";
import { todoApi } from "../api/todoApi";

// キャッシュを識別するためのキーを定義
const TODOS_QUERY_KEY = ["todos"];

export const useTodos = () => {
  const queryClient = useQueryClient();

  // Todo 一覧の取得 (Read)
  const {
    data: todos = [],
    isLoading,
    error: queryError,
  } = useQuery<Todo[]>({
    queryKey: TODOS_QUERY_KEY,
    queryFn: () => todoApi.getAll(),
  });

  // Todo の追加 (Create)
  const createMutation = useMutation({
    mutationFn: ({ title, description }: { title: string; description?: string }) =>
      todoApi.create({ title, description }),
    onSuccess: () => {
      // 作成成功時にキャッシュを無効化して最新データを自動再取得
      queryClient.invalidateQueries({
        queryKey: TODOS_QUERY_KEY,
      });
    },
  });

  // Todo の更新 (Update)
  const updateMutation = useMutation({
    mutationFn: ({ todo_id, fields }: { todo_id: number; fields: TodoUpdateInput }) =>
      todoApi.update(todo_id, fields),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: TODOS_QUERY_KEY,
      });
    },
  });

  // Todo の削除 (Delete)
  const deleteMutation = useMutation({
    mutationFn: (todo_id: number) => todoApi.delete(todo_id),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: TODOS_QUERY_KEY,
      });
    },
  });

  // ラッパー関数（既存のインターフェース・戻り値に合わせる）

  const addTodo = async (title: string, description?: string) => {
    await createMutation.mutateAsync({ title, description });
  };

  const updateTodo = async (todo_id: number, fields: TodoUpdateInput) => {
    await updateMutation.mutateAsync({ todo_id, fields });
  };

  const toggleTodo = async (todo_id: number) => {
    const target = todos.find((t) => t.id === todo_id);
    if (!target) return;
    await updateTodo(todo_id, { is_done: !target.is_done });
  };

  const deleteTodo = async (todo_id: number) => {
    await deleteMutation.mutateAsync(todo_id);
  };

  // エラーメッセージの文字列抽出（必要に応じて整形）
  const errorMessage =
    queryError instanceof Error
      ? queryError.message
      : queryError
      ? "failed to fetch Todos"
      : null;

  return {
    todos,
    isLoading,
    error: errorMessage,
    addTodo,
    updateTodo,
    toggleTodo,
    deleteTodo,
  };
};
