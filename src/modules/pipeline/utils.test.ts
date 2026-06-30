import assert from "node:assert/strict";
import { test } from "node:test";
import type {
  AgentReviewResult,
  AgentVerificationResult,
} from "../agent/types.js";
import { getPrRunDecision } from "./utils.js";

test("PR gate reports both review and verification blockers", () => {
  const decision = getPrRunDecision(
    true,
    review("needs changes"),
    verification("fail"),
  );

  assert.equal(decision.willRun, false);
  assert.equal(
    decision.skipReason,
    "latest review did not pass (review verdict: needs changes); latest verification failed (verification verdict: fail)",
  );
});

test("PR gate runs only when latest review and verification pass", () => {
  const latestVerification = verification("pass");
  const decision = getPrRunDecision(true, review("pass"), latestVerification);

  assert.equal(decision.willRun, true);
  assert.equal(decision.verification, latestVerification);
  assert.equal(decision.skipReason, undefined);
});

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
