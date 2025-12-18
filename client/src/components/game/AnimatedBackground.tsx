import { memo, useEffect, useMemo, useRef } from "react";
import { motion, useAnimationControls } from "framer-motion";
import { useGameStore } from "@/lib/stores/gameStore";

/**
 * AnimatedBackground (theme-aware)
 * - Dark: moon + twinkling stars, dim sky
 * - Light: sun + clouds
 * - Neon: neon horizon grid + glow pulse
 * - Sunset: warm gradient with sun near horizon
 * - Optional weather (rain) kept as toggleable (disabled by default)
 */
export const AnimatedBackground = memo(function AnimatedBackground({ wpm = 0, showCelestial = false }: { wpm?: number; showCelestial?: boolean }) {
  const { theme, weather } = useGameStore();
  const prefersReduced =
    typeof window !== "undefined" &&
    "matchMedia" in window &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const controls = useAnimationControls();
  const starCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const weatherCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const windRef = useRef<{ vx: number; vy: number }>({ vx: 0, vy: 0 });
  const cursorRef = useRef<{ x: number; y: number; active: boolean }>({ x: -9999, y: -9999, active: false });
  const particlesRef = useRef<{ x: number; y: number; v: number; a?: number; s?: number }[]>([]);
  const weatherOn = weather !== 'none';

  // Day cycle for light/sunset variants
  useEffect(() => {
    if (prefersReduced) return;
    if (theme === "light" || theme === "sunset") {
      controls.start(
        { "--sky-hue": [210, 220, 230, 210], "--sky-light": [70, 50, 40, 70] } as any,
        { repeat: Infinity, duration: 60, ease: "linear" } as any
      );
    }
  }, [controls, theme, prefersReduced]);

  // Starfield for dark theme
  useEffect(() => {
    if (theme !== "dark") return;
    const canvas = starCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    const DPR = Math.min(2, window.devicePixelRatio || 1);
    const resize = () => {
      const { clientWidth, clientHeight } = canvas;
      canvas.width = clientWidth * DPR;
      canvas.height = clientHeight * DPR;
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      const count = 120;
      particlesRef.current = Array.from({ length: count }, () => ({
        x: Math.random() * clientWidth,
        y: Math.random() * clientHeight * 0.7,
        v: 0.2 + Math.random() * 0.4,
        a: Math.random(),
      }));
    };
    resize();
    window.addEventListener("resize", resize);

    const loop = () => {
      raf = requestAnimationFrame(loop);
      const { clientWidth, clientHeight } = canvas;
      ctx.clearRect(0, 0, clientWidth, clientHeight);
      // Faint night tint
      ctx.fillStyle = "rgba(0,0,0,0.2)";
      ctx.fillRect(0, 0, clientWidth, clientHeight);
      for (const s of particlesRef.current) {
        s.a = (s.a! + 0.02) % 1;
        const alpha = 0.3 + Math.abs(Math.sin(s.a! * Math.PI)) * 0.5;
        ctx.fillStyle = `rgba(255,255,255,${alpha})`;
        ctx.fillRect(s.x, s.y, 1.5, 1.5);
      }
    };
    if (!prefersReduced) raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, [theme, prefersReduced]);

  // Optional weather particles (rain/snow)
  useEffect(() => {
    if (!weatherOn) return;
    const canvas = weatherCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const DPR = Math.min(2, window.devicePixelRatio || 1);
    const resize = () => {
      canvas.width = canvas.clientWidth * DPR;
      canvas.height = canvas.clientHeight * DPR;
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

   const onMove = (e: MouseEvent) => {
     const rect = canvas.getBoundingClientRect();
     cursorRef.current.x = e.clientX - rect.left;
     cursorRef.current.y = e.clientY - rect.top;
     cursorRef.current.active = true;
   };
   window.addEventListener('mousemove', onMove);

    const count = weather === 'rain' ? 140 : weather === 'snow' ? 120 : 80;
    particlesRef.current = Array.from({ length: count }, () => ({
      x: Math.random() * canvas.clientWidth,
      y: Math.random() * canvas.clientHeight,
      v: weather === 'rain' ? 3 + Math.random() * 3 : weather === 'snow' ? 0.5 + Math.random() * 0.8 : 1 + Math.random() * 1.5,
      s: weather === 'rain' ? 2 + Math.random() * 2 : weather === 'snow' ? 1 : 2 + Math.random() * 2,
    }));

    let raf = 0;
    const loop = () => {
      raf = requestAnimationFrame(loop);
      const w = canvas.clientWidth, h = canvas.clientHeight;
      ctx.clearRect(0, 0, w, h);

      if (weather === 'rain') {
        ctx.strokeStyle = "rgba(255,255,255,0.3)";
        for (const p of particlesRef.current) {
          ctx.lineWidth = p.s || 2;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x + (p.s || 2), p.y + 8 + (p.s || 2) * 1.5);
          ctx.stroke();
          p.y += p.v;
          p.x += 0.2;
          // avoid cursor
          if (cursorRef.current.active) {
            const dx = p.x - cursorRef.current.x;
            const dy = p.y - cursorRef.current.y;
            const dist = Math.hypot(dx, dy) || 1;
            const R = 110;
            if (dist < R) {
              const f = (1 - dist / R);
              const k = 3;
              const ax = (dx / dist) * f * k;
              const ay = (dy / dist) * f * k;
              p.x += ax; p.y += ay;
              const minD = 10;
              if (dist < minD) {
                const push = minD - dist;
                p.x += (dx / dist) * push;
                p.y += (dy / dist) * push;
              }
            }
          }
          if (p.y > h) { p.y = -10; p.x = Math.random() * w; }
        }
      } else if (weather === 'snow') {
        ctx.fillStyle = "rgba(255,255,255,0.8)";
        for (const p of particlesRef.current) {
          ctx.beginPath();
          ctx.arc(p.x, p.y, 1.2, 0, Math.PI * 2);
          ctx.fill();
          p.y += p.v;
          p.x += Math.sin(p.y * 0.02) * 0.3;
          // avoid cursor (subtle for snow)
          if (cursorRef.current.active) {
            const dx = p.x - cursorRef.current.x;
            const dy = p.y - cursorRef.current.y;
            const dist = Math.hypot(dx, dy) || 1;
            const R = 90;
            if (dist < R) {
              const f = (1 - dist / R);
              const k = 1;
              const ax = (dx / dist) * f * k;
              const ay = (dy / dist) * f * k;
              p.x += ax; p.y += ay;
              const minD = 8;
              if (dist < minD) {
                const push = minD - dist;
                p.x += (dx / dist) * push;
                p.y += (dy / dist) * push;
              }
            }
          }
          if (p.y > h) { p.y = -5; p.x = Math.random() * w; }
        }
      } else if (weather === 'leaf') {
        ctx.fillStyle = "rgba(34,197,94,0.9)"; // green leaves
        for (const p of particlesRef.current) {
          const size = (p.s || 2) * 1.4;
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate((p.y + p.x) * 0.01);
          ctx.fillRect(-size/2, -size/4, size, size/2);
          ctx.restore();
          p.y += p.v;
          p.x += Math.sin(p.y * 0.03) * 0.6;
          // avoid cursor
          if (cursorRef.current.active) {
            const dx = p.x - cursorRef.current.x;
            const dy = p.y - cursorRef.current.y;
            const dist = Math.hypot(dx, dy) || 1;
            const R = 120;
            if (dist < R) {
              const f = (1 - dist / R);
              const k = 2.2;
              const ax = (dx / dist) * f * k;
              const ay = (dy / dist) * f * k;
              p.x += ax; p.y += ay;
              const minD = 12;
              if (dist < minD) {
                const push = minD - dist;
                p.x += (dx / dist) * push;
                p.y += (dy / dist) * push;
              }
            }
          }
          if (p.y > h) { p.y = -5; p.x = Math.random() * w; }
        }
      } else if (weather === 'flower') {
        ctx.fillStyle = "rgba(236,72,153,0.9)"; // pink petals
        for (const p of particlesRef.current) {
          const r = (p.s || 2) * 0.9;
          ctx.beginPath();
          ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
          ctx.fill();
          p.y += 0.8 + p.v * 0.3;
          p.x += Math.cos(p.y * 0.02) * 0.5;
          // avoid cursor
          if (cursorRef.current.active) {
            const dx = p.x - cursorRef.current.x;
            const dy = p.y - cursorRef.current.y;
            const dist = Math.hypot(dx, dy) || 1;
            const R = 120;
            if (dist < R) {
              const f = (1 - dist / R);
              const k = 1.8;
              const ax = (dx / dist) * f * k;
              const ay = (dy / dist) * f * k;
              p.x += ax; p.y += ay;
              const minD = 12;
              if (dist < minD) {
                const push = minD - dist;
                p.x += (dx / dist) * push;
                p.y += (dy / dist) * push;
              }
            }
          }
          if (p.y > h) { p.y = -5; p.x = Math.random() * w; }
        }
      }
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, [weatherOn, weather]);

  const cloudVariants = useMemo(
    () => ({
      animate: (speed: number) => ({
        x: ["0%", "-100%"],
        transition: { duration: speed, repeat: Infinity, ease: "linear" },
      }),
    }),
    []
  );

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
      {/* Base sky per theme */}
      {theme === "dark" && (
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_10%,rgba(0,0,0,0.2),transparent_60%),linear-gradient(to_bottom,hsl(220_30%_14%),hsl(220_36%_6%))]" />
      )}
      {theme === "light" && (
        <motion.div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to bottom, hsl(var(--sky-hue,210) 70% var(--sky-light,70%)), transparent 70%)",
          }}
          animate={controls}
        />
      )}
      {theme === "sunset" && (
        <motion.div
          className="absolute inset-0"
          style={{
            background: "linear-gradient(to bottom, hsl(20 90% 60%), hsl(280 15% 12%))",
          }}
          animate={!prefersReduced ? { opacity: [0.95, 1, 0.95] } : undefined}
          transition={{ repeat: Infinity, duration: 20, ease: "easeInOut" }}
        />
      )}
      {theme === "neon" && (
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_10%,rgba(124,58,237,0.25),transparent_50%),linear-gradient(to_bottom,#04070B,#0B0F14)]" />
      )}

      {/* Sun / Moon (only on pages that request it, and skip neon) */}
      {showCelestial && theme !== "neon" && (
        <>
          {theme === "dark" ? (
            <motion.div
              className="absolute left-[12%] w-16 h-16 rounded-full"
              style={{
                background:
                  "radial-gradient(circle, #FDFCDC 0%, #EDE9C9 60%, rgba(0,0,0,0) 70%)",
              }}
              animate={!prefersReduced ? { y: ["12%", "45%", "78%", "12%"] } : undefined}
              transition={{ repeat: Infinity, duration: 50, ease: "linear" }}
            />
          ) : (
            <motion.div
              className="absolute left-[10%] w-24 h-24 rounded-full blur-[1px]"
              style={{
                background:
                  "radial-gradient(circle, rgba(255,255,200,0.9), rgba(255,255,200,0.2) 60%, transparent 70%)",
              }}
              animate={!prefersReduced ? { y: ["10%", "50%", "90%", "10%"] } : undefined}
              transition={{ repeat: Infinity, duration: 40, ease: "linear" }}
            />
          )}
        </>
      )}

      {/* Clouds for light/sunset */}
      {(theme === "light" || theme === "sunset") && (
        <>
          <div className="absolute top-6 left-0 right-0 h-24 opacity-60">
            <motion.div
              className="absolute inset-y-0 w-[200%]"
              custom={60}
              variants={cloudVariants}
              animate={!prefersReduced ? "animate" : undefined}
            >
              <div className="w-full h-full bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22200%22 height=%2272%22 viewBox=%220 0 200 72%22><g fill=%22rgba(255,255,255,0.5)%22><ellipse cx=%2230%22 cy=%2236%22 rx=%2230%22 ry=%2212%22/><ellipse cx=%22100%22 cy=%2228%22 rx=%2238%22 ry=%2214%22/><ellipse cx=%22170%22 cy=%2236%22 rx=%2230%22 ry=%2212%22/></g></svg>')] bg-repeat-x" />
            </motion.div>
          </div>
          <div className="absolute top-16 left-0 right-0 h-24 opacity-35">
            <motion.div
              className="absolute inset-y-0 w-[200%]"
              custom={90}
              variants={cloudVariants}
              animate={!prefersReduced ? "animate" : undefined}
            >
              <div className="w-full h-full bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22240%22 height=%2264%22 viewBox=%220 0 240 64%22><g fill=%22rgba(255,255,255,0.35)%22><ellipse cx=%2240%22 cy=%2232%22 rx=%2240%22 ry=%2212%22/><ellipse cx=%22120%22 cy=%2226%22 rx=%2245%22 ry=%2214%22/><ellipse cx=%22200%22 cy=%2232%22 rx=%2236%22 ry=%2212%22/></g></svg>')] bg-repeat-x" />
            </motion.div>
          </div>
        </>
      )}

      {/* Neon grid for neon theme */}
      {theme === "neon" && (
        <>
          <div className="absolute bottom-0 left-0 right-0 h-1/2 [perspective:800px]">
            <div className="absolute inset-0 [transform:rotateX(60deg)] opacity-40">
              <div className="absolute inset-0 bg-[repeating-linear-gradient(transparent,transparent_18px,rgba(124,58,237,0.6)_20px),repeating-linear-gradient(90deg,transparent,transparent_18px,rgba(124,58,237,0.6)_20px)]" />
            </div>
          </div>
          {!prefersReduced && (
            <motion.div
              className="absolute inset-0"
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: Math.max(0.5, 2 - Math.min(wpm, 120)/120 * 1.5), repeat: Infinity, ease: "easeInOut" }}
              style={{ boxShadow: '0 0 120px 10px rgba(124,58,237,0.3) inset' }}
            />
          )}
        </>
      )}

      {/* Distant silhouettes for depth */}
      <div className="absolute bottom-12 left-0 right-0 h-16 opacity-30">
        {!prefersReduced ? (
          <motion.div
            className="absolute inset-y-0 w-[200%]"
            animate={{ x: ["0%", "-100%"] }}
            transition={{ duration: 50, repeat: Infinity, ease: "linear" }}
          >
            <div className="w-full h-full bg-[linear-gradient(to_top,rgba(0,0,0,0.2),transparent),repeating-linear-gradient(90deg,rgba(0,0,0,0.5)_0,rgba(0,0,0,0.5)_6px,transparent_6px,transparent_18px)]" />
          </motion.div>
        ) : (
          <div className="absolute inset-y-0 w-full bg-[linear-gradient(to_top,rgba(0,0,0,0.2),transparent),repeating-linear-gradient(90deg,rgba(0,0,0,0.5)_0,rgba(0,0,0,0.5)_6px,transparent_6px,transparent_18px)]" />
        )}
      </div>

      {/* Starfield canvas for dark */}
      {theme === "dark" && <canvas ref={starCanvasRef} className="absolute inset-0 w-full h-full" />}
      {weatherOn && <canvas ref={weatherCanvasRef} className="absolute inset-0 w-full h-full" />}
    </div>
  );
});
