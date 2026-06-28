import process from "node:process";

type LogLevel = "info" | "warn";

type LogEntry = {
  readonly level: LogLevel;
  readonly message: string;
};

const entries: LogEntry[] = [];

export function logInfo(message: string): void {
  entries.push({ level: "info", message });
}

export function logWarn(message: string): void {
  entries.push({ level: "warn", message });
}

export function flushLogs(): void {
  for (const entry of entries) {
    const prefix = entry.level === "warn" ? "WARN" : "INFO";

    process.stderr.write(`[${prefix}] ${entry.message}\n`);
  }

  entries.length = 0;
}

