import type { MenuItem } from "../main-menu/menuItems.js";

export type PipelineStepId = "git-diff" | "review";

export type PipelineDefinition = {
  readonly mode: MenuItem["id"];
  readonly steps: readonly PipelineStepId[];
};

export const PIPELINE_DEFINITIONS: Record<MenuItem["id"], PipelineDefinition> = {
  review: {
    mode: "review",
    steps: ["git-diff", "review"],
  },
  "review-and-fix": {
    mode: "review-and-fix",
    steps: ["git-diff", "review"],
  },
  "full-pipeline": {
    mode: "full-pipeline",
    steps: ["git-diff", "review"],
  },
};
