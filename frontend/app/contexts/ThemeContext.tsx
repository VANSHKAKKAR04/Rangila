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
  refreshTheme: () => Promise<void>;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: null,
  loading: true,
  refreshTheme: async () => {},
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchTheme = async () => {
    try {
      const response = await fetch(buildApiUrl("/api/v1/theme"));
      if (response.ok) {
        const data = await response.json();
        // Ensure logo URL is a full URL if it exists
        if (data.logo_url && !data.logo_url.startsWith("http")) {
          data.logo_url = buildApiUrl(data.logo_url);
        }
        setTheme(data);
        applyTheme(data);
      }
    } catch (error) {
      console.error("Failed to fetch theme:", error);
      // Don't fail completely - use default theme
      setTheme(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTheme();

    // Listen for theme updates from admin panel
    const handleThemeUpdate = () => {
      fetchTheme();
    };

    if (typeof window !== "undefined") {
      window.addEventListener("themeUpdated", handleThemeUpdate);
      return () => {
        window.removeEventListener("themeUpdated", handleThemeUpdate);
      };
    }
  }, []);

  const refreshTheme = async () => {
    await fetchTheme();
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
    <ThemeContext.Provider value={{ theme, loading, refreshTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
