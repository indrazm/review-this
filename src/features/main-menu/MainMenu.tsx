import { Box, Text } from "ink";
import { MENU_ITEMS, type MenuItem } from "./menuItems.js";
import { useMenuNavigation } from "./useMenuNavigation.js";

type MainMenuProps = {
  readonly onChoose: (item: MenuItem) => void;
};

export function MainMenu({ onChoose }: MainMenuProps) {
  const { selectedIndex } = useMenuNavigation({
    itemCount: MENU_ITEMS.length,
    onChoose: (index) => {
      onChoose(MENU_ITEMS[index]);
    },
  });

  return (
    <Box flexDirection="column" width={44} gap={1}>
      <Box flexDirection="column">
        <Text bold wrap="truncate">
          review-pipeline
        </Text>
        <Text dimColor wrap="truncate">
          Choose a run mode
        </Text>
      </Box>

      <Box flexDirection="column" gap={1}>
        {MENU_ITEMS.map((item, index) => {
          const isSelected = selectedIndex === index;

          return (
            <Box key={item.id}>
              <Text color={isSelected ? "cyan" : undefined} bold={isSelected}>
                {isSelected ? "> " : "  "}
                {index + 1}. {item.label}
              </Text>
            </Box>
          );
        })}
      </Box>

      <Box height={1} />
    </Box>
  );
}
