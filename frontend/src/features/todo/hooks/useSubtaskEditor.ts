import { useState } from "react";
import type { Todo, SubtaskDraft, SubtaskProposal } from "../types";

export const useSubtaskEditor = () => {

  const [drafts, setDrafts] = useState<SubtaskDraft[]>([]);

  const initializeDrafts = (proposals: SubtaskProposal[]) => {
    const proposalsCopy = structuredClone(proposals);
    const proposalsCopyWithId = proposalsCopy.map((proposal) => ({
      tempId: crypto.randomUUID(),
      title: proposal.title,
      description: proposal.description,
    }));
    setDrafts(proposalsCopyWithId);
  };

  const updateDraft = (_tempId: string, _fields: Partial<SubtaskProposal>) => {};
  const saveSubtasks = async (_todo_id: number) => {
    const response: Todo[] = [
      {
        id: 1,
        parent_id: 1,
        title: "task", 
        description: "", 
        is_done: false, 
        created_at: "2026-01-01T00:00:00Z",
      },
    ];
    return response;
  };
  const isPending = false;
  const error: string | null = null;
  const reset = () => {};

  return {
    drafts,
    initializeDrafts,
    updateDraft,
    saveSubtasks,
    isPending,
    error,
    reset,
  };
};
