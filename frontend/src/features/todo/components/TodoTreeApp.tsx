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
import { useTodoTree } from "../hooks/useTodoTree";

export const TodoTreeApp = () => {
  const { todoTrees, isLoading, error } = useTodoTree();

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
          Todo tree app
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

        <Divider my="md" label="タスク一覧" labelPosition="center" />

        {/* タスク一覧表示 */}
        <Stack gap="xs">
          {todoTrees.length === 0
            ? !error && (
                <Text c="dimmed" ta="center" py="xl" size="sm">
                  タスクがまだ登録されていません
                </Text>
              )
            : todoTrees.map((parent) => (
                <Paper key={parent.id} withBorder p="md" radius="md">
                  <Text fw={700}>{parent.title}</Text>
                  {parent.subtasks.length > 0 && (
                    <Stack
                      component="ul"
                      role="list"
                      gap="xs"
                      mt="xs"
                      mb={0}
                      pl="md"
                      style={{ listStyle: "none" }}
                    >
                      {parent.subtasks.map((child) => (
                        <li key={child.id}>
                          <Text>{child.title}</Text>
                        </li>
                      ))}
                    </Stack>
                  )}
                </Paper>
              ))}
        </Stack>
      </Paper>
    </Container>
  );
};
