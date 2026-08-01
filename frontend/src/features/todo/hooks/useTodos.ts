import { useState, useEffect } from "react";
import type { Todo, TodoUpdateInput } from "../types";
import { todoApi } from "../api/todoApi";

export const useTodos = () => {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTodos = async () => {
      try {
        const data = await todoApi.getAll();
        setTodos(data);
      } catch {
        setError("failed to fetch Todos");
      } finally {
        setIsLoading(false);
      }
    };
    fetchTodos();
  }, []);

  const addTodo = async (title: string, description?: string) => {
    try {
      const created = await todoApi.create({ title, description });
      setTodos((prev) => [created, ...prev]);
    } catch {
      setError("failed to create Todo");
    }
  };

  const updateTodo = async (todo_id: number, fields: TodoUpdateInput) => {
    try {
      const updated = await todoApi.update(todo_id, fields);
      setTodos((prev) => prev.map((t) => (t.id === todo_id ? updated : t)));
    } catch {
      setError("failed to update Todo");
    }
  };

  const toggleTodo = async (todo_id: number) => {
    const target = todos.find((t) => t.id === todo_id);
    if (!target) return;
    await updateTodo(todo_id, { is_done: !target.is_done });
  };

  const deleteTodo = async (todo_id: number) => {
    try {
      await todoApi.delete(todo_id);
      setTodos((prev) => prev.filter((t) => t.id !== todo_id));
    } catch {
      setError("failed to delete Todo");
    }
  };

  return {
    todos,
    isLoading,
    error,
    addTodo,
    updateTodo,
    toggleTodo,
    deleteTodo,
  };
};
