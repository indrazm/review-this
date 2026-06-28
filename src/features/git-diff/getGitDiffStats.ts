import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export type GitDiffStats = {
  readonly addedLines: number;
  readonly binaryFiles: number;
  readonly changedFiles: number;
  readonly cwd: string;
  readonly removedLines: number;
};

export type GitDiffSnapshot = {
  readonly patch: string;
  readonly stats: GitDiffStats;
};

type GitDiffTarget = {
  readonly hasHead: boolean;
};

export async function getGitDiffStats(cwd = process.cwd()): Promise<GitDiffStats> {
  const target = await getGitDiffTarget(cwd);
  const { stdout } = await runGit(cwd, buildGitDiffArgs(target, "--numstat"));

  return toGitDiffStats(cwd, stdout);
}

export async function getGitDiff(cwd = process.cwd()): Promise<GitDiffSnapshot> {
  const target = await getGitDiffTarget(cwd);
  const [numstat, patch] = await Promise.all([
    runGit(cwd, buildGitDiffArgs(target, "--numstat")),
    runGit(cwd, buildGitDiffArgs(target)),
  ]);

  return {
    patch: patch.stdout,
    stats: toGitDiffStats(cwd, numstat.stdout),
  };
}

function toGitDiffStats(cwd: string, numstat: string): GitDiffStats {
  return {
    cwd,
    ...parseGitNumstat(numstat),
  };
}

export function parseGitNumstat(output: string): Omit<GitDiffStats, "cwd"> {
  let addedLines = 0;
  let binaryFiles = 0;
  let changedFiles = 0;
  let removedLines = 0;

  for (const line of output.split(/\r?\n/)) {
    if (line.trim() === "") {
      continue;
    }

    const [added, removed] = line.split("\t");

    changedFiles += 1;

    if (added === "-" || removed === "-") {
      binaryFiles += 1;
      continue;
    }

    addedLines += Number.parseInt(added, 10);
    removedLines += Number.parseInt(removed, 10);
  }

  return {
    addedLines,
    binaryFiles,
    changedFiles,
    removedLines,
  };
}

async function assertGitWorkTree(cwd: string): Promise<void> {
  const { stdout } = await runGit(cwd, ["rev-parse", "--is-inside-work-tree"]);

  if (stdout.trim() !== "true") {
    throw new Error(`${cwd} is not inside a git work tree`);
  }
}

async function getGitDiffTarget(cwd: string): Promise<GitDiffTarget> {
  await assertGitWorkTree(cwd);

  return {
    hasHead: await hasGitHead(cwd),
  };
}

async function hasGitHead(cwd: string): Promise<boolean> {
  try {
    await runGit(cwd, ["rev-parse", "--verify", "HEAD"]);
    return true;
  } catch {
    return false;
  }
}

function buildGitDiffArgs(
  target: GitDiffTarget,
  format?: "--numstat",
): readonly string[] {
  if (target.hasHead) {
    return format === undefined
      ? ["diff", "HEAD", "--", "."]
      : ["diff", format, "HEAD", "--", "."];
  }

  return format === undefined
    ? ["diff", "--", "."]
    : ["diff", format, "--", "."];
}

async function runGit(cwd: string, args: readonly string[]) {
  return execFileAsync("git", ["-C", cwd, ...args], {
    maxBuffer: 10 * 1024 * 1024,
  });
}
