
import React, { createContext, useContext, useEffect, useState } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/firebase/config";
import { useAuth } from "@/contexts/AuthContext";

type Theme = "light" | "dark";

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (t: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { uid } = useAuth();
  const [theme, setThemeState] = useState<Theme>(() => {
    const savedTheme = localStorage.getItem("theme") as Theme | null;
    if (savedTheme === "light" || savedTheme === "dark") return savedTheme;
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    return prefersDark ? "dark" : "light";
  });

  // Apply theme to <html> + persist locally
  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") root.classList.add("dark");
    else root.classList.remove("dark");
    localStorage.setItem("theme", theme);
  }, [theme]);

  // Hydrate from Firestore when user signs in
  useEffect(() => {
    if (!uid) return;
    let cancelled = false;
    (async () => {
      try {
        const snap = await getDoc(doc(db, "users", uid, "settings", "preferences"));
        if (cancelled) return;
        const t = (snap.data() as { theme?: Theme } | undefined)?.theme;
        if (t === "light" || t === "dark") setThemeState(t);
      } catch (e) {
        console.warn("[Theme] hydrate failed", e);
      }
    })();
    return () => { cancelled = true; };
  }, [uid]);

  const persistTheme = (t: Theme) => {
    setThemeState(t);
    if (uid) {
      setDoc(doc(db, "users", uid, "settings", "preferences"), { theme: t }, { merge: true })
        .catch((e) => console.warn("[Theme] save failed", e));
    }
  };

  const toggleTheme = () => persistTheme(theme === "light" ? "dark" : "light");

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme: persistTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};
