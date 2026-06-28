import { useState } from "react";
import process from "node:process";
import { useWindowSize } from "ink";
import { FullscreenFrame } from "../components/FullscreenFrame.js";
import { MainMenu } from "../features/main-menu/MainMenu.js";
import type { MenuItem } from "../features/main-menu/menuItems.js";
import { PipelineScreen } from "../features/pipeline/PipelineScreen.js";
import { useExitKeys } from "./useExitKeys.js";

export function App() {
  useExitKeys();

  const { columns, rows } = useWindowSize();
  const [selectedMode, setSelectedMode] = useState<MenuItem | undefined>();

  const isPipelineOpen = selectedMode !== undefined;

  return (
    <FullscreenFrame
      columns={columns}
      contentLayout={isPipelineOpen ? "fill" : "center"}
      rows={rows}
      footer={
        isPipelineOpen
          ? "q / Esc exit"
          : "Up/Down select | Enter choose | q / Esc exit"
      }
    >
      {selectedMode === undefined ? (
        <MainMenu onChoose={setSelectedMode} />
      ) : (
        <PipelineScreen cwd={process.cwd()} mode={selectedMode} />
      )}
    </FullscreenFrame>
  );
}
