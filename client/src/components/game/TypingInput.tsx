import {
  memo,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { cn } from "@/lib/utils";
import { useGameStore } from "@/lib/stores/gameStore";

interface TypingInputProps {
  words: string[];
  currentWordIndex: number;
  currentInput: string;
  /**
   * Optional word-by-word inputs for previous words.
   * Practice passes this to render correct/incorrect coloring for past words.
   * Race mode may omit it.
   */
  inputHistory?: string[];
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  inputRef: React.RefObject<HTMLInputElement>;
  disabled?: boolean;
}

const normalize = (s: string) => (s ?? "").normalize("NFC");

type WordRenderMode = "past" | "current" | "future";

type WordProps = {
  globalIndex: number;
  target: string[];
  typed: string;
  mode: WordRenderMode;
  onCaretAnchor: (el: HTMLSpanElement | null) => void;
  splitTyped: (text: string) => string[];
};

const Word = memo(function Word({
  globalIndex,
  target,
  typed,
  mode,
  onCaretAnchor,
  splitTyped,
}: WordProps) {
  const typedGraphemes = typed.length ? splitTyped(typed.normalize("NFC")) : [];

  const max = Math.max(target.length, typedGraphemes.length);
  const caretPos = mode === "current" ? typedGraphemes.length : -1;

  const getCls = (tc: string | undefined, ic: string | undefined) => {
    if (mode === "future") return "text-muted-foreground/60";

    const correct = ic === tc;

    if (mode === "past") {
      return correct ? "text-success/80" : "text-destructive";
    }

    // current
    if (ic === undefined) return "text-foreground";
    return correct ? "text-success" : "text-destructive";
  };

  return (
    <span data-word-index={globalIndex} className="inline-block mr-3">
      {Array.from({ length: max }).map((_, idx) => {
        const tc = target[idx];
        const ic = typedGraphemes[idx];
        const isCaretHere = mode === "current" && caretPos === idx;

        // missed (target exists, user didn't type it)
        if (ic === undefined && tc !== undefined) {
          return (
            <span key={idx} className="relative">
              {isCaretHere && (
                <span
                  ref={onCaretAnchor}
                  className="inline-block w-0 align-baseline"
                  style={{ height: "1em" }}
                />
              )}
              <span
                className={cn(
                  // Monkeytype-like: underline missed chars for past words
                  mode === "past"
                    ? "text-destructive/80 underline underline-offset-[6px] decoration-destructive/50"
                    : "text-foreground"
                )}
              >
                {tc}
              </span>
            </span>
          );
        }

        // extra (user typed beyond target length)
        if (tc === undefined && ic !== undefined) {
          return (
            <span
              key={idx}
              className={cn(
                "relative",
                "text-destructive",
                // Monkeytype-like: extra chars with subtle background
                "bg-destructive/15 rounded-sm"
              )}
            >
              {isCaretHere && (
                <span
                  ref={onCaretAnchor}
                  className="inline-block w-0 align-baseline"
                  style={{ height: "1em" }}
                />
              )}
              {ic}
            </span>
          );
        }

        const cls = getCls(tc, ic);
        return (
          <span key={idx} className={cn("relative", cls)}>
            {isCaretHere && (
              <span
                ref={onCaretAnchor}
                className="inline-block w-0 align-baseline"
                style={{ height: "1em" }}
              />
            )}
            {tc}
          </span>
        );
      })}

      {/* caret at end of word (after all typed chars) */}
      {mode === "current" && caretPos === max && (
        <span
          ref={onCaretAnchor}
          className="inline-block w-0 align-baseline"
          style={{ height: "1em" }}
        />
      )}

      <span className="text-muted-foreground/40"> </span>
    </span>
  );
});

export function TypingInput({
  words,
  currentWordIndex,
  currentInput,
  inputHistory = [],
  onKeyDown,
  onChange,
  inputRef,
  disabled,
}: TypingInputProps) {
  const { language } = useGameStore();

  const viewportRef = useRef<HTMLDivElement>(null);
  const tapeRef = useRef<HTMLDivElement>(null);
  const caretAnchorRef = useRef<HTMLSpanElement | null>(null);

  const [lineHeight, setLineHeight] = useState(32);

  // Tape scrolling state (Monkeytype-like line jump)
  const [baseOffsetPx, setBaseOffsetPx] = useState(0);
  const [jumpAnimPx, setJumpAnimPx] = useState(0);
  const totalOffsetPx = baseOffsetPx + jumpAnimPx;

  // Word windowing/pruning to keep DOM small
  const [windowStart, setWindowStart] = useState(0);
  // Keep buffer limited: large windows cause React work on every keystroke.
  // Monkeytype renders only what's needed; we approximate with a smaller buffer.
  const afterCount = 140;

  // Smooth caret DOM element (Monkeytype-like). We update its transform via rAF to avoid React state jitter.
  const caretElRef = useRef<HTMLSpanElement>(null);

  const debugEnabled = false;
  const [debug, setDebug] = useState<any>(null);

  const segmenter = useMemo(() => {
    try {
      const locale = language === "bn" ? "bn" : "en";
      // @ts-ignore
      if (typeof Intl !== "undefined" && (Intl as any).Segmenter) {
        // @ts-ignore
        return new (Intl as any).Segmenter(locale, { granularity: "grapheme" });
      }
    } catch {}
    return null;
  }, [language]);

  const splitGraphemes = useCallback(
    (text: string) => {
      if (!text) return [] as string[];
      if (segmenter) {
        const out: string[] = [];
        // @ts-ignore
        for (const s of segmenter.segment(text)) out.push(s.segment);
        return out;
      }
      return Array.from(text);
    },
    [segmenter]
  );

  // Reset on restart
  useEffect(() => {
    if (currentWordIndex === 0) {
      setWindowStart(0);
      setBaseOffsetPx(0);
      setJumpAnimPx(0);
    }
  }, [currentWordIndex]);

  // Focus
  useEffect(() => {
    if (!disabled) inputRef.current?.focus();
  }, [disabled, inputRef]);

  const onFocusArea = () => {
    if (!disabled) inputRef.current?.focus();
  };

  const windowedWords = useMemo(() => {
    const start = Math.max(0, Math.min(windowStart, currentWordIndex));
    const end = Math.min(words.length, start + afterCount);
    return { start, slice: words.slice(start, end) };
  }, [words, windowStart, currentWordIndex]);

  // Measure line height from tape
  useLayoutEffect(() => {
    const el = tapeRef.current;
    if (!el) return;
    const cs = window.getComputedStyle(el);
    const lh = Number.parseFloat(cs.lineHeight || "0");
    if (Number.isFinite(lh) && lh > 0) setLineHeight(lh);
  }, [language]);

  // Smooth caret: compute caret position from the anchor and apply it directly to the caret element.
  // This avoids re-rendering on every keystroke and makes movement feel like Monkeytype.
  const rafRef = useRef<number | null>(null);
  useLayoutEffect(() => {
    const anchor = caretAnchorRef.current;
    const tape = tapeRef.current;
    const caretEl = caretElRef.current;
    if (!anchor || !tape || !caretEl) return;

    const ar = anchor.getBoundingClientRect();
    const tr = tape.getBoundingClientRect();

    const x = ar.left - tr.left;
    const y = ar.top - tr.top;

    const h = Math.max(2, Math.round(lineHeight * 0.9));
    const yCentered = y + Math.round((lineHeight - h) / 2);

    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      caretEl.style.height = `${h}px`;
      caretEl.style.transform = `translate3d(${x}px, ${yCentered}px, 0)`;
      caretEl.style.opacity = disabled ? "0.3" : "1";
    });

    if (import.meta.env.DEV && debugEnabled) {
      setDebug({
        wordIndex: currentWordIndex,
        windowStart,
        lineHeight,
        baseOffsetPx,
        jumpAnimPx,
        totalOffsetPx,
        anchorRect: {
          left: Math.round(ar.left),
          top: Math.round(ar.top),
          height: Math.round(ar.height),
        },
        tapeRect: { left: Math.round(tr.left), top: Math.round(tr.top) },
        caret: { x: Math.round(x), y: Math.round(yCentered), h },
      });
    }

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, [
    currentWordIndex,
    currentInput,
    inputHistory,
    windowedWords.start,
    lineHeight,
    baseOffsetPx,
    jumpAnimPx,
    totalOffsetPx,
    disabled,
  ]);

  // Monkeytype-like line jump:
  // - when the active word moves to a new line and would enter the 4th visible line,
  //   we animate a 1-line upward shift.
  // - after the animation, we prune the first line worth of words to keep the DOM small.
  // - IMPORTANT: we compensate the base offset after pruning so nothing "teleports".
  const lastJumpWordIndexRef = useRef<number>(0);
  const isJumpingRef = useRef(false);
  const pendingJumpRef = useRef<null | { anchorTopRelBefore: number; addOffset: number }>(
    null
  );

  useLayoutEffect(() => {
    const anchor = caretAnchorRef.current;
    const viewport = viewportRef.current;
    if (!anchor || !viewport) return;

    if (currentWordIndex === 0) {
      lastJumpWordIndexRef.current = 0;
      isJumpingRef.current = false;
      pendingJumpRef.current = null;
      return;
    }

    // only check on word change
    if (lastJumpWordIndexRef.current === currentWordIndex) return;
    lastJumpWordIndexRef.current = currentWordIndex;

    const ar = anchor.getBoundingClientRect();
    const vr = viewport.getBoundingClientRect();
    const yInViewport = ar.top - vr.top;
    const lineInViewport = Math.floor((yInViewport + 1) / lineHeight);

    // With a 4-line viewport, roll when caret would enter the 4th line (0-based 3)
    if (isJumpingRef.current) return;
    if (lineInViewport < 3) return;

    isJumpingRef.current = true;
    setJumpAnimPx(lineHeight);

    // after the animation completes, prune and compensate
    window.setTimeout(() => {
      const anchorNow = caretAnchorRef.current;
      const tape = tapeRef.current;
      if (!anchorNow || !tape) {
        setJumpAnimPx(0);
        isJumpingRef.current = false;
        pendingJumpRef.current = null;
        return;
      }

      const tr = tape.getBoundingClientRect();
      const anchorTopRelBefore = anchorNow.getBoundingClientRect().top - tr.top;

      // prune words above the current caret line
      const activeTop = anchorNow.getBoundingClientRect().top;
      let lastToRemove = windowStart - 1;

      for (let i = windowStart; i < currentWordIndex; i++) {
        const wordEl = tape.querySelector(`[data-word-index="${i}"]`) as
          | HTMLElement
          | null;
        if (!wordEl) continue;
        const top = wordEl.getBoundingClientRect().top;
        if (top < activeTop) lastToRemove = i;
      }

      const newStart = lastToRemove >= windowStart ? lastToRemove + 1 : windowStart;

      // If pruning won't change state, apply the offset update immediately.
      if (newStart === windowStart) {
        setBaseOffsetPx((prev) => prev + lineHeight);
        setJumpAnimPx(0);
        isJumpingRef.current = false;
        pendingJumpRef.current = null;
        return;
      }

      pendingJumpRef.current = { anchorTopRelBefore, addOffset: lineHeight };
      setWindowStart(newStart);
    }, 150);
  }, [currentWordIndex, lineHeight, windowStart]);

  // After pruning words, compensate the base offset so the tape doesn't "teleport".
  useLayoutEffect(() => {
    const pending = pendingJumpRef.current;
    if (!pending) return;

    const anchor = caretAnchorRef.current;
    const tape = tapeRef.current;
    if (!anchor || !tape) {
      pendingJumpRef.current = null;
      setJumpAnimPx(0);
      isJumpingRef.current = false;
      return;
    }

    const tr = tape.getBoundingClientRect();
    const anchorTopRelAfter = anchor.getBoundingClientRect().top - tr.top;
    const delta = anchorTopRelAfter - pending.anchorTopRelBefore;

    // Increase offset by one line (jump), then add delta to compensate for DOM removal.
    setBaseOffsetPx((prev) => prev + pending.addOffset + delta);

    pendingJumpRef.current = null;
    setJumpAnimPx(0);
    isJumpingRef.current = false;
  }, [windowStart]);

  const setCaretAnchor = useCallback((el: HTMLSpanElement | null) => {
    if (el) caretAnchorRef.current = el;
  }, []);

  const noopCaretAnchor = useCallback((_el: HTMLSpanElement | null) => {}, []);

  // Cache target graphemes for words in the current window so we don't re-split on every keystroke.
  const windowedTargets = useMemo(() => {
    return windowedWords.slice.map((w) => splitGraphemes(normalize(w)));
  }, [windowedWords.slice, splitGraphemes]);

  // Visible test window height (Monkeytype-like). User requested 4 visible lines.
  const viewportHeight = Math.round(lineHeight * 4);

  return (
    <div className="w-full" onClick={onFocusArea}>
      <div
        className={cn(
          "relative",
          "cursor-text select-none",
          language === "bn" && "font-bengali"
        )}
        style={{ height: viewportHeight }}
        onMouseDown={(e) => e.preventDefault()}
      >
        <div ref={viewportRef} className="absolute inset-0">
          <div
            style={{
              willChange: "transform",
              transform: `translate3d(0, ${-totalOffsetPx}px, 0)`,
              // Only animate when we are performing a line jump. Animating on every keystroke can feel "sticky".
              transition:
                jumpAnimPx !== 0
                  ? "transform 170ms cubic-bezier(0.2, 0, 0.2, 1)"
                  : "none",
            }}
          >
            <div
              ref={tapeRef}
              className="relative text-xl sm:text-2xl md:text-3xl leading-[2.2rem] sm:leading-[2.6rem] md:leading-[3.1rem] text-foreground/90"
            >
              {/* Smooth caret (Monkeytype-like) */}
              <span
                ref={caretElRef}
                className={cn(
                  "typing-caret",
                  "absolute left-0 top-0",
                  "w-0.5",
                  "bg-primary",
                  "pointer-events-none",
                  disabled ? "opacity-30" : "opacity-100"
                )}
                style={{
                  height: Math.round(lineHeight * 0.9),
                  transform: "translate3d(0,0,0)",
                }}
                data-testid="typing-caret"
              />

              {windowedWords.slice.map((w, i) => {
                const globalIndex = windowedWords.start + i;
                const mode: WordRenderMode =
                  globalIndex < currentWordIndex
                    ? "past"
                    : globalIndex === currentWordIndex
                      ? "current"
                      : "future";

                const typed =
                  mode === "past"
                    ? inputHistory[globalIndex] || ""
                    : mode === "current"
                      ? currentInput
                      : "";

                return (
                  <Word
                    key={globalIndex}
                    globalIndex={globalIndex}
                    target={windowedTargets[i] || splitGraphemes(normalize(w))}
                    typed={typed}
                    mode={mode}
                    onCaretAnchor={mode === "current" ? setCaretAnchor : noopCaretAnchor}
                    splitTyped={splitGraphemes}
                  />
                );
              })}
            </div>
          </div>
        </div>

        <input
          ref={inputRef}
          type="text"
          value={currentInput}
          onKeyDown={onKeyDown}
          onChange={onChange}
          disabled={disabled}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          lang={language === "bn" ? "bn" : "en"}
          className="absolute opacity-0 pointer-events-none -z-10 caret-transparent"
          aria-label={language === "bn" ? "টাইপিং ইনপুট" : "Typing input"}
        />
      </div>

      {import.meta.env.DEV && debugEnabled && debug && (
        <div className="absolute top-2 right-2 z-20 text-[10px] text-muted-foreground font-mono rounded-md border border-border/50 p-2 bg-background/70 backdrop-blur max-w-[280px] max-h-[220px] overflow-auto">
          <div className="font-semibold mb-1">caret debug (dev)</div>
          <pre className="whitespace-pre-wrap">{JSON.stringify(debug, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}
