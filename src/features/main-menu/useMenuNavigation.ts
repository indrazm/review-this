import { useRef, useState } from "react";
import { useInput } from "ink";

type UseMenuNavigationOptions = {
  readonly itemCount: number;
  readonly onChoose: (index: number) => void;
};

type MenuNavigation = {
  readonly selectedIndex: number;
};

export function useMenuNavigation({
  itemCount,
  onChoose,
}: UseMenuNavigationOptions): MenuNavigation {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const selectedIndexRef = useRef(0);

  const selectIndex = (index: number): void => {
    selectedIndexRef.current = index;
    setSelectedIndex(index);
  };

  useInput((input, key) => {
    if (itemCount === 0) {
      return;
    }

    if (key.upArrow || input === "k") {
      selectIndex(wrapIndex(selectedIndexRef.current - 1, itemCount));
      return;
    }

    if (key.downArrow || input === "j") {
      selectIndex(wrapIndex(selectedIndexRef.current + 1, itemCount));
      return;
    }

    if (key.return) {
      onChoose(selectedIndexRef.current);
      return;
    }

    const numericChoice = Number.parseInt(input, 10);

    if (
      Number.isInteger(numericChoice) &&
      numericChoice >= 1 &&
      numericChoice <= itemCount
    ) {
      const nextIndex = numericChoice - 1;

      selectIndex(nextIndex);
      onChoose(nextIndex);
    }
  });

  return { selectedIndex };
}

function wrapIndex(index: number, itemCount: number): number {
  return (index + itemCount) % itemCount;
}
