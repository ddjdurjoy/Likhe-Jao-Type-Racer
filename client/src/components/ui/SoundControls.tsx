import { useGameStore } from "@/lib/stores/gameStore";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import React, { useRef } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { soundManager } from "@/lib/utils/soundManager";

export function SoundControls() {
  const { soundEnabled, volume, setSoundEnabled, setVolume } = useGameStore();
  const previewTimeout = useRef<number | null>(null);
  const lastPreviewAt = useRef<number>(0);
  // Initialize audio context on user interaction without calling hooks
  const onAnyInteract = () => {
    try { soundManager.resumeContext(); } catch {}
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" data-testid="button-sound-toggle" onClick={onAnyInteract}>
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
              onClick={() => { onAnyInteract(); setSoundEnabled(!soundEnabled); }}
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
                onValueChange={([val]) => {
                  onAnyInteract();
                  setVolume(val);
                  // Throttled preview: play a short tone to reflect new volume
                  const now = performance.now();
                  if (now - lastPreviewAt.current > 120) {
                    lastPreviewAt.current = now;
                    try { soundManager.playKeypress(); } catch {}
                  }
                  if (previewTimeout.current) window.clearTimeout(previewTimeout.current);
                  previewTimeout.current = window.setTimeout(() => {
                    try { soundManager.playWordComplete(); } catch {}
                  }, 200);
                }}
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
