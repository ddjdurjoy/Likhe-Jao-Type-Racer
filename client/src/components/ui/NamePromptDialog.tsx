import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function NamePromptDialog({
  open,
  onOpenChange,
  defaultValue,
  language,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  defaultValue: string;
  language: "en" | "bn";
  onConfirm: (name: string) => void;
}) {
  const [value, setValue] = useState(defaultValue);

  useEffect(() => {
    if (open) setValue(defaultValue);
  }, [open, defaultValue]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{language === "bn" ? "আপনার নাম দিন" : "Enter Your Name"}</DialogTitle>
          <DialogDescription>
            {language === "bn" ? "রেসে আপনার নাম দেখানো হবে" : "Your name will be displayed during races"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          <Input
            placeholder={language === "bn" ? "নাম লিখুন..." : "Enter your name..."}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="h-12 text-lg"
            maxLength={20}
          />
          <Button
            className="w-full h-12 text-lg font-semibold"
            onClick={() => onConfirm(value.trim())}
            disabled={!value.trim()}
          >
            {language === "bn" ? "চালিয়ে যান" : "Continue"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
