import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  Todo, 
  SubtaskDraft, 
  SubtaskProposal,
  SubtaskBatchCreateInput,
} from "../types";
import { todoApi } from "../api/todoApi";

const TODOS_QUERY_KEY = ["todos"];

export const useSubtaskEditor = () => {

  const [drafts, setDrafts] = useState<SubtaskDraft[]>([]);

  const initializeDrafts = (proposals: SubtaskProposal[]) => {
    const newDrafts: SubtaskDraft[] = proposals.map((proposal) => ({
      tempId: crypto.randomUUID(),
      title: proposal.title,
      description: proposal.description,
    }));
    setDrafts(newDrafts);
  };

  const updateDraft = (tempId: string, fields: Partial<SubtaskProposal>) => {
    setDrafts((prevDrafts) => 
      prevDrafts.map((draft) => 
        draft.tempId === tempId ? {...draft, ...fields} : draft,
      ),
    );
  };

  const queryClient = useQueryClient();

  const {
    mutateAsync,
    isPending,
    error: mutationError,
    reset: resetMutation,
  } = useMutation({
    mutationFn: ({todo_id, data}: {todo_id: number, data: SubtaskBatchCreateInput}) => 
      todoApi.createSubtasks(todo_id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: TODOS_QUERY_KEY,
      })
    }
  });

  const saveSubtasks = async (todo_id: number): Promise<Todo[]> => {

    const subtasks = drafts.map((draft) => ({
      title: draft.title,
      description: draft.description,
    }));

    const data: SubtaskBatchCreateInput = { subtasks };
    
    const response: Todo[] = await mutateAsync({todo_id, data});
    return response;
  };

  // エラーメッセージの文字列抽出（必要に応じて整形）
  const errorMessage =
    mutationError instanceof Error
      ? mutationError.message
      : mutationError
        ? "failed to create subtasks"
        : null;

  const reset = () => {
    setDrafts([]);
    resetMutation();
  };

  return {
    drafts,
    initializeDrafts,
    updateDraft,
    saveSubtasks,
    isPending,
    error: errorMessage,
    reset,
  };
};
