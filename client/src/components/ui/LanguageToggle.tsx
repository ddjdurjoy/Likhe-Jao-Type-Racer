import { useGameStore } from "@/lib/stores/gameStore";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Language } from "@shared/schema";

export function LanguageToggle() {
  const { language, setLanguage } = useGameStore();

  const toggleLanguage = () => {
    setLanguage(language === "en" ? "bn" : "en");
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={toggleLanguage}
      className="gap-2 font-medium"
      data-testid="button-language-toggle"
    >
      <span
        className={cn(
          "transition-opacity",
          language === "en" ? "opacity-100" : "opacity-50"
        )}
      >
        EN
      </span>
      <span className="text-muted-foreground">/</span>
      <span
        className={cn(
          "font-bengali transition-opacity",
          language === "bn" ? "opacity-100" : "opacity-50"
        )}
      >
        বাং
      </span>
    </Button>
  );
}

interface LanguageSelectorProps {
  value: Language;
  onChange: (lang: Language) => void;
}

export function LanguageSelector({ value, onChange }: LanguageSelectorProps) {
  return (
    <div className="flex gap-2" data-testid="language-selector">
      <button
        onClick={() => onChange("en")}
        className={cn(
          "flex-1 py-3 px-4 rounded-lg border-2 transition-all font-medium",
          value === "en"
            ? "border-primary bg-primary/10 text-primary"
            : "border-transparent bg-muted text-muted-foreground hover-elevate"
        )}
        data-testid="button-language-en"
      >
        <div className="flex items-center justify-center gap-2">
          <span className="text-xl">🇬🇧</span>
          <span>English</span>
        </div>
      </button>
      <button
        onClick={() => onChange("bn")}
        className={cn(
          "flex-1 py-3 px-4 rounded-lg border-2 transition-all font-medium",
          value === "bn"
            ? "border-primary bg-primary/10 text-primary"
            : "border-transparent bg-muted text-muted-foreground hover-elevate"
        )}
        data-testid="button-language-bn"
      >
        <div className="flex items-center justify-center gap-2">
          <span className="text-xl">🇧🇩</span>
          <span className="font-bengali">বাংলা (Bijoy)</span>
        </div>
      </button>
    </div>
  );
}
