import { MantineProvider } from "@mantine/core";
import { render as testingLibraryRender } from "@testing-library/react";

export function render(ui: React.ReactNode) {
  return testingLibraryRender(<MantineProvider>{ui}</MantineProvider>);
}
