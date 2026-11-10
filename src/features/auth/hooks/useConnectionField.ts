import { useEffect } from "react";
import type { RefObject } from "react";

export function useConnectionField(canvasRef: RefObject<HTMLCanvasElement | null>) {
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduce = matchMedia("(prefers-reduced-motion: reduce)");
    let w = 0, h = 0, dpr = 1, frame = 0, previous = 0, time = 0, focused = false;
    const pointer = { x: -2000, y: -2000 };
    const follow = { x: 0, y: 0 };
    const particles = Array.from({ length: 80 }, (_, i) => ({
      u: (i * 0.61803398875) % 1,
      v: (i * 0.381966 + 0.13) % 1,
      r: 0.5 + (i % 5) * 0.24,
      phase: i * 1.7,
    }));

    function resize() {
      w = innerWidth;
      h = innerHeight;
      dpr = Math.min(devicePixelRatio || 1, 1.5);
      canvas!.width = Math.round(w * dpr);
      canvas!.height = Math.round(h * dpr);
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      draw();
    }

    function point(u: number, v: number, t: number) {
      const R = 1.3, r = 0.30 + 0.035 * Math.sin(u * 5 + t);
      let x = (R + r * Math.cos(v)) * Math.cos(u);
      let y = (R + r * Math.cos(v)) * Math.sin(u);
      let z = r * Math.sin(v);
      const tilt = 0.49 + Math.sin(t * 0.11) * 0.11;
      let yy = y * Math.cos(tilt) - z * Math.sin(tilt);
      const zz = y * Math.sin(tilt) + z * Math.cos(tilt);
      const spin = 0.19 + Math.sin(t * 0.08) * 0.13;
      const xx = x * Math.cos(spin) - yy * Math.sin(spin);
      yy = x * Math.sin(spin) + yy * Math.cos(spin);
      const perspective = 3.8 / (3.8 + zz);
      const size = Math.min(w * 0.48, h * 0.57);
      return {
        x: w * 0.5 + xx * size * perspective + follow.x,
        y: h * 0.47 + yy * size * 0.9 * perspective + follow.y,
        z: zz,
        alpha: 0.12 + (zz + 1.6) / 3.2 * 0.28,
      };
    }

    function draw() {
      const c = ctx!;
      c.clearRect(0, 0, w, h);
      const t = time;
      follow.x += ((pointer.x > -1000 ? (pointer.x / w - 0.5) * 10 : 0) - follow.x) * 0.025;
      follow.y += ((pointer.y > -1000 ? (pointer.y / h - 0.5) * 8 : 0) - follow.y) * 0.025;

      const glow = c.createRadialGradient(w * 0.5, h * 0.47, 10, w * 0.5, h * 0.47, Math.min(w * 0.6, h * 0.65));
      glow.addColorStop(0, "rgba(70,113,72,.02)");
      glow.addColorStop(0.65, "rgba(114,143,81,.035)");
      glow.addColorStop(1, "rgba(10,28,22,0)");
      c.fillStyle = glow;
      c.fillRect(0, 0, w, h);

      const lanes = w < 650 ? 18 : 30;
      const segments = w < 650 ? 100 : 150;
      c.lineWidth = 0.55;
      for (let lane = 0; lane < lanes; lane++) {
        const v = (lane / lanes) * Math.PI * 2 + t * 0.055;
        c.beginPath();
        for (let k = 0; k <= segments; k++) {
          const u = (k / segments) * Math.PI * 2;
          const p = point(u, v + 0.16 * Math.sin(u * 3 + t * 0.18), t);
          if (k === 0) c.moveTo(p.x, p.y); else c.lineTo(p.x, p.y);
        }
        c.strokeStyle = lane % 6 === 0 ? "rgba(199,172,118,.35)" : "rgba(148,194,136,.22)";
        c.stroke();
      }

      for (let rib = 0; rib < 78; rib++) {
        const u = (rib / 78) * Math.PI * 2 + t * 0.025;
        c.beginPath();
        for (let j = 0; j <= 18; j++) {
          const p = point(u, (j / 18) * Math.PI * 2 + t * 0.055, t);
          if (j === 0) c.moveTo(p.x, p.y); else c.lineTo(p.x, p.y);
        }
        c.strokeStyle = "rgba(165,197,138,.075)";
        c.stroke();
      }

      for (let i = 0; i < 245; i++) {
        const u = ((i * 0.61803398875) % 1) * Math.PI * 2 + t * 0.08;
        const v = ((i * 0.41421356) % 1) * Math.PI * 2 + t * 0.055;
        const p = point(u, v, t);
        const d = Math.hypot(p.x - pointer.x, p.y - pointer.y);
        const near = Math.max(0, 1 - d / 160);
        const pulse = 0.5 + 0.5 * Math.sin(t * (0.8 + (i % 4) * 0.13) + i * 2);
        const sz = (i % 17 === 0 ? 2 : i % 5 === 0 ? 1.3 : 0.65) * (1 + near * 0.7);
        c.beginPath();
        c.arc(p.x, p.y, sz, 0, Math.PI * 2);
        c.fillStyle = i % 9 === 0
          ? `rgba(228,205,149,${0.3 + pulse * 0.4 + near * 0.2})`
          : `rgba(193,225,174,${p.alpha + pulse * 0.2 + near * 0.25})`;
        c.fill();
        if (i % 17 === 0 || near > 0.45) {
          const halo = c.createRadialGradient(p.x, p.y, 0, p.x, p.y, sz * 7);
          halo.addColorStop(0, `rgba(215,224,171,${0.12 + near * 0.13})`);
          halo.addColorStop(1, "rgba(215,224,171,0)");
          c.fillStyle = halo;
          c.fillRect(p.x - sz * 7, p.y - sz * 7, sz * 14, sz * 14);
        }
      }

      for (let spark = 0; spark < 7; spark++) {
        const u = t * (focused ? 0.17 : 0.10) + spark * 0.9;
        const v = spark * 1.8 + t * 0.055;
        for (let trail = 0; trail < 18; trail++) {
          const p = point(u - trail * 0.007, v, t);
          const alpha = (1 - trail / 18) * 0.65;
          c.beginPath();
          c.arc(p.x, p.y, trail === 0 ? 1.8 : 1, 0, Math.PI * 2);
          c.fillStyle = `rgba(244,226,174,${alpha})`;
          c.fill();
        }
      }

      for (let body = 0; body < 12; body++) {
        const velocity = 0.17 + (body % 4) * 0.035;
        const u = t * velocity + body * 2.399963;
        const v = body * 0.72 + t * 0.055;
        const p = point(u, v, t);
        const radius = 1.8 + (body % 3) * 0.65;
        const depth = 0.65 + (p.z + 1.6) / 6.4;
        for (let tail = 20; tail > 0; tail--) {
          const q = point(u - tail * 0.009, v, t);
          c.beginPath();
          c.arc(q.x, q.y, radius * 0.45, 0, Math.PI * 2);
          c.fillStyle = `rgba(229,225,191,${(1 - tail / 21) * 0.20 * depth})`;
          c.fill();
        }
        const halo = c.createRadialGradient(p.x, p.y, 0, p.x, p.y, radius * 9);
        halo.addColorStop(0, `rgba(247,239,202,${0.25 * depth})`);
        halo.addColorStop(0.28, `rgba(224,231,191,${0.08 * depth})`);
        halo.addColorStop(1, "rgba(224,231,191,0)");
        c.fillStyle = halo;
        c.fillRect(p.x - radius * 9, p.y - radius * 9, radius * 18, radius * 18);
        c.beginPath();
        c.arc(p.x, p.y, radius * depth, 0, Math.PI * 2);
        c.fillStyle = body % 3 === 0 ? "#eee0b4" : "#f0f4df";
        c.fill();
      }

      for (let i = 0; i < particles.length; i++) {
        const a = particles[i];
        const x = a.u * w + Math.sin(t * 0.08 + a.phase) * 12;
        const y = ((a.v * h - t * (1 + (i % 3) * 0.2)) % h + h) % h;
        const flicker = 0.18 + 0.17 * (0.5 + 0.5 * Math.sin(t * 0.8 + a.phase));
        c.fillStyle = `rgba(217,227,190,${flicker})`;
        c.beginPath();
        c.arc(x, y, a.r, 0, Math.PI * 2);
        c.fill();
      }

      c.strokeStyle = "rgba(178,197,150,.13)";
      c.lineWidth = 0.6;
      for (const x of [24, w - 24]) {
        for (const y of [h * 0.25, h * 0.5, h * 0.75]) {
          c.beginPath();
          c.moveTo(x - 3, y); c.lineTo(x + 3, y);
          c.moveTo(x, y - 3); c.lineTo(x, y + 3);
          c.stroke();
        }
      }
    }

    function tick(now: number) {
      if (document.hidden) { frame = 0; return; }
      if (now - previous > 32) {
        time += Math.min((now - previous) / 1000, 0.1) * (reduce.matches ? 0.2 : 1.5);
        previous = now;
        draw();
      }
      frame = requestAnimationFrame(tick);
    }

    function start() {
      cancelAnimationFrame(frame);
      previous = performance.now();
      draw();
      frame = requestAnimationFrame(tick);
    }

    const onResize = () => resize();
    const onPointerMove = (e: PointerEvent) => { pointer.x = e.clientX; pointer.y = e.clientY; };
    const onPointerLeave = () => { pointer.x = -2000; pointer.y = -2000; };
    const onFocus = () => { focused = true; };
    const onBlur = () => { focused = false; };
    const onVisChange = () => { if (document.hidden) cancelAnimationFrame(frame); else start(); };
    const onReduceChange = () => start();

    window.addEventListener("resize", onResize, { passive: true });
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    document.addEventListener("pointerleave", onPointerLeave);
    document.addEventListener("visibilitychange", onVisChange);
    reduce.addEventListener("change", onReduceChange);

    const inputs = document.querySelectorAll(".login-page input");
    inputs.forEach((input) => {
      input.addEventListener("focus", onFocus);
      input.addEventListener("blur", onBlur);
    });

    resize();
    start();

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("pointerleave", onPointerLeave);
      document.removeEventListener("visibilitychange", onVisChange);
      reduce.removeEventListener("change", onReduceChange);
      inputs.forEach((input) => {
        input.removeEventListener("focus", onFocus);
        input.removeEventListener("blur", onBlur);
      });
    };
  }, [canvasRef]);
}
