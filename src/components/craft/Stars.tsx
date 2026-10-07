import { useEffect, useRef } from "react";

export function Stars() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    let raf = 0;
    let w = 0;
    let h = 0;
    const stars = Array.from({ length: 140 }, () => ({
      x: Math.random(),
      y: Math.random(),
      s: Math.random() * 1.6 + 0.3,
      p: Math.random() * Math.PI * 2,
      v: Math.random() * 0.0018 + 0.0006,
    }));
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = c.clientWidth;
      h = c.clientHeight;
      c.width = Math.floor(w * dpr);
      c.height = Math.floor(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const onResize = () => resize();
    window.addEventListener("resize", onResize);
    const draw = (t: number) => {
      ctx.fillStyle = "#07080c";
      ctx.fillRect(0, 0, w, h);
      for (const s of stars) {
        const a = 0.45 + 0.55 * Math.sin(t * s.v * 6 + s.p);
        ctx.globalAlpha = 0.12 + a * 0.75;
        ctx.fillStyle = "#f4f5f8";
        ctx.strokeStyle = "#f4f5f8";
        const x = s.x * w;
        const y = s.y * h;
        const r = s.s * (0.55 + a * 0.55);
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
        if (s.s > 1.45) {
          ctx.lineWidth = 0.55;
          ctx.beginPath();
          ctx.moveTo(x - r * 2.8 * a, y);
          ctx.lineTo(x + r * 2.8 * a, y);
          ctx.moveTo(x, y - r * 2.8 * a);
          ctx.lineTo(x, y + r * 2.8 * a);
          ctx.stroke();
        }
      }
      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return <canvas ref={ref} className="pointer-events-none absolute inset-0 h-full w-full" />;
}
