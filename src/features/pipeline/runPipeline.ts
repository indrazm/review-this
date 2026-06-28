import { runFixAgent, type AgentFixResult } from "../agent/fixAgent.js";
import { runLintAgent, type AgentLintResult } from "../agent/lintAgent.js";
import { runPrAgent, type AgentPrResult } from "../agent/prAgent.js";
import { runReviewAgent, type AgentReviewResult } from "../agent/reviewAgent.js";
import type { DiffScopeItem } from "../diff-scope/diffScopes.js";
import { getGitDiff, type GitDiffSnapshot } from "../git-diff/getGitDiffStats.js";
import type { MenuItem } from "../main-menu/menuItems.js";
import { PIPELINE_DEFINITIONS } from "./pipelineDefinitions.js";

export type PipelineRunResult = {
  readonly agentFix?: AgentFixResult;
  readonly agentLint?: AgentLintResult;
  readonly agentPr?: AgentPrResult;
  readonly agentReview?: AgentReviewResult;
  readonly diffScope: DiffScopeItem;
  readonly fixSkipped: boolean;
  readonly gitDiff?: GitDiffSnapshot;
  readonly lintSkipped: boolean;
  readonly mode: MenuItem;
  readonly prSkipReason?: string;
  readonly prSkipped: boolean;
  readonly reviewSkipped: boolean;
};

type RunPipelineOptions = {
  readonly cwd: string;
  readonly diffScope: DiffScopeItem;
  readonly mode: MenuItem;
  readonly onGitDiffLoaded: (
    diff: GitDiffSnapshot,
    reviewWillRun: boolean,
  ) => void;
  readonly onReviewCompleted: (
    review: AgentReviewResult,
    diff: GitDiffSnapshot,
    fixWillRun: boolean,
  ) => void;
  readonly onFixStarted: (
    diff: GitDiffSnapshot,
    review: AgentReviewResult,
    lint: AgentLintResult | undefined,
  ) => void;
  readonly onFixCompleted: (
    fix: AgentFixResult,
    diff: GitDiffSnapshot,
    review: AgentReviewResult,
    lint: AgentLintResult | undefined,
  ) => void;
  readonly onLintCompleted: (
    lint: AgentLintResult,
    diff: GitDiffSnapshot,
  ) => void;
  readonly onLintStarted: (
    diff: GitDiffSnapshot,
    review: AgentReviewResult | undefined,
    fix: AgentFixResult | undefined,
    fixSkipped: boolean,
  ) => void;
  readonly onPrCompleted: (
    pr: AgentPrResult,
    diff: GitDiffSnapshot,
    lint: AgentLintResult,
  ) => void;
  readonly onPrStarted: (
    diff: GitDiffSnapshot,
    review: AgentReviewResult | undefined,
    fix: AgentFixResult | undefined,
    lint: AgentLintResult,
  ) => void;
};

export async function runPipeline({
  cwd,
  diffScope,
  mode,
  onFixCompleted,
  onFixStarted,
  onGitDiffLoaded,
  onLintCompleted,
  onLintStarted,
  onPrCompleted,
  onPrStarted,
  onReviewCompleted,
}: RunPipelineOptions): Promise<PipelineRunResult> {
  const definition = PIPELINE_DEFINITIONS[mode.id];
  const hasFixStep = definition.steps.includes("fix");
  const hasLintStep = definition.steps.includes("lint");
  const hasPrStep = definition.steps.includes("pr");
  let agentFix: AgentFixResult | undefined;
  let agentLint: AgentLintResult | undefined;
  let agentPr: AgentPrResult | undefined;
  let agentReview: AgentReviewResult | undefined;
  let gitDiff: GitDiffSnapshot | undefined;
  let prSkipReason: string | undefined;

  for (const step of definition.steps) {
    if (step === "git-diff") {
      gitDiff = await runGitDiffStep(cwd, diffScope, onGitDiffLoaded);
    } else if (step === "review") {
      if (gitDiff === undefined) {
        throw new Error("Review step requires git diff context");
      }

      if (!hasReviewableDiff(gitDiff)) {
        continue;
      }

      agentReview = await runReviewStep(cwd, mode, diffScope, gitDiff);
      onReviewCompleted(
        agentReview,
        gitDiff,
        shouldRunFix(hasFixStep, agentReview, agentLint),
      );
    } else if (step === "fix") {
      if (
        gitDiff === undefined ||
        agentReview === undefined ||
        !shouldRunFix(hasFixStep, agentReview, agentLint)
      ) {
        continue;
      }

      onFixStarted(gitDiff, agentReview, agentLint);
      agentFix = await runFixStep(
        cwd,
        mode,
        diffScope,
        gitDiff,
        agentReview,
        agentLint,
      );
      onFixCompleted(agentFix, gitDiff, agentReview, agentLint);
    } else if (step === "lint") {
      if (gitDiff === undefined || !hasReviewableDiff(gitDiff)) {
        continue;
      }

      onLintStarted(
        gitDiff,
        agentReview,
        agentFix,
        false,
      );
      agentLint = await runLintStep(cwd, mode, diffScope, gitDiff);
      onLintCompleted(agentLint, gitDiff);
    } else if (step === "pr") {
      const prDecision = getPrRunDecision(
        hasPrStep,
        agentLint,
        agentReview,
        agentFix,
      );

      if (
        gitDiff === undefined ||
        agentLint === undefined ||
        !prDecision.willRun
      ) {
        prSkipReason = prDecision.skipReason;
        continue;
      }

      prSkipReason = undefined;
      onPrStarted(gitDiff, agentReview, agentFix, agentLint);
      agentPr = await runPrStep(
        cwd,
        mode,
        diffScope,
        gitDiff,
        agentReview,
        agentFix,
        agentLint,
      );
      onPrCompleted(agentPr, gitDiff, agentLint);
    } else {
      assertNever(step);
    }
  }

  return {
    agentFix,
    agentLint,
    agentPr,
    agentReview,
    diffScope,
    fixSkipped: shouldSkipFix(hasFixStep, agentFix),
    gitDiff,
    lintSkipped: hasLintStep && agentLint === undefined,
    mode,
    prSkipReason,
    prSkipped: hasPrStep && agentPr === undefined,
    reviewSkipped: agentReview === undefined,
  };
}

