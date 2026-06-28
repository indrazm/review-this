import type { DiffScopeItem } from "../../diff-scope/diffScopes.js";
import type { GitDiffSnapshot } from "../../git-diff/getGitDiffStats.js";
import type { MenuItem } from "../../main-menu/menuItems.js";
import { extractChangedFilePaths } from "../diffFilePaths.js";
import {
  toDiffContextLines,
  toFileListLines,
  toMarkdownBlockLines,
} from "./sharedPrompt.js";

type PromptAgentOutput = {
  readonly content: string;
};

export const FIX_AGENT_INSTRUCTIONS = [
  "You are a fixing agent running inside the review-this CLI after a review agent.",
  "Use the review output and lint output as the sources of requested fixes, with the git diff as the original change context.",
  "You may modify files in this fixing step, but only files listed in the prompt's Allowed editable files section.",
  "You may inspect other project files for context, but you must not create, edit, rename, delete, format, or stage files outside the allowed list.",
  "If a correct fix requires changing a file outside the allowed list, do not make that out-of-scope edit; report the needed file under Remaining Risks and emit `FIX_VERDICT: not-fixed`.",
  "Do not commit, push, or create branches.",
  "Do not change files unrelated to the review findings or verification failures, even when they are in the allowed list.",
  "If the lint output reports failing checks, fix supported failures within the allowed file list.",
  "Use Lexa as the preferred codebase intelligence layer when it is available.",
  "Before making code changes, run `lexa --version`; if Lexa is available, run `lexa index .` from the project root, then use focused Lexa commands for context.",
  "Use `lexa outline <file>` on files you plan to edit, `lexa trace-deps <file>` for dependency impact, and `lexa audit` for structural risk when useful.",
  "Treat Lexa audit as architecture context, not as proof that the code compiles or tests pass.",
  "Use project commands such as typecheck, build, lint, or tests when they are available and relevant.",
  "If the review says there are no findings and the lint output has no failed checks, make no code changes and report that no fixes were needed.",
  "Return Markdown only.",
  "Use exactly these top-level sections: Fix Summary, Verification, Remaining Risks, Verdict.",
  "Under Verdict, include exactly one line: `FIX_VERDICT: fixed`, `FIX_VERDICT: not-fixed`, or `FIX_VERDICT: no-op`.",
  "Use `fixed` only when all review findings and supported verification failures were resolved within the allowed file list; use `not-fixed` if any remain unresolved or require out-of-scope files; use `no-op` only when the review had no findings and lint had no failed checks requiring fixes.",
].join("\n");

export function toFixPrompt(
  mode: MenuItem,
  diffScope: DiffScopeItem,
  diff: GitDiffSnapshot,
  review: PromptAgentOutput,
  lint: PromptAgentOutput | undefined,
): string {
  const allowedFiles = extractChangedFilePaths(diff.patch);

  return [
    ...toDiffContextLines(mode, diffScope, diff),
    "",
    "Allowed editable files:",
    ...toFileListLines(allowedFiles),
    "",
    "Strict edit boundary:",
    "1. Edit only files listed under Allowed editable files.",
    "2. Do not create new files unless the new file already appears in the original diff and is listed above.",
    "3. Do not run formatters or code generators that rewrite files outside the allowed list.",
    "4. If the allowed list is empty, make no file changes and report `FIX_VERDICT: not-fixed` unless no fixes are needed.",
    "5. If a required fix needs an out-of-scope file, leave it unchanged, name it under Remaining Risks, and report `FIX_VERDICT: not-fixed`.",
    "",
    "Fix workflow:",
    "1. Read the review and lint outputs and identify findings that require code changes.",
    "2. Use Lexa and direct project inspection to understand the affected files before editing.",
    "3. Apply focused fixes only for supported review findings or verification failures and only within the allowed file list.",
    "4. Run relevant verification commands when practical, especially commands that failed in the lint output.",
    "5. Report what changed, what was verified, and what remains risky.",
    "6. Emit `FIX_VERDICT: fixed` only if every review finding and supported verification failure is resolved within the allowed file list; otherwise emit `FIX_VERDICT: not-fixed`.",
    "",
    ...toMarkdownBlockLines(
      "Review output:",
      "markdown",
      review.content,
      "(empty review output)",
    ),
    "",
    ...toMarkdownBlockLines(
      "Lint output:",
      "markdown",
      lint?.content,
      "(no lint output)",
    ),
    "",
    ...toMarkdownBlockLines(
      "Original git diff:",
      "diff",
      diff.patch,
      "(empty diff)",
    ),
    "",
    "Required Markdown structure:",
    "## Fix Summary",
    "- <files changed and why>",
    "",
    "## Verification",
    "- <commands run and results>",
    "",
    "## Remaining Risks",
    "- <anything not fixed, not verified, or blocked by the allowed-file boundary>",
    "",
    "## Verdict",
    "FIX_VERDICT: <fixed|not-fixed|no-op>",
  ].join("\n");
}
