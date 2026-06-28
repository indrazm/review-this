import process from "node:process";

export function assertInteractiveTerminal(): void {
  if (process.stdin.isTTY && process.stdout.isTTY) {
    return;
  }

  console.error("rp must be run in an interactive terminal.");
  process.exit(1);
}

