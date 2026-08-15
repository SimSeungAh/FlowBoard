import { create } from "zustand";

export const FLOWBOARD_THEMES = [
  {
    id: "ocean-blue",
    name: "Ocean Blue",
    primary: "#2563EB",
    secondary: "#0EA5E9",
    accent: "#14B8A6",
  },
  {
    id: "indigo-violet",
    name: "Indigo Violet",
    primary: "#4F46E5",
    secondary: "#7C3AED",
    accent: "#A78BFA",
  },
  {
    id: "mint-emerald",
    name: "Mint Emerald",
    primary: "#10B981",
    secondary: "#34D399",
    accent: "#6EE7B7",
  },
  {
    id: "coral-peach",
    name: "Coral Peach",
    primary: "#F97316",
    secondary: "#FB7185",
    accent: "#FDBA74",
  },
  {
    id: "rose-plum",
    name: "Rose Plum",
    primary: "#E11D48",
    secondary: "#BE185D",
    accent: "#F9A8D4",
  },
  {
    id: "sunflower-mustard",
    name: "Sunflower Mustard",
    primary: "#EAB308",
    secondary: "#F59E0B",
    accent: "#FDE68A",
  },
  {
    id: "slate-cyan",
    name: "Slate Cyan",
    primary: "#334155",
    secondary: "#0891B2",
    accent: "#67E8F9",
  },
  {
    id: "charcoal-lime",
    name: "Charcoal Lime",
    primary: "#1F2937",
    secondary: "#84CC16",
    accent: "#D9F99D",
  },
] as const;

export type FlowBoardTheme =
  (typeof FLOWBOARD_THEMES)[number]["id"];

interface ThemeState {
  theme: FlowBoardTheme;
  setTheme: (
    theme: FlowBoardTheme,
  ) => void;
}

const STORAGE_KEY =
  "flowboard.theme";

const DEFAULT_THEME: FlowBoardTheme =
  "ocean-blue";

function isFlowBoardTheme(
  value: string | null,
): value is FlowBoardTheme {
  if (!value) {
    return false;
  }

  return FLOWBOARD_THEMES.some(
    (theme) =>
      theme.id === value,
  );
}

function getStoredTheme(): FlowBoardTheme {
  const storedTheme =
    localStorage.getItem(
      STORAGE_KEY,
    );

  if (
    isFlowBoardTheme(
      storedTheme,
    )
  ) {
    return storedTheme;
  }

  return DEFAULT_THEME;
}

export function applyTheme(
  theme: FlowBoardTheme,
) {
  document.documentElement.dataset.theme =
    theme;
}

export function initializeTheme() {
  const theme =
    getStoredTheme();

  applyTheme(theme);

  return theme;
}

const initialTheme =
  getStoredTheme();

export const useThemeStore =
  create<ThemeState>(
    (set) => ({
      theme:
        initialTheme,

      setTheme: (
        theme,
      ) => {
        localStorage.setItem(
          STORAGE_KEY,
          theme,
        );

        applyTheme(
          theme,
        );

        set({
          theme,
        });
      },
    }),
  );