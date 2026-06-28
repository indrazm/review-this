import { AgentBuilder } from "@anvia/core";
import type { DiffScopeItem } from "../diff-scope/diffScopes.js";
import type { GitDiffSnapshot } from "../git-diff/getGitDiffStats.js";
import type { MenuItem } from "../main-menu/menuItems.js";
import { AGENT_MAX_TURNS, createCompletionModel } from "./model.js";
import { REVIEW_AGENT_INSTRUCTIONS, toReviewPrompt } from "./prompt.js";
import { PtySessionManager } from "./ptySessionManager.js";
import { createAgentTools } from "./tools.js";
import { generateVerdicts, type ReviewVerdicts } from "./verdicts.js";

export type AgentReviewResult = {
  readonly content: string;
  readonly verdicts: ReviewVerdicts;
};

type RunReviewAgentOptions = {
  readonly cwd: string;
  readonly diff: GitDiffSnapshot;
  readonly diffScope: DiffScopeItem;
  readonly mode: MenuItem;
};

export async function runReviewAgent({
  cwd,
  diff,
  diffScope,
  mode,
}: RunReviewAgentOptions): Promise<AgentReviewResult> {
  const ptySessions = new PtySessionManager(cwd);

  try {
    const agent = new AgentBuilder("review-pipeline-reviewer", createCompletionModel())
      .name("Review Pipeline Reviewer")
      .instructions(REVIEW_AGENT_INSTRUCTIONS)
      .tools(createAgentTools(ptySessions))
      .defaultMaxTurns(AGENT_MAX_TURNS)
      .build();

    const response = await agent.prompt(toReviewPrompt(mode, diffScope, diff)).send();
    const verdicts = await generateVerdicts("review", response.output);

    return {
      content: response.output,
      verdicts,
    };
  } finally {
    ptySessions.dispose();
  }
}
