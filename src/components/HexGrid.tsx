'use client';

import { useEffect, useRef } from 'react';

export default function HexGrid() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: -9999, y: -9999, normX: 0, normY: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let w = 0, h = 0;

    const HEX_RADIUS = 30;
    const SPOTLIGHT_RADIUS = 150;

    // Hexagon geometry
    const hexHeight = HEX_RADIUS * 2;
    const hexWidth = Math.sqrt(3) * HEX_RADIUS;
    const vertDist = hexHeight * 0.75;

    // Precompute hex corner offsets
    const hexCorners: [number, number][] = [];
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i - Math.PI / 6;
      hexCorners.push([
        Math.cos(angle) * HEX_RADIUS,
        Math.sin(angle) * HEX_RADIUS,
      ]);
    }

    // Resizing a canvas's width/height always clears its pixel buffer per
    // spec — the idle-skip below would otherwise leave it blank after a
    // resize (viewport rotation, devtools toggle) until the mouse next
    // moves. This forces exactly one repaint after each resize.
    let forceRedraw = true;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = w + 'px';
      canvas.style.height = h + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      forceRedraw = true;
    };

    resize();
    window.addEventListener('resize', resize);

    const onMouseMove = (e: MouseEvent) => {
      mouseRef.current.x = e.clientX;
      mouseRef.current.y = e.clientY;
      mouseRef.current.normX = (e.clientX / w - 0.5) * 2;
      mouseRef.current.normY = (e.clientY / h - 0.5) * 2;
    };
    window.addEventListener('mousemove', onMouseMove);

    const onMouseLeave = () => {
      mouseRef.current.x = -9999;
      mouseRef.current.y = -9999;
    };
    window.addEventListener('mouseleave', onMouseLeave);

    const drawHex = (cx: number, cy: number, alpha: number) => {
      if (alpha < 0.005) return;
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.moveTo(cx + hexCorners[0][0], cy + hexCorners[0][1]);
      for (let i = 1; i < 6; i++) {
        ctx.lineTo(cx + hexCorners[i][0], cy + hexCorners[i][1]);
      }
      ctx.closePath();
      ctx.stroke();
    };

    // Smooth mouse position for parallax
    let smoothMx = 0, smoothMy = 0;
    let lastMx = -99999, lastMy = -99999;

    const render = () => {
      const mx = mouseRef.current.x;
      const my = mouseRef.current.y;
      const normX = mouseRef.current.normX;
      const normY = mouseRef.current.normY;

      // Smooth parallax
      smoothMx += (normX - smoothMx) * 0.08;
      smoothMy += (normY - smoothMy) * 0.08;

      // Scrolling alone never moves the mouse — mx/my only change on an
      // actual mousemove event. Once the parallax ease settles (~1s after
      // mount or after the mouse stops), every subsequent frame was an
      // exact repaint of the previous one: full clear + ~hundreds of hex
      // strokes + a fresh radial-gradient allocation, 60x/sec, forever,
      // competing with the main thread for scroll-compositing budget the
      // whole time the page sat open. That's what read as scroll stutter
      // on this page — it's just far more noticeable on a page tall
      // enough to scroll through for several seconds, unlike the shorter
      // pages this component already shipped on. Skip the repaint
      // entirely when nothing will actually look different.
      const parallaxConverged = Math.abs(normX - smoothMx) < 0.0008 && Math.abs(normY - smoothMy) < 0.0008;
      const mouseUnchanged = mx === lastMx && my === lastMy;
      if (mouseUnchanged && parallaxConverged && !forceRedraw) {
        animId = requestAnimationFrame(render);
        return;
      }
      lastMx = mx;
      lastMy = my;
      forceRedraw = false;

      ctx.clearRect(0, 0, w, h);

      // Parallax offset (opposite direction)
      const parallaxX = -smoothMx * 12;
      const parallaxY = -smoothMy * 12;

      ctx.strokeStyle = '#D4A853';
      ctx.lineWidth = 0.6;

      // Calculate grid bounds with margin
      const margin = HEX_RADIUS * 2;
      const cols = Math.ceil((w + margin * 2) / hexWidth) + 2;
      const rows = Math.ceil((h + margin * 2) / vertDist) + 2;

      const startX = -margin + parallaxX;
      const startY = -margin + parallaxY;

      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const isOddRow = row % 2 === 1;
          const cx = startX + col * hexWidth + (isOddRow ? hexWidth / 2 : 0);
          const cy = startY + row * vertDist;

          // Calculate distance to mouse
          const dx = cx - mx;
          const dy = cy - my;
          const dist = Math.sqrt(dx * dx + dy * dy);

          // Base alpha is very dim
          let alpha = 0.04;

          if (dist < SPOTLIGHT_RADIUS) {
            // Smooth falloff: cosine-based for a nice spotlight feel
            const t = dist / SPOTLIGHT_RADIUS;
            const spotlight = Math.cos(t * Math.PI * 0.5);
            // Ramp from base to 0.15
            alpha = 0.04 + spotlight * 0.11;

            // Inner ring gets even brighter
            if (dist < SPOTLIGHT_RADIUS * 0.3) {
              const innerT = dist / (SPOTLIGHT_RADIUS * 0.3);
              alpha += (1 - innerT) * 0.08;
            }
          }

          drawHex(cx, cy, alpha);
        }
      }

      // Draw a very subtle radial glow at cursor position
      if (mx > -1000) {
        const glowGrad = ctx.createRadialGradient(mx, my, 0, mx, my, SPOTLIGHT_RADIUS * 0.7);
        glowGrad.addColorStop(0, 'rgba(212, 168, 83, 0.03)');
        glowGrad.addColorStop(1, 'rgba(212, 168, 83, 0)');
        ctx.globalAlpha = 1;
        ctx.fillStyle = glowGrad;
        ctx.beginPath();
        ctx.arc(mx, my, SPOTLIGHT_RADIUS * 0.7, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.globalAlpha = 1;
      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseleave', onMouseLeave);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 0,
        pointerEvents: 'none',
      }}
    />
  );
}