async function runGitDiffStep(
  cwd: string,
  diffScope: DiffScopeItem,
  onGitDiffLoaded: (
    diff: GitDiffSnapshot,
    reviewWillRun: boolean,
  ) => void,
): Promise<GitDiffSnapshot> {
  const diff = await getGitDiff(cwd, diffScope);

  onGitDiffLoaded(diff, hasReviewableDiff(diff));

  return diff;
}

async function runReviewStep(
  cwd: string,
  mode: MenuItem,
  diffScope: DiffScopeItem,
  gitDiff: GitDiffSnapshot,
): Promise<AgentReviewResult> {
  return runReviewAgent({ cwd, diff: gitDiff, diffScope, mode });
}

async function runFixStep(
  cwd: string,
  mode: MenuItem,
  diffScope: DiffScopeItem,
  gitDiff: GitDiffSnapshot,
  agentReview: AgentReviewResult,
  agentLint: AgentLintResult | undefined,
): Promise<AgentFixResult> {
  return runFixAgent({
    cwd,
    diff: gitDiff,
    diffScope,
    lint: agentLint,
    mode,
    review: agentReview,
  });
}

async function runLintStep(
  cwd: string,
  mode: MenuItem,
  diffScope: DiffScopeItem,
  gitDiff: GitDiffSnapshot,
): Promise<AgentLintResult> {
  return runLintAgent({
    cwd,
    diff: gitDiff,
    diffScope,
    mode,
  });
}

async function runPrStep(
  cwd: string,
  mode: MenuItem,
  diffScope: DiffScopeItem,
  gitDiff: GitDiffSnapshot,
  agentReview: AgentReviewResult | undefined,
  agentFix: AgentFixResult | undefined,
  agentLint: AgentLintResult,
): Promise<AgentPrResult> {
  return runPrAgent({
    cwd,
    diff: gitDiff,
    diffScope,
    fix: agentFix,
    lint: agentLint,
    mode,
    review: agentReview,
  });
}

function assertNever(value: never): never {
  throw new Error(`Unhandled pipeline step: ${value}`);
}

function hasReviewableDiff(diff: GitDiffSnapshot): boolean {
  return diff.stats.changedFiles > 0;
}

function shouldRunFix(
  hasFixStep: boolean,
  review: AgentReviewResult | undefined,
  lint: AgentLintResult | undefined,
): boolean {
  if (!hasFixStep) {
    return false;
  }

  const reviewNeedsFix =
    review !== undefined && review.verdicts.verdict !== "pass";
  const lintNeedsFix = lint !== undefined && lint.verdicts.verdict !== "pass";

  return reviewNeedsFix || lintNeedsFix;
}

function shouldSkipFix(
  hasFixStep: boolean,
  fix: AgentFixResult | undefined,
): boolean {
  return hasFixStep && fix === undefined;
}

function getPrRunDecision(
  hasPrStep: boolean,
  lint: AgentLintResult | undefined,
  review: AgentReviewResult | undefined,
  fix: AgentFixResult | undefined,
): { readonly skipReason?: string; readonly willRun: boolean } {
  if (!hasPrStep) {
    return {
      skipReason: "pipeline mode does not include a PR step",
      willRun: false,
    };
  }

  if (lint === undefined) {
    return {
      skipReason: "lint agent did not produce a result",
      willRun: false,
    };
  }

  const lintVerdict = lint.verdicts.verdict;
  const reviewVerdict = review?.verdicts.verdict;
  const needsFix =
    lintVerdict !== "pass" ||
    (reviewVerdict !== undefined && reviewVerdict !== "pass");

  if (needsFix) {
    const fixVerdict = fix?.verdicts.verdict;

    if (fixVerdict !== "fixed") {
      return {
        skipReason: `unresolved review or verification findings (review verdict: ${reviewVerdict ?? "missing"}, lint verdict: ${lintVerdict}, fix verdict: ${fixVerdict ?? "missing"})`,
        willRun: false,
      };
    }
  }

  return { willRun: true };
}
