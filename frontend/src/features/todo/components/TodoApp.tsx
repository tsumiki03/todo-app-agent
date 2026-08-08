import {
  Alert,
  Center,
  Container,
  Divider,
  Loader,
  Paper,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { WarningCircleIcon } from "@phosphor-icons/react";
import { useTodos } from "../hooks/useTodos";
import { TodoInput } from "./TodoInput";
import { TodoItem } from "./TodoItem";

export const TodoApp = () => {
  const { todos, isLoading, error, addTodo, updateTodo, toggleTodo, deleteTodo } = useTodos();

  // ローディング画面
  if (isLoading) {
    return (
      <Center style={{ minHeight: "50vh" }}>
        <Loader size="lg" color="blue" type="oval" />
      </Center>
    );
  }

  return (
    <Container size="xs" py="xl">
      <Paper shadow="md" p="xl" radius="md" withBorder>
        <Title order={1} size="h2" ta="center" mb="lg">
          Todo app
        </Title>

        {/* エラー表示 */}
        {error && (
          <Alert
            variant="light"
            color="red"
            title="エラーが発生しました"
            icon={<WarningCircleIcon size={20} />}
            radius="md"
            mb="md"
          >
            {error}
          </Alert>
        )}

        {/* タスク入力フォーム */}
        <TodoInput onAdd={addTodo} />

        <Divider my="md" label="タスク一覧" labelPosition="center" />

        {/* タスク一覧表示 */}
        <Stack gap="xs">
          {todos.length === 0 ? (
            <Text c="dimmed" ta="center" py="xl" size="sm">
              タスクがまだ登録されていません
            </Text>
          ) : (
            todos.map((todo) => (
              <TodoItem
                key={todo.id}
                todo={todo}
                onUpdate={updateTodo}
                onToggle={toggleTodo}
                onDelete={deleteTodo}
              />
            ))
          )}
        </Stack>
      </Paper>
    </Container>
  );
};
