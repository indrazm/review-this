import type {
  AgentFixResult,
  AgentVerificationResult,
  AgentReviewResult,
} from "../agent/types.js";
import type { GitDiffSnapshot } from "../git-diff/index.js";
import type { PipelineRunState } from "./types.js";

export function hasReviewableDiff(diff: GitDiffSnapshot): boolean {
  return diff.stats.changedFiles > 0;
}

export function shouldRunFix(
  hasFixStep: boolean,
  review: AgentReviewResult | undefined,
  verification: AgentVerificationResult | undefined,
): boolean {
  if (!hasFixStep) {
    return false;
  }

  const reviewNeedsFix =
    review !== undefined && review.verdicts.verdict !== "pass";
  const verificationNeedsFix = verification !== undefined && verification.verdicts.verdict !== "pass";

  return reviewNeedsFix || verificationNeedsFix;
}

export function shouldSkipFix(
  hasFixStep: boolean,
  fix: AgentFixResult | undefined,
): boolean {
  return hasFixStep && fix === undefined;
}

export function shouldSkipPostFixVerification(
  hasPostFixVerificationStep: boolean,
  postFixVerification: AgentVerificationResult | undefined,
): boolean {
  return hasPostFixVerificationStep && postFixVerification === undefined;
}

export function getPrRunDecision(
  hasPrStep: boolean,
  review: AgentReviewResult | undefined,
  verification: AgentVerificationResult | undefined,
): {
  readonly verification?: AgentVerificationResult;
  readonly skipReason?: string;
  readonly willRun: boolean;
} {
  if (!hasPrStep) {
    return {
      skipReason: "pipeline mode does not include a PR step",
      willRun: false,
    };
  }

  const blockers: string[] = [];
  let verifiedResult: AgentVerificationResult | undefined;

  if (review === undefined) {
    blockers.push("review agent did not produce a result");
  } else {
    const reviewVerdict = review.verdicts.verdict;

    if (reviewVerdict !== "pass") {
      blockers.push(
        `latest review did not pass (review verdict: ${reviewVerdict})`,
      );
    }
  }

  if (verification === undefined) {
    blockers.push("verification agent did not produce a result");
  } else {
    const verificationVerdict = verification.verdicts.verdict;

    if (verificationVerdict !== "pass") {
      blockers.push(
        `latest verification failed (verification verdict: ${verificationVerdict})`,
      );
    } else {
      verifiedResult = verification;
    }
  }

  if (blockers.length > 0) {
    return {
      skipReason: blockers.join("; "),
      verification: verifiedResult,
      willRun: false,
    };
  }

  return { verification: verifiedResult, willRun: true };
}

export function formatNoChangesMessage(
  state: Extract<PipelineRunState, { readonly status: "completed" }>,
): string {
  const lineStats = `0 files changed, ${state.diff.stats.addedLines} added, ${state.diff.stats.removedLines} removed`;

  if (state.diffScope.id !== "branch-against-main") {
    return `No changes found (${lineStats}). Review skipped.`;
  }

  const commitCount = state.diff.stats.commitCount ?? 0;

  return `No changes found (${lineStats}, ${commitCount} commits against main). Review skipped.`;
}
