import { useEffect, useRef } from "react";

// Subtle cursor halo that scales with movement speed. Keeps native cursor visible.
export function CursorVelocityFX() {
  const ringRef = useRef<HTMLDivElement | null>(null);
  const lastRef = useRef<{ x: number; y: number; t: number } | null>(null);
  const targetRef = useRef<{ x: number; y: number; scale: number }>({ x: -9999, y: -9999, scale: 1 });
  const stateRef = useRef<{ x: number; y: number; scale: number }>({ x: -9999, y: -9999, scale: 1 });
  const lastActiveRef = useRef<number>(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const now = performance.now();
      const last = lastRef.current;
      if (last) {
        const dx = e.clientX - last.x;
        const dy = e.clientY - last.y;
        const dt = Math.max(1, now - last.t);
        const speed = Math.hypot(dx, dy) / dt; // px per ms
        // Show only when moving fast enough
        if (speed > 0.25) {
          lastActiveRef.current = now;
          // Map speed to scale: base 1 up to ~2.2
          const s = 1 + Math.min(1.2, (speed - 0.25) * 2.2);
          targetRef.current.scale = s;
        }
      }
      targetRef.current.x = e.clientX;
      targetRef.current.y = e.clientY;
      lastRef.current = { x: e.clientX, y: e.clientY, t: now };
    };

    const onLeave = () => {
      targetRef.current.scale = 1;
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseleave", onLeave);

    const loop = () => {
      // Ease ring position and scale towards target
      stateRef.current.x += (targetRef.current.x - stateRef.current.x) * 0.25;
      stateRef.current.y += (targetRef.current.y - stateRef.current.y) * 0.25;
      stateRef.current.scale += (targetRef.current.scale - stateRef.current.scale) * 0.2;

      const el = ringRef.current;
      if (el) {
        const s = stateRef.current.scale;
        el.style.transform = `translate3d(${stateRef.current.x}px, ${stateRef.current.y}px, 0) translate(-50%,-50%) scale(${s})`;
        // Gradually fall back to base size when not moving
        targetRef.current.scale += (1 - targetRef.current.scale) * 0.04;
        // Only show when recently active and above base scale
        const now = performance.now();
        const visible = s > 1.01 && (now - lastActiveRef.current) < 220;
        el.style.opacity = visible ? String(0.35 + (s - 1) * 0.3) : "0";
      }
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseleave", onLeave);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <div className="pointer-events-none fixed inset-0 z-[60]">
      <div
        ref={ringRef}
        className="absolute w-5 h-5 rounded-full"
        style={{
          border: "2px solid hsl(var(--primary))",
          boxShadow: "0 0 12px 2px hsl(var(--primary) / 0.25)",
          transition: "opacity 120ms linear",
        }}
      />
    </div>
  );
}
