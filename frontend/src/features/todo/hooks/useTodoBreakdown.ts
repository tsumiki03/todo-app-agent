import { useMutation } from "@tanstack/react-query";
import type { TodoBreakdownResponse } from "../types";
import { todoApi } from "../api/todoApi";

export const useTodoBreakdown = () => {
  const {
    mutateAsync,
    isPending,
    error: mutationError,
    reset,
  } = useMutation({
    mutationFn: (todo_id: number) => todoApi.breakdown(todo_id),
  });

  const breakdownTodo = async (todo_id: number) => {
    const data: TodoBreakdownResponse = await mutateAsync(todo_id);
    return data;
  };

  // エラーメッセージの文字列抽出（必要に応じて整形）
  const errorMessage =
    mutationError instanceof Error
      ? mutationError.message
      : mutationError
        ? "failed to fetch subtask proposals"
        : null;

  return {
    breakdownTodo,
    isPending,
    error: errorMessage,
    reset,
  };
};
