import { useMemo, useState, useEffect, useRef } from "react";
import { Link } from "wouter";
import { useGameStore } from "@/lib/stores/gameStore";
import type { Language, Theme } from "@shared/schema";

const THEME_NAME_MAP: Record<Theme, string[]> = {
  light: ["Classic Mode", "Classic Light", "Light Mode", "Light"],
  dark: ["Dark Mode", "Dark", "Night Mode"],
  neon: ["Neon Racer", "Neon", "Neon Mode"],
  sunset: ["Sunset Drive", "Sunset", "Sunset Mode"],
};

const LANG_NAME_MAP: Record<Language, string> = {
  en: "English",
  bn: "Bengali",
};

const FALLBACK_BY_LANG: Record<Language, string> = {
  en: "/Logo%20For%20English.svg",
  bn: "/Logo%20For%20Bengali.svg",
};

function buildCandidates(theme: Theme, language: Language): string[] {
  const themeNames = THEME_NAME_MAP[theme] || [];
  const langName = LANG_NAME_MAP[language];
  const encoded = (s: string) => encodeURI(s);

  const list: string[] = [];
  // User-specified format: "Logo For {Language} - {ThemeName}.svg" (single space)
  for (const t of themeNames) {
    const name = `/Logo For ${langName} - ${t}.svg`;
    list.push(encoded(name));
  }
  // Fallback: occasionally files might include double spaces around the hyphen
  for (const t of themeNames) {
    const name = `/Logo For ${langName}  - ${t}.svg`;
    list.push(encoded(name));
  }
  // Fallback to language-only logo
  list.push(FALLBACK_BY_LANG[language]);
  return list;
}

export function HeaderLogo({ size = 40 }: { size?: number }) {
  const { theme, language } = useGameStore();
  const candidates = useMemo(() => buildCandidates(theme, language), [theme, language]);
  const [idx, setIdx] = useState(0);
  const [resolvedSrc, setResolvedSrc] = useState<string | null>(null);
  const cacheRef = useRef<Record<string, string>>({});

  useEffect(() => {
    let isMounted = true;
    const key = `${theme}-${language}`;

    // Use cache if available to prevent flicker on route/theme changes
    const cached = cacheRef.current[key];
    if (cached) {
      setResolvedSrc(cached);
      return () => {
        isMounted = false;
      };
    }

    setIdx(0);

    // Preload in order; pick the first that loads successfully
    (async () => {
      let chosen: string | null = null;
      for (let i = 0; i < candidates.length; i++) {
        const candidateSrc = candidates[i];
        try {
          await new Promise<void>((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve();
            img.onerror = reject;
            img.src = candidateSrc;
          });
          chosen = candidateSrc;
          break;
        } catch {
          if (isMounted) setIdx(i + 1);
        }
      }
      if (!chosen) {
        chosen = candidates[candidates.length - 1];
      }
      if (isMounted && chosen) {
        cacheRef.current[key] = chosen;
        setResolvedSrc(chosen);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [candidates, theme, language]);

  const src = resolvedSrc ?? FALLBACK_BY_LANG[language];

  return (
    <Link href="/" aria-label={language === "bn" ? "হোম" : "Home"} className="inline-flex items-center">
      {/* eslint-disable-next-line jsx-a11y/alt-text */}
      <img
        src={src}
        alt={language === "bn" ? "লিখে যাও" : "Likhe Jao"}
        className="w-auto"
        style={{ height: size }}
        loading="eager"
        decoding="async"
      />
    </Link>
  );
}

export default HeaderLogo;
