import { useGameStore } from "@/lib/stores/gameStore";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CloudRain, Snowflake, Ban, Leaf, Flower2 } from "lucide-react";

export function WeatherToggle() {
  const { weather, setWeather, language } = useGameStore();
  const items: { id: 'none' | 'rain' | 'snow' | 'leaf' | 'flower'; label: string; icon: React.ReactNode }[] = [
    { id: 'none', label: language === 'bn' ? 'বন্ধ' : 'None', icon: <Ban className="w-4 h-4" /> },
    { id: 'rain', label: language === 'bn' ? 'বৃষ্টি' : 'Rain', icon: <CloudRain className="w-4 h-4" /> },
    { id: 'snow', label: language === 'bn' ? 'তুষার' : 'Snow', icon: <Snowflake className="w-4 h-4" /> },
    { id: 'leaf', label: language === 'bn' ? 'পাতা' : 'Leaf', icon: <Leaf className="w-4 h-4" /> },
    { id: 'flower', label: language === 'bn' ? 'ফুল' : 'Flower', icon: <Flower2 className="w-4 h-4" /> },
  ];

  const current = items.find(i => i.id === weather) || items[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" data-testid="button-weather-toggle">
          {current.icon}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {items.map(i => (
          <DropdownMenuItem key={i.id} onClick={() => setWeather(i.id)} className="flex items-center gap-2">
            {i.icon}
            <span>{i.label}</span>
            {weather === i.id && (
              <svg className="w-4 h-4 ml-auto text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
