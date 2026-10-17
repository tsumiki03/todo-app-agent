import api from "../../../lib/axios";
import type {
  Todo,
  TodoCreateInput,
  TodoUpdateInput,
  TodoBreakdownResponse,
  SubtaskBatchCreateInput,
  TodoTree,
} from "../types";

const API_BASE = "/api/todo";

export const todoApi = {
  getAll: async (): Promise<Todo[]> => {
    const res = await api.get(`${API_BASE}/`);
    return res.data;
  },

  getTree: async (): Promise<TodoTree[]> => {
    const res = await api.get(`${API_BASE}/tree`);
    return res.data;
  },

  create: async (data: TodoCreateInput): Promise<Todo> => {
    const res = await api.post(`${API_BASE}/`, data);
    return res.data;
  },

  update: async (todo_id: number, data: TodoUpdateInput): Promise<Todo> => {
    const res = await api.put(`${API_BASE}/${todo_id}`, data);
    return res.data;
  },

  delete: async (todo_id: number): Promise<{ success: boolean }> => {
    const res = await api.delete(`${API_BASE}/${todo_id}`);
    return res.data;
  },

  breakdown: async (todo_id: number): Promise<TodoBreakdownResponse> => {
    const res = await api.post(`${API_BASE}/${todo_id}/breakdown`);
    return res.data;
  },

  createSubtasks: async (todo_id: number, data: SubtaskBatchCreateInput): Promise<Todo[]> => {
    const res = await api.post(`${API_BASE}/${todo_id}/subtasks`, data);
    return res.data;
  },
};
