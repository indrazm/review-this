export const MENU_ITEMS = [
  {
    id: "review",
    label: "Review",
  },
  {
    id: "review-and-fix",
    label: "Review and Fix",
  },
  {
    id: "full-pipeline",
    label: "Full pipeline",
  },
] as const;

export type MenuItem = (typeof MENU_ITEMS)[number];

