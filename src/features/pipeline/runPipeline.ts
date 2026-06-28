import { getGitDiff, type GitDiffSnapshot } from "../git-diff/getGitDiffStats.js";
import type { MenuItem } from "../main-menu/menuItems.js";
import { PIPELINE_DEFINITIONS } from "./pipelineDefinitions.js";

export type PipelineRunResult = {
  readonly gitDiff?: GitDiffSnapshot;
  readonly mode: MenuItem;
};

type RunPipelineOptions = {
  readonly cwd: string;
  readonly mode: MenuItem;
  readonly onGitDiffLoaded: (diff: GitDiffSnapshot) => void;
};

export async function runPipeline({
  cwd,
  mode,
  onGitDiffLoaded,
}: RunPipelineOptions): Promise<PipelineRunResult> {
  const definition = PIPELINE_DEFINITIONS[mode.id];
  let gitDiff: GitDiffSnapshot | undefined;

  for (const step of definition.steps) {
    if (step === "git-diff") {
      gitDiff = await runGitDiffStep(cwd, onGitDiffLoaded);
    } else if (step === "review") {
      await runReviewStep();
    } else {
      assertNever(step);
    }
  }

  return {
    gitDiff,
    mode,
  };
}

async function runGitDiffStep(
  cwd: string,
  onGitDiffLoaded: (diff: GitDiffSnapshot) => void,
): Promise<GitDiffSnapshot> {
  const diff = await getGitDiff(cwd);

  onGitDiffLoaded(diff);

  return diff;
}

async function runReviewStep(): Promise<void> {
  await wait(650);
}

async function wait(milliseconds: number): Promise<void> {
  await new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

function assertNever(value: never): never {
  throw new Error(`Unhandled pipeline step: ${value}`);
}
