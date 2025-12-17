import { useGameStore } from "@/lib/stores/gameStore";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Volume2, VolumeX } from "lucide-react";

export function SoundControls() {
  const { soundEnabled, volume, setSoundEnabled, setVolume } = useGameStore();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" data-testid="button-sound-toggle">
          {soundEnabled ? (
            <Volume2 className="w-5 h-5" />
          ) : (
            <VolumeX className="w-5 h-5 text-muted-foreground" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64" align="end">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Sound</span>
            <Button
              variant={soundEnabled ? "default" : "outline"}
              size="sm"
              onClick={() => setSoundEnabled(!soundEnabled)}
              data-testid="button-sound-enable"
            >
              {soundEnabled ? "On" : "Off"}
            </Button>
          </div>

          {soundEnabled && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Volume</span>
                <span className="font-medium">{volume}%</span>
              </div>
              <Slider
                value={[volume]}
                onValueChange={([val]) => setVolume(val)}
                max={100}
                step={5}
                className="w-full"
                data-testid="slider-volume"
              />
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
