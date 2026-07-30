import { Button, Container, Group, Paper, Title } from "@mantine/core";

export default function App() {
  return (
    <Container size="xs" py="xl">
      <Paper shadow="md" p="xl" radius="md" withBorder>
        <Title order={2} ta="center" mb="md">
          Todo App (Agent Edition)
        </Title>
        <Group justify="center">
          <Button variant="filled" color="blue">
            Mantine Setup
          </Button>
        </Group>
      </Paper>
    </Container>
  );
}
