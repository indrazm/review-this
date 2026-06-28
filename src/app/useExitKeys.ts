import { useApp, useInput } from "ink";

export function useExitKeys(): void {
  const { exit } = useApp();

  useInput((input, key) => {
    if (input === "q" || key.escape || (key.ctrl && input === "c")) {
      exit();
    }
  });
}

