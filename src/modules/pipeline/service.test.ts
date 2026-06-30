import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { promisify } from "node:util";
import type {
  AgentFixResult,
  AgentPrMonitorResult,
  AgentPrResult,
  AgentReviewResult,
  AgentVerificationResult,
  RunFixAgentOptions,
  RunPrAgentOptions,
  RunReviewAgentOptions,
} from "../agent/types.js";
import { DIFF_SCOPE_ITEMS, type DiffScopeId } from "../diff-scope/index.js";
import { RUN_MODE_ITEMS, type MenuItem } from "../main-menu/index.js";
import type { ReviewTarget } from "../review-target/index.js";
import { runPipeline } from "./service.js";
import type { RunPipelineOptions } from "./types.js";

const execFileAsync = promisify(execFile);

test("full pipeline re-reviews the post-fix worktree candidate for branch diffs", async () => {
  const cwd = await createRepo();

  try {
    await git(cwd, ["checkout", "-b", "feature"]);
    await writeFile(join(cwd, "a.txt"), "one\nbranch bug\n");
    await git(cwd, ["add", "a.txt"]);
    await git(cwd, ["commit", "-m", "feature change"]);

    const reviewPatches: string[] = [];
    const prPatches: string[] = [];
    const target: ReviewTarget = {
      scope: diffScope("branch-against-main"),
      selectedPaths: ["a.txt"],
    };

    const result = await runPipeline({
      ...callbacks(),
      agentRunners: {
        async runFixAgent(_options: RunFixAgentOptions): Promise<AgentFixResult> {
          await writeFile(join(cwd, "a.txt"), "one\nbranch fixed\n");
          await writeFile(join(cwd, "b.txt"), "supporting fix\n");

          return fix("fixed");
        },
        async runPrAgent(options: RunPrAgentOptions): Promise<AgentPrResult> {
          prPatches.push(options.diff.patch);

          return {
            content: "PR created",
            prUrl: "https://github.com/example/repo/pull/1",
          };
        },
        async runPrMonitorAgent(): Promise<AgentPrMonitorResult> {
          return {
            content: "ready",
            prUrl: "https://github.com/example/repo/pull/1",
            repairable: false,
            repairTriggers: [],
            status: "ready",
          };
        },
        async runReviewAgent(
          options: RunReviewAgentOptions,
        ): Promise<AgentReviewResult> {
          reviewPatches.push(options.diff.patch);

          return options.diff.patch.includes("branch fixed") &&
            options.diff.patch.includes("b.txt")
            ? review("pass")
            : review("needs changes");
        },
        async runVerificationAgent(): Promise<AgentVerificationResult> {
          return verification("pass");
        },
      },
      cwd,
      mode: mode("full-pipeline"),
      reviewTarget: target,
    });

    assert.equal(result.agentReview?.verdicts.verdict, "pass");
    assert.equal(result.agentPostFixVerification?.verdicts.verdict, "pass");
    assert.equal(result.prSkipped, false);
    assert.equal(reviewPatches.length, 2);
    assert.doesNotMatch(reviewPatches[0], /branch fixed/);
    assert.doesNotMatch(reviewPatches[0], /b\.txt/);
    assert.match(reviewPatches[1], /branch fixed/);
    assert.match(reviewPatches[1], /b\.txt/);
    assert.equal(prPatches.length, 1);
    assert.match(prPatches[0], /branch fixed/);
    assert.match(prPatches[0], /b\.txt/);
  } finally {
    await removeRepo(cwd);
  }
});

function callbacks(): Omit<
  RunPipelineOptions,
  "agentRunners" | "cwd" | "mode" | "reviewTarget"
> {
  return {
    onFixCompleted() {},
    onFixStarted() {},
    onGitDiffLoaded() {},
    onPostFixVerificationCompleted() {},
    onPostFixVerificationStarted() {},
    onPrCompleted() {},
    onPrMonitorCompleted() {},
    onPrMonitorStarted() {},
    onPrRepairCompleted() {},
    onPrRepairStarted() {},
    onPrStarted() {},
    onReviewCompleted() {},
    onVerificationCompleted() {},
    onVerificationStarted() {},
  };
}

function diffScope(id: DiffScopeId) {
  const scope = DIFF_SCOPE_ITEMS.find((item) => item.id === id);

  if (scope === undefined) {
    throw new Error(`Unknown diff scope: ${id}`);
  }

  return scope;
}

function fix(verdict: AgentFixResult["verdicts"]["verdict"]): AgentFixResult {
  return {
    content: `FIX_VERDICT: ${verdict}`,
    verdicts: { verdict },
  };
}

function mode(id: MenuItem["id"]): MenuItem {
  const item = RUN_MODE_ITEMS.find((runMode) => runMode.id === id);

  if (item === undefined) {
    throw new Error(`Unknown mode: ${id}`);
  }

  return item;
}

function review(
  verdict: AgentReviewResult["verdicts"]["verdict"],
): AgentReviewResult {
  return {
    content: `- **Verdict:** ${verdict}`,
    verdicts: { verdict },
  };
}

function verification(
  verdict: AgentVerificationResult["verdicts"]["verdict"],
): AgentVerificationResult {
  return {
    content: `VERDICT: ${verdict}`,
    verdicts: { verdict },
  };
}

async function createRepo(): Promise<string> {
  const cwd = await mkdtemp(join(tmpdir(), "review-this-pipeline-"));

  await git(cwd, ["init", "-b", "main"]);
  await git(cwd, ["config", "user.email", "test@example.com"]);
  await git(cwd, ["config", "user.name", "Test User"]);
  await writeFile(join(cwd, "a.txt"), "one\n");
  await writeFile(join(cwd, "b.txt"), "base\n");
  await git(cwd, ["add", "."]);
  await git(cwd, ["commit", "-m", "initial"]);

  return cwd;
}

async function removeRepo(cwd: string): Promise<void> {
  await rm(cwd, {
    force: true,
    recursive: true,
  });
}

async function git(cwd: string, args: readonly string[]): Promise<void> {
  await execFileAsync("git", ["-C", cwd, ...args]);
}
