# review-pipeline

Minimal pnpm + TypeScript + Ink CLI scaffold for `rp`.

## Setup

```sh
pnpm install
pnpm dev
```

## Global Install

```sh
./install.sh
```

The installer runs `pnpm install`, builds the CLI, and symlinks `rp` into a user
bin directory on your `PATH`.

You can choose the install directory:

```sh
INSTALL_BIN_DIR="$HOME/bin" ./install.sh
```

After installing:

```sh
rp
```
