import { useLocation } from "wouter";
import { useGameStore, CARS } from "@/lib/stores/gameStore";
import { CarPreview } from "@/components/game/Car";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { LanguageToggle } from "@/components/ui/LanguageToggle";
import { ArrowLeft, Lock, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Garage() {
  const [, setLocation] = useLocation();
  const {
    language,
    selectedCarId,
    setSelectedCarId,
    unlockedCars,
    totalRaces,
    totalWins,
  } = useGameStore();

  const handleBack = () => {
    setLocation("/");
  };

  const getUnlockRequirement = (carId: number): string => {
    switch (carId) {
      case 2:
        return language === "bn" ? "১০টি রেস সম্পন্ন করুন" : "Complete 10 races";
      case 3:
        return language === "bn" ? "৫টি রেস জিতুন" : "Win 5 races";
      case 4:
        return language === "bn" ? "২৫টি রেস সম্পন্ন করুন" : "Complete 25 races";
      default:
        return "";
    }
  };

  const isCarUnlocked = (carId: number): boolean => {
    if (unlockedCars.includes(carId)) return true;

    switch (carId) {
      case 2:
        return totalRaces >= 10;
      case 3:
        return totalWins >= 5;
      case 4:
        return totalRaces >= 25;
      default:
        return carId <= 1;
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="flex items-center justify-between p-4 border-b border-border sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/75">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleBack}
          className="gap-2"
          data-testid="button-back-home"
        >
          <ArrowLeft className="w-4 h-4" />
          {language === "bn" ? "ফিরে যান" : "Back"}
        </Button>

        <h1 className="text-xl font-display font-bold">
          {language === "bn" ? "গ্যারেজ" : "Garage"}
        </h1>

        <div className="flex items-center gap-2">
          <LanguageToggle />
          <ThemeToggle />
        </div>
      </header>

      <main className="flex-1 p-6 overflow-y-auto no-scrollbar">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-heading font-bold mb-2">
              {language === "bn" ? "আপনার গাড়ি বাছাই করুন" : "Choose Your Car"}
            </h2>
            <p className="text-muted-foreground">
              {language === "bn"
                ? "রেস জিতে আরও গাড়ি আনলক করুন!"
                : "Win races to unlock more cars!"}
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
            {CARS.map((car) => {
              const unlocked = isCarUnlocked(car.id);
              const selected = selectedCarId === car.id;

              return (
                <Card
                  key={car.id}
                  className={cn(
                    "relative p-4 cursor-pointer transition-all",
                    selected && "ring-2 ring-primary",
                    !unlocked && "opacity-60"
                  )}
                  onClick={() => unlocked && setSelectedCarId(car.id)}
                  data-testid={`car-card-${car.id}`}
                >
                  <div className="flex flex-col items-center">
                    <div className="relative mb-3">
                      <CarPreview carId={car.id} size="lg" />
                      {!unlocked && (
                        <div className="absolute inset-0 flex items-center justify-center bg-background/60 rounded-lg">
                          <Lock className="w-8 h-8 text-muted-foreground" />
                        </div>
                      )}
                    </div>

                    <h3 className="font-medium text-center text-sm">{car.name}</h3>

                    {unlocked ? (
                      selected ? (
                        <div className="mt-2 flex items-center gap-1 text-xs text-primary">
                          <Check className="w-3 h-3" />
                          {language === "bn" ? "নির্বাচিত" : "Selected"}
                        </div>
                      ) : (
                        <div className="mt-2 text-xs text-muted-foreground">
                          {language === "bn" ? "আনলক করা হয়েছে" : "Unlocked"}
                        </div>
                      )
                    ) : (
                      <div className="mt-2 text-xs text-muted-foreground text-center">
                        {getUnlockRequirement(car.id)}
                      </div>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>

          <Card className="p-6">
            <h3 className="font-heading font-semibold mb-4">
              {language === "bn" ? "আপনার অগ্রগতি" : "Your Progress"}
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <div className="text-2xl font-bold text-primary">{totalRaces}</div>
                <div className="text-xs text-muted-foreground">
                  {language === "bn" ? "মোট রেস" : "Total Races"}
                </div>
              </div>
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <div className="text-2xl font-bold text-success">{totalWins}</div>
                <div className="text-xs text-muted-foreground">
                  {language === "bn" ? "জয়" : "Wins"}
                </div>
              </div>
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <div className="text-2xl font-bold">
                  {CARS.filter((c) => isCarUnlocked(c.id)).length}
                </div>
                <div className="text-xs text-muted-foreground">
                  {language === "bn" ? "আনলক করা গাড়ি" : "Cars Unlocked"}
                </div>
              </div>
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <div className="text-2xl font-bold">{CARS.length}</div>
                <div className="text-xs text-muted-foreground">
                  {language === "bn" ? "মোট গাড়ি" : "Total Cars"}
                </div>
              </div>
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
}
