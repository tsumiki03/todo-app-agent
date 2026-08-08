import {
  Accordion,
  ActionIcon,
  Box,
  Button,
  Checkbox,
  Group,
  Paper,
  Stack,
  Textarea,
  TextInput,
} from "@mantine/core";
import { TrashIcon, CheckIcon } from "@phosphor-icons/react";
import { useState } from "react";
import type { Todo, TodoUpdateInput } from "../types";

type TodoItemProps = {
  todo: Todo;
  onToggle: (id: number) => Promise<void>;
  onUpdate: (id: number, fields: TodoUpdateInput) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
};

export const TodoItem = ({ todo, onToggle, onUpdate, onDelete }: TodoItemProps) => {
  const [editTitle, setEditTitle] = useState(todo.title);
  const [editDesc, setEditDesc] = useState(todo.description || "");
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleUpdate = async () => {
    if (!editTitle.trim() || isUpdating) return;
    try {
      setIsUpdating(true);
      await onUpdate(todo.id, {
        title: editTitle.trim(),
        description: editDesc.trim() || undefined,
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async () => {
    if (isDeleting) return;
    try {
      setIsDeleting(true);
      await onDelete(todo.id);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Paper shadow="xs" radius="md" withBorder mb="sm">
      <Group align="flex-start" gap="sm" p="sm">
        {/* 完了チェックボックス */}
        <Checkbox
          checked={todo.is_done}
          onChange={() => onToggle(todo.id)}
          size="md"
          mt={6}
          aria-label="Toggle todo completion"
        />

        {/* 折りたたみ詳細アコーディオン */}
        <Box style={{ flex: 1 }}>
          <Accordion variant="separated" radius="md" chevronPosition="right">
            <Accordion.Item value={String(todo.id)} style={{ border: "none" }}>
              <Accordion.Control p="xs">
                {/* 展開前にヘッダー部分でタイトルを即時編集・表示する入力欄 */}
                <TextInput
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  onClick={(e) => e.stopPropagation()} // アコーディオンの開閉イベント発生を防止
                  variant="unstyled"
                  placeholder="タスクのタイトル"
                  fw={500}
                  style={{
                    textDecoration: todo.is_done ? "line-through" : "none",
                    opacity: todo.is_done ? 0.5 : 1,
                  }}
                />
              </Accordion.Control>

              <Accordion.Panel>
                <Stack gap="sm" pt="xs">
                  <Textarea
                    label="説明"
                    placeholder="詳細なメモなど..."
                    value={editDesc}
                    onChange={(e) => setEditDesc(e.target.value)}
                    minRows={2}
                    autosize
                    size="sm"
                  />

                  <Group justify="space-between" pt="xs">
                    {/* 削除ボタン (赤色の ActionIcon または Button) */}
                    <ActionIcon
                      variant="light"
                      color="red"
                      size="lg"
                      onClick={handleDelete}
                      loading={isDeleting}
                      title="削除"
                    >
                      <TrashIcon size={18} />
                    </ActionIcon>

                    {/* 保存ボタン */}
                    <Button
                      variant="light"
                      color="blue"
                      size="xs"
                      leftSection={<CheckIcon size={16} />}
                      onClick={handleUpdate}
                      loading={isUpdating}
                      disabled={!editTitle.trim()}
                    >
                      保存
                    </Button>
                  </Group>
                </Stack>
              </Accordion.Panel>
            </Accordion.Item>
          </Accordion>
        </Box>
      </Group>
    </Paper>
  );
};
