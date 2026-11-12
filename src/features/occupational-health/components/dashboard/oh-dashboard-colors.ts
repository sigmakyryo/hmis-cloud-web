/** Status and series colours for OH dashboards, aligned with the reports palette. */
export const OH_COLORS = {
  primary: "#0b6e6e",
  completed: "#2f5e46",
  due: "#b86a1f",
  overdue: "#b42318",
  waived: "#8a979e",
  info: "#3d6b99",
  brown: "#7a4e2d",
  slate: "#5b6b73",
} as const;

export const OH_SERIES_PALETTE = [
  OH_COLORS.primary,
  OH_COLORS.info,
  OH_COLORS.due,
  OH_COLORS.completed,
  OH_COLORS.brown,
  OH_COLORS.slate,
  "#9b5f8f",
  "#4f7d3a",
] as const;
