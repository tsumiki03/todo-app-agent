export type Todo = {
  id: number;
  parent_id: number | null;
  title: string;
  description: string;
  is_done: boolean;
  created_at: string;
};

export type Subtask = {
  id: number;
  parent_id: number;
  title: string;
  description: string;
  is_done: boolean;
  created_at: string;
};

export type TodoTree = {
  id: number;
  title: string;
  description: string;
  is_done: boolean;
  created_at: string;
  subtasks: Subtask[];
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

export type SubtaskProposal = {
  title: string;
  description: string;
};

// サブタスク提案 API のレスポンス用
export type TodoBreakdownResponse = {
  subtasks: SubtaskProposal[];
};

// サブタスクの一括登録用
export type SubtaskBatchCreateInput = {
  subtasks: SubtaskProposal[];
};

// モーダル内での下書き管理用
export type SubtaskDraft = SubtaskProposal & {
  tempId: string;
};
