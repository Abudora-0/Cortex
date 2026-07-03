export interface ThemeDef {
  id: string;
  label: string;
  /** Representative accent (the 600 shade) for the swatch. */
  swatch: string;
}

export const THEMES: ThemeDef[] = [
  { id: "garnet", label: "Garnet", swatch: "#9b2242" },
  { id: "indigo", label: "Indigo", swatch: "#4f46e5" },
  { id: "emerald", label: "Pine", swatch: "#047857" },
  { id: "ochre", label: "Ochre", swatch: "#b45309" },
  { id: "violet", label: "Plum", swatch: "#7c3aed" },
  { id: "teal", label: "Ocean", swatch: "#0f766e" },
];

export const DEFAULT_THEME = "garnet";
export const THEME_KEY = "unihub-theme";

export const MODE_KEY = "unihub-mode";
export type Mode = "light" | "dark";
export const DEFAULT_MODE: Mode = "light";
