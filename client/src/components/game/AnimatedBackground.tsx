import { memo, useEffect, useMemo, useRef } from "react";
import { motion, useAnimationControls } from "framer-motion";

/**
 * AnimatedBackground
 * - Day/Night cycle (subtle hue + sun/moon position)
 * - Parallax clouds
 * - Distant buildings/trees layers
 * - Optional weather particles drawn on Canvas (light rain)
 */
export const AnimatedBackground = memo(function AnimatedBackground() {
  const controls = useAnimationControls();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const particlesRef = useRef<{ x: number; y: number; v: number }[]>([]);
  const weatherOn = false; // toggle if needed later

  useEffect(() => {
    // Loop the day/night cycle
    controls.start(
      { '--sky-hue': [210, 220, 230, 210], '--sky-light': [70, 40, 20, 70] } as any,
      { repeat: Infinity, duration: 40, ease: 'linear' } as any
    );
  }, [controls]);

  // Init simple rain particles if enabled
  useEffect(() => {
    if (!weatherOn) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const DPR = Math.min(2, window.devicePixelRatio || 1);
    const resize = () => {
      canvas.width = canvas.clientWidth * DPR;
      canvas.height = canvas.clientHeight * DPR;
      ctx.scale(DPR, DPR);
    };
    resize();
    window.addEventListener('resize', resize);

    const count = 120;
    particlesRef.current = Array.from({ length: count }, () => ({
      x: Math.random() * canvas.clientWidth,
      y: Math.random() * canvas.clientHeight,
      v: 2 + Math.random() * 2,
    }));

    let raf = 0;
    const loop = () => {
      raf = requestAnimationFrame(loop);
      ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);
      ctx.strokeStyle = 'rgba(255,255,255,0.25)';
      ctx.lineWidth = 1;
      particlesRef.current.forEach(p => {
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x + 1, p.y + 8);
        ctx.stroke();
        p.y += p.v;
        p.x += 0.2;
        if (p.y > canvas.clientHeight) {
          p.y = -10; p.x = Math.random() * canvas.clientWidth;
        }
      });
    };
    raf = requestAnimationFrame(loop);

    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); };
  }, [weatherOn]);

  const cloudVariants = useMemo(() => ({
    animate: (speed: number) => ({ x: ["0%", "-100%"], transition: { duration: speed, repeat: Infinity, ease: 'linear' } }),
  }), []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
      {/* Sky gradient controlled by CSS vars */}
      <motion.div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(to bottom, hsl(var(--sky-hue,210) 70% var(--sky-light,70%)), transparent 80%)',
        }}
        animate={controls}
      />

      {/* Sun/Moon */}
      <motion.div
        className="absolute left-[10%] w-24 h-24 rounded-full blur-sm"
        style={{ background: 'radial-gradient(circle, rgba(255,255,200,0.9), rgba(255,255,200,0.2) 60%, transparent 70%)' }}
        animate={{ y: ["10%", "50%", "90%", "10%"] }}
        transition={{ repeat: Infinity, duration: 40, ease: 'linear' }}
      />

      {/* Cloud layers */}
      <div className="absolute top-6 left-0 right-0 h-24 opacity-60">
        <motion.div className="absolute inset-y-0 w-[200%]" custom={60} variants={cloudVariants} animate="animate">
          <div className="w-full h-full bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22200%22 height=%2272%22 viewBox=%220 0 200 72%22><g fill=%22rgba(255,255,255,0.5)%22><ellipse cx=%2230%22 cy=%2236%22 rx=%2230%22 ry=%2212%22/><ellipse cx=%22100%22 cy=%2228%22 rx=%2238%22 ry=%2214%22/><ellipse cx=%22170%22 cy=%2236%22 rx=%2230%22 ry=%2212%22/></g></svg>')] bg-repeat-x" />
        </motion.div>
      </div>
      <div className="absolute top-16 left-0 right-0 h-24 opacity-35">
        <motion.div className="absolute inset-y-0 w-[200%]" custom={90} variants={cloudVariants} animate="animate">
          <div className="w-full h-full bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22240%22 height=%2264%22 viewBox=%220 0 240 64%22><g fill=%22rgba(255,255,255,0.35)%22><ellipse cx=%2240%22 cy=%2232%22 rx=%2240%22 ry=%2212%22/><ellipse cx=%22120%22 cy=%2226%22 rx=%2245%22 ry=%2214%22/><ellipse cx=%22200%22 cy=%2232%22 rx=%2236%22 ry=%2212%22/></g></svg>')] bg-repeat-x" />
        </motion.div>
      </div>

      {/* Distant buildings/trees silhouettes for parallax */}
      <div className="absolute bottom-12 left-0 right-0 h-16 opacity-30">
        <motion.div className="absolute inset-y-0 w-[200%]" animate={{ x: ["0%", "-100%"], transition: { duration: 50, repeat: Infinity, ease: 'linear' } }}>
          <div className="w-full h-full bg-[linear-gradient(to_top,rgba(0,0,0,0.2),transparent),repeating-linear-gradient(90deg,rgba(0,0,0,0.5)_0,rgba(0,0,0,0.5)_6px,transparent_6px,transparent_18px)]" />
        </motion.div>
      </div>

      {weatherOn && (
        <canvas ref={canvasRef} className="absolute inset-0" />
      )}
    </div>
  );
});
