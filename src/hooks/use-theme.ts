import { useCallback, useEffect, useState } from "react";

type Theme = "dark" | "light";

const KEY = "neet-os-theme";

function apply(theme: Theme) {
  const root = document.documentElement;
  root.classList.toggle("light", theme === "light");
  root.classList.toggle("dark", theme === "dark");
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>("dark");

  useEffect(() => {
    const stored = (localStorage.getItem(KEY) as Theme | null) ?? "dark";
    setTheme(stored);
    apply(stored);
  }, []);

  const set = useCallback((next: Theme) => {
    setTheme(next);
    localStorage.setItem(KEY, next);
    apply(next);
  }, []);

  const toggleTheme = useCallback(() => {
    set(theme === "dark" ? "light" : "dark");
  }, [theme, set]);

  return { theme, setTheme: set, toggleTheme };
}
