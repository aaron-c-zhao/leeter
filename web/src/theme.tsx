import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

export type Theme = "light" | "dark";

export const THEME_STORAGE_KEY = "leeter-theme";

interface ThemeContextValue {
  theme: Theme;
  toggle: () => void;
}

const noop = () => undefined;

// Default lets pages render standalone (e.g. tests) with a light theme.
const ThemeContext = createContext<ThemeContextValue>({ theme: "light", toggle: noop });

export function ThemeProvider({ children }: { children: ReactNode }) {
  // The pre-render bootstrap script in index.html guarantees data-theme is set
  // before React mounts; read it here so the first render matches.
  const [theme, setTheme] = useState<Theme>(() =>
    document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light",
  );

  const toggle = useCallback(() => setTheme((t) => (t === "dark" ? "light" : "dark")), []);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      /* storage unavailable — theme still applies for this page load */
    }
  }, [theme]);

  return <ThemeContext.Provider value={{ theme, toggle }}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}
