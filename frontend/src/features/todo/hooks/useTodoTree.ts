import { useQuery } from "@tanstack/react-query";
import type { TodoTree } from "../types";
import { todoApi } from "../api/todoApi";

// キャッシュを識別するためのキーを定義
// TODOS_QUERY_KEY とは区別しつつ、"todos" でまとめて無効化できるようにする
const TODO_TREE_QUERY_KEY = ["todos", "tree"];

export const useTodoTree = () => {
  // TodoTree 一覧の取得 (Read)
  const {
    data: todoTrees = [],
    isLoading,
    error: queryError,
  } = useQuery<TodoTree[]>({
    queryKey: TODO_TREE_QUERY_KEY,
    queryFn: () => todoApi.getTree(),
  });

  // エラーメッセージの文字列抽出（必要に応じて整形）
  const errorMessage =
    queryError instanceof Error ? queryError.message : queryError ? "failed to fetch Todos" : null;

  return {
    todoTrees,
    isLoading,
    error: errorMessage,
  };
};
