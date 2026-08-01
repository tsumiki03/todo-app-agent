export type Todo = {
  id: number;
  title: string;
  description: string;
  is_done: boolean;
  created_at: string;
};

export type TodoCreateInput = {
  title: string;
  description?: string;
};

export type TodoUpdateInput = {
  title?: string;
  description?: string;
  is_done?: boolean;
};
