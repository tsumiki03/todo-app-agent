import { useMutation } from "@tanstack/react-query";
import type { TodoBreakdownResponse } from "../types";
import { todoApi } from "../api/todoApi";

export const useTodoBreakdown = () => {

  const breakdownTodo = async (_todo_id: number) => {
    const data: TodoBreakdownResponse = {
      subtasks: [
        {title: "subtask1", description: ""}
      ]
    };
    return data;
  };

  const error: string | null = null;

  return {
    breakdownTodo,
    isPending: false,
    error,
    reset: () => {},
  };
};
