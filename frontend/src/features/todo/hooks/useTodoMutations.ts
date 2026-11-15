import type { Todo, TodoUpdateInput } from "../types";

export const useTodoMutations = () => {

  const addTodo = async (_title: string, _description?: string) => {
    const response: Todo = {
      id: 1,
      parent_id: null,
      title: "task", 
      description: "", 
      is_done: false, 
      created_at: "2026-01-01T00:00:00Z",
    };
    return response;
  };

  const updateTodo = async (_todo_id: number, _fields: TodoUpdateInput) => {
    const response: Todo = {
      id: 1,
      parent_id: null,
      title: "task", 
      description: "", 
      is_done: false, 
      created_at: "2026-01-01T00:00:00Z",
    };
    return response;
  }

  const deleteTodo = async (_todo_id: number) => {};

  const addError: string | null = "";
  const updateError: string | null = "";
  const deleteError: string | null = "";

  return {
    addTodo,
    updateTodo,
    deleteTodo,
    isAdding: false,
    isUpdating: false,
    isDeleting: false,
    addError,
    updateError,
    deleteError,
    resetAdd: () => {},
    resetUpdate: () => {},
    resetDelete: () => {},
  };
};
