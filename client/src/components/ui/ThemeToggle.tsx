import { useEffect } from "react";
import { useGameStore } from "@/lib/stores/gameStore";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sun, Moon, Sparkles, Sunset } from "lucide-react";
import type { Theme } from "@shared/schema";

const themes: { id: Theme; name: string; icon: React.ReactNode }[] = [
  { id: "light", name: "Classic Light", icon: <Sun className="w-4 h-4" /> },
  { id: "dark", name: "Dark Mode", icon: <Moon className="w-4 h-4" /> },
  { id: "neon", name: "Neon Racer", icon: <Sparkles className="w-4 h-4" /> },
  { id: "sunset", name: "Sunset Drive", icon: <Sunset className="w-4 h-4" /> },
];

export function ThemeToggle() {
  const { theme, setTheme } = useGameStore();

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("light", "dark", "neon", "sunset");

    // Add theme class for CSS variable scopes
    root.classList.add(theme);

    // Manage tailwind dark mode class for non-light themes
    if (theme === "light") {
      root.classList.remove("dark");
    } else {
      root.classList.add("dark");
    }

    if (theme === "neon") {
      // Neon Racer primary
      root.style.setProperty("--primary", "262 83% 58%"); /* #7C3AED */
      root.style.setProperty("--primary-foreground", "0 0% 100%");
      root.style.setProperty("--ring", "262 83% 58%");
    } else if (theme === "sunset") {
      // Sunset Drive primary
      root.style.setProperty("--primary", "20 90% 58%"); /* warm orange */
      root.style.setProperty("--primary-foreground", "0 0% 100%");
      root.style.setProperty("--ring", "20 90% 58%");
    } else {
      root.style.setProperty("--primary", "183 100% 36%");
      root.style.setProperty("--primary-foreground", "0 0% 98%");
      root.style.setProperty("--ring", "183 100% 36%");
    }
  }, [theme]);

  const currentTheme = themes.find((t) => t.id === theme) || themes[1];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" data-testid="button-theme-toggle">
          {currentTheme.icon}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {themes.map((t) => (
          <DropdownMenuItem
            key={t.id}
            onClick={() => setTheme(t.id)}
            className="flex items-center gap-2"
            data-testid={`theme-option-${t.id}`}
          >
            {t.icon}
            <span>{t.name}</span>
            {theme === t.id && (
              <svg
                className="w-4 h-4 ml-auto text-primary"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
