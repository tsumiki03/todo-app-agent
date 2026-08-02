import { Box, Button, Paper, Stack, Textarea, TextInput } from "@mantine/core";
import { useForm } from "@mantine/form";
import { PlusIcon } from "@phosphor-icons/react";
import { useState } from "react";

type TodoInputProps = {
  onAdd: (title: string, description?: string) => Promise<void>;
};

export const TodoInput = ({ onAdd }: TodoInputProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Mantine の useForm を使用してフォームの状態・バリデーションを定義
  const form = useForm({
    initialValues: {
      title: "",
      description: "",
    },
    validate: {
      // タイトルが空欄（または空白のみ）の場合はエラーメッセージを返す
      title: (value) =>
        value.trim().length === 0 ? "タイトルを入力してください" : null,
    },
    transformValues: (values) => ({
      title: values.title.trim(),
      description: values.description.trim(),
    }),
  });

  const handleSubmit = async (values: typeof form.values) => {
    if (isSubmitting) return;

    try {
      setIsSubmitting(true);
      await onAdd(
        values.title,
        values.description !== "" ? values.description : undefined
      );
      // 送信成功後にフォームを初期化
      form.reset();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Paper shadow="xs" p="md" radius="md" withBorder mb="lg">
      <Box component="form" onSubmit={form.onSubmit(handleSubmit)}>
        <Stack gap="sm">
          <TextInput
            label="タイトル"
            placeholder="新しいタスクのタイトル..."
            size="sm"
            disabled={isSubmitting}
            withAsterisk
            // form.getInputProps で value, onChange, error などを一括適用
            {...form.getInputProps("title")}
          />

          <Textarea
            label="説明 (任意)"
            placeholder="詳細なメモやURLなど..."
            size="sm"
            minRows={2}
            autosize
            disabled={isSubmitting}
            {...form.getInputProps("description")}
          />

          <Box style={{ display: "flex", justifyContent: "center" }} pt="xs">
            <Button
              type="submit"
              variant="filled"
              color="blue"
              size="xs"
              px="xl"
              leftSection={<PlusIcon size={16} />}
              loading={isSubmitting}
              disabled={!form.values.title.trim()}
            >
              追加
            </Button>
          </Box>
        </Stack>
      </Box>
    </Paper>
  );
};
