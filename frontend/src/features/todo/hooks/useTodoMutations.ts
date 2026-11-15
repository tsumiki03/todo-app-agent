import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { Todo, TodoUpdateInput } from "../types";
import { todoApi } from "../api/todoApi";

// キャッシュを識別するためのキーを定義
const TODOS_QUERY_KEY = ["todos"];

export const useTodoMutations = () => {
  const queryClient = useQueryClient();

  // Todo の追加
  const {
    mutateAsync: addMutateAsync,
    isPending: isAdding,
    error: addMutationError,
    reset: resetAdd,
  } = useMutation({
    mutationFn: ({ title, description }: { title: string; description?: string }) =>
      todoApi.create({ title, description }),
    onSuccess: () => {
      // 作成成功時にキャッシュを無効化して最新データを自動再取得
      queryClient.invalidateQueries({
        queryKey: TODOS_QUERY_KEY,
      });
    },
  });

  // Todo の更新
  const {
    mutateAsync: updateMutateAsync,
    isPending: isUpdating,
    error: updateMutationError,
    reset: resetUpdate,
  } = useMutation({
    mutationFn: ({ todo_id, fields }: { todo_id: number; fields: TodoUpdateInput }) =>
      todoApi.update(todo_id, fields),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: TODOS_QUERY_KEY,
      });
    },
  });

  // Todo の削除
  const {
    mutateAsync: deleteMutateAsync,
    isPending: isDeleting,
    error: deleteMutationError,
    reset: resetDelete,
  } = useMutation({
    mutationFn: (todo_id: number) => todoApi.delete(todo_id),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: TODOS_QUERY_KEY,
      });
    },
  });

  const addTodo = async (title: string, description?: string) => {
    const response: Todo = await addMutateAsync({ title, description });
    return response;
  };

  const updateTodo = async (todo_id: number, fields: TodoUpdateInput) => {
    const response: Todo = await updateMutateAsync({ todo_id, fields });
    return response;
  };

  const deleteTodo = async (todo_id: number) => {
    await deleteMutateAsync(todo_id);
  };

  // エラーメッセージの文字列抽出（必要に応じて整形）
  const addError =
    addMutationError instanceof Error
      ? addMutationError.message
      : addMutationError
        ? "failed to add todo"
        : null;

  const updateError =
    updateMutationError instanceof Error
      ? updateMutationError.message
      : updateMutationError
        ? "failed to update todo"
        : null;

  const deleteError =
    deleteMutationError instanceof Error
      ? deleteMutationError.message
      : deleteMutationError
        ? "failed to delete todo"
        : null;

  return {
    addTodo,
    updateTodo,
    deleteTodo,
    isAdding,
    isUpdating,
    isDeleting,
    addError,
    updateError,
    deleteError,
    resetAdd,
    resetUpdate,
    resetDelete,
  };
};
