import { create } from "zustand";
import { persist } from "zustand/middleware";

export type PracticeMode = "time" | "words" | "custom";
export type BanglaInputMode = "unicode" | "bijoy";

interface PracticeStore {
  mode: PracticeMode;

  // mode=time
  timeSeconds: number;
  customTimeSeconds: number;

  // mode=words
  wordCount: number;
  customWordCount: number;

  // mode=custom
  customText: string;

  // time test behavior
  stopOnWordEnd: boolean;

  // bangla
  banglaInputMode: BanglaInputMode;

  setMode: (mode: PracticeMode) => void;
  setTimeSeconds: (seconds: number) => void;
  setCustomTimeSeconds: (seconds: number) => void;
  setWordCount: (count: number) => void;
  setCustomWordCount: (count: number) => void;
  setCustomText: (text: string) => void;
  setStopOnWordEnd: (value: boolean) => void;
  setBanglaInputMode: (mode: BanglaInputMode) => void;
}

export const usePracticeStore = create<PracticeStore>()(
  persist(
    (set) => ({
      mode: "time",

      timeSeconds: 30,
      customTimeSeconds: 45,

      wordCount: 25,
      customWordCount: 200,

      customText: "",

      stopOnWordEnd: true,

      banglaInputMode: "bijoy",

      setMode: (mode) => set({ mode }),
      setTimeSeconds: (timeSeconds) => set({ timeSeconds }),
      setCustomTimeSeconds: (customTimeSeconds) =>
        set({ customTimeSeconds }),
      setWordCount: (wordCount) => set({ wordCount }),
      setCustomWordCount: (customWordCount) => set({ customWordCount }),
      setCustomText: (customText) => set({ customText }),
      setStopOnWordEnd: (stopOnWordEnd) => set({ stopOnWordEnd }),
      setBanglaInputMode: (banglaInputMode) => set({ banglaInputMode }),
    }),
    {
      name: "practice-settings",
      version: 5,
    }
  )
);
