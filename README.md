# review-this

`review-this` is a local terminal UI for running review workflows from the
current project directory. The CLI is installed as `review-this`.

The app is built with pnpm, TypeScript, React, Ink, Anvia, Lexa-aware review
instructions, and node-pty.

## Why I Built This

I built `review-this` because human review is becoming the bottleneck in
agentic coding. Agents can write, revise, and verify changes quickly, but a
human still gets pulled into the loop too early when the work is not actually
ready to review.

This tool pushes that loop back to the agents. It starts from the current git
diff, asks an agent to review the change, runs project verification, applies
focused fixes when needed, and prepares a PR only after the automated pipeline
is satisfied.

The goal is for me to review once: when the PR is ready. Human attention should
go to the final decision, product judgment, and deeper engineering tradeoffs,
not to repeatedly catching issues an agent could have found and fixed locally.

## Current Behavior

When you run `review-this`, it opens a full-screen terminal app with three modes:

- Review
- Review and Fix
- Full pipeline

After choosing a mode, choose the diff scope:

- Current changes
- Current branch against main
- Staged changes

Selecting a scope opens a pipeline screen. The current pipeline implementation:

1. Loads the selected git diff scope for the directory where `review-this` was
   started.
2. Shows a `Loading Diff` state.
3. Skips review when the selected scope has no changes.
4. Passes non-empty git diffs to the review agent.
5. Instructs the agent to use Lexa for codebase context when available.
6. Shows a `Reviewing ...` state while the agent runs.
7. Shows raw review output for the `Review` mode.
8. Runs lint, typecheck, tests, and build through a lint agent for
   `Full pipeline`.
9. Runs a fixing agent for `Review and Fix` when review findings need fixes,
   and for `Full pipeline` after lint when review or verification findings need
   fixes.
10. Runs a PR agent for `Full pipeline` when review, lint, and fix verdicts
   allow it.
11. Gives agents two PTY tools: `execCommand` and `writeStdin`.
12. Marks the run as `Completed.`

The diff line-count summary and review result summary are logged after the
terminal UI exits.

## Environment

Create a local `.env` file:

```sh
OPENAI_API_KEY="your-api-key"
OPENAI_BASE_URL="http://localhost:20128/v1"
OPENAI_MODEL="cx/gpt-5.5"
```

The CLI defaults to `cx/gpt-5.5` when `OPENAI_MODEL` is not set.

The `.env` file is ignored by git.

## Requirements

- Node.js 22 or newer
- pnpm 11
- git
- Lexa, optional but recommended for richer review context

## Install

Install dependencies and link the CLI globally:

```sh
./install.sh
```

The installer runs `pnpm install`, builds the app, and symlinks `review-this`
into a user bin directory. It prefers `~/.local/bin` or `~/bin` when either
directory is on your `PATH`.

To choose the install location:

```sh
INSTALL_BIN_DIR="$HOME/bin" ./install.sh
```

Then run:

```sh
review-this
```

## Development

Install dependencies:

```sh
pnpm install
```

Run the CLI from source through a build:

```sh
pnpm dev
```

Build:

```sh
pnpm build
```

Typecheck:

```sh
pnpm typecheck
```

Run the compiled CLI:

```sh
pnpm start
```

## Project Structure

```text
src/
  app/                    App shell and global key handling
  components/             Shared Ink UI components
  features/agent/         Anvia review agent and node-pty tools
  features/diff-scope/    Diff scope choices
  features/git-diff/      Git diff loading and stats parsing
  features/main-menu/     Main menu UI and navigation
  features/pipeline/      Pipeline runner and pipeline screen
  lib/                    Shared terminal and logging utilities
```

## Keyboard

On the menu screen:

- `Up` / `Down` or `k` / `j` moves selection
- `1`, `2`, `3` chooses a mode directly
- `Enter` starts the selected mode
- `q`, `Esc`, or `Ctrl-C` exits

On the pipeline screen:

- `q`, `Esc`, or `Ctrl-C` exits
