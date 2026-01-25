"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { buildApiUrl } from "../../lib/api";

interface ThemeColors {
  primary_50: string;
  primary_100: string;
  primary_200: string;
  primary_300: string;
  primary_400: string;
  primary_500: string;
  primary_600: string;
  primary_700: string;
  primary_800: string;
  primary_900: string;
}

interface Theme {
  name: string;
  colors: ThemeColors;
  logo_url?: string;
}

interface ThemeContextType {
  theme: Theme | null;
  loading: boolean;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: null,
  loading: true,
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTheme();
  }, []);

  const fetchTheme = async () => {
    try {
      const response = await fetch(buildApiUrl("/api/v1/theme"));
      if (response.ok) {
        const data = await response.json();
        setTheme(data);
        applyTheme(data);
      }
    } catch (error) {
      console.error("Failed to fetch theme:", error);
    } finally {
      setLoading(false);
    }
  };

  const applyTheme = (themeData: Theme) => {
    // Apply CSS variables for theme colors
    const root = document.documentElement;
    Object.entries(themeData.colors).forEach(([key, value]) => {
      const cssVarName = `--color-${key.replace("primary_", "primary-")}`;
      root.style.setProperty(cssVarName, value);
    });
  };

  return (
    <ThemeContext.Provider value={{ theme, loading }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
