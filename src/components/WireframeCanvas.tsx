'use client';

import { useEffect, useRef } from 'react';

type Vec3 = [number, number, number];

function rotateX(v: Vec3, a: number): Vec3 {
  const c = Math.cos(a), s = Math.sin(a);
  return [v[0], v[1] * c - v[2] * s, v[1] * s + v[2] * c];
}

function rotateY(v: Vec3, a: number): Vec3 {
  const c = Math.cos(a), s = Math.sin(a);
  return [v[0] * c + v[2] * s, v[1], -v[0] * s + v[2] * c];
}

function rotateZ(v: Vec3, a: number): Vec3 {
  const c = Math.cos(a), s = Math.sin(a);
  return [v[0] * c - v[1] * s, v[0] * s + v[1] * c, v[2]];
}

function project(v: Vec3, fov: number, cx: number, cy: number): [number, number] {
  const scale = fov / (v[2] + fov);
  return [v[0] * scale + cx, v[1] * scale + cy];
}

// Cube vertices (unit cube scaled)
function makeCube(size: number): Vec3[] {
  const h = size / 2;
  return [
    [-h, -h, -h], [h, -h, -h], [h, h, -h], [-h, h, -h],
    [-h, -h, h], [h, -h, h], [h, h, h], [-h, h, h],
  ];
}

const CUBE_EDGES: [number, number][] = [
  [0,1],[1,2],[2,3],[3,0],
  [4,5],[5,6],[6,7],[7,4],
  [0,4],[1,5],[2,6],[3,7],
];

// Icosahedron vertices
function makeIcosahedron(radius: number): Vec3[] {
  const t = (1 + Math.sqrt(5)) / 2;
  const n = Math.sqrt(1 + t * t);
  const a = 1 / n * radius;
  const b = t / n * radius;
  return [
    [-a, b, 0], [a, b, 0], [-a, -b, 0], [a, -b, 0],
    [0, -a, b], [0, a, b], [0, -a, -b], [0, a, -b],
    [b, 0, -a], [b, 0, a], [-b, 0, -a], [-b, 0, a],
  ];
}

const ICO_EDGES: [number, number][] = [
  [0,11],[0,5],[0,1],[0,7],[0,10],
  [1,5],[1,9],[1,8],[1,7],
  [2,4],[2,11],[2,10],[2,6],[2,3],
  [3,4],[3,9],[3,8],[3,6],
  [4,5],[4,9],[4,11],
  [5,9],[5,11],
  [6,7],[6,8],[6,10],
  [7,8],[7,10],
  [8,9],
  [10,11],
];

export default function WireframeCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let w = 0, h = 0;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = w + 'px';
      canvas.style.height = h + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();
    window.addEventListener('resize', resize);

    const onMouseMove = (e: MouseEvent) => {
      mouseRef.current.x = (e.clientX / w - 0.5) * 2;
      mouseRef.current.y = (e.clientY / h - 0.5) * 2;
    };
    window.addEventListener('mousemove', onMouseMove);

    const cubeVerts = makeCube(200);
    const icoVerts = makeIcosahedron(150);
    const FOV = 600;

    const drawEdge = (
      ctx: CanvasRenderingContext2D,
      v1: Vec3, v2: Vec3,
      rx: number, ry: number, rz: number,
      cx: number, cy: number,
      color: string, alpha: number, lineWidth: number
    ) => {
      let a = rotateX(v1, rx);
      a = rotateY(a, ry);
      a = rotateZ(a, rz);
      let b = rotateX(v2, rx);
      b = rotateY(b, ry);
      b = rotateZ(b, rz);

      const [ax, ay] = project(a, FOV, cx, cy);
      const [bx, by] = project(b, FOV, cx, cy);

      // Depth-based alpha modulation
      const avgZ = (a[2] + b[2]) / 2;
      const depthAlpha = Math.max(0.15, Math.min(1, (FOV + avgZ) / (FOV * 1.5)));

      ctx.globalAlpha = alpha * depthAlpha;
      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth;
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.lineTo(bx, by);
      ctx.stroke();
    };

    const render = (time: number) => {
      const t = time * 0.001;
      ctx.clearRect(0, 0, w, h);

      const cx = w / 2;
      const cy = h / 2;

      // Mouse parallax offsets
      const mx = mouseRef.current.x;
      const my = mouseRef.current.y;
      const parallaxX = mx * 15;
      const parallaxY = my * 15;

      // --- Dot grid ---
      // Batched into a single path + one fill() instead of a beginPath+arc+fill
      // per dot (500+ individual draw calls/frame at desktop widths, forever,
      // on every page mounting this component) — same pixels, far less
      // per-frame canvas overhead. This was the dominant cost in this
      // component; the wireframe edges below are comparatively cheap.
      ctx.globalAlpha = 0.03;
      ctx.fillStyle = '#ffffff';
      const spacing = 60;
      const gridOffsetX = (parallaxX * 0.3) % spacing;
      const gridOffsetY = (parallaxY * 0.3) % spacing;
      ctx.beginPath();
      for (let x = gridOffsetX; x < w; x += spacing) {
        for (let y = gridOffsetY; y < h; y += spacing) {
          ctx.moveTo(x + 1, y);
          ctx.arc(x, y, 1, 0, Math.PI * 2);
        }
      }
      ctx.fill();

      // Mouse-driven camera tilt
      const camTiltX = my * 0.12;
      const camTiltY = mx * 0.12;

      // --- Icosphere (dimmer, behind) ---
      const icoRx = t * 0.2 + camTiltX;
      const icoRy = t * 0.35 + camTiltY;
      const icoRz = t * 0.15;

      // Glow pass for icosphere
      ctx.shadowColor = '#D4A853';
      ctx.shadowBlur = 8;
      for (const [i, j] of ICO_EDGES) {
        drawEdge(ctx, icoVerts[i], icoVerts[j], icoRx, icoRy, icoRz,
          cx + parallaxX * 0.6, cy + parallaxY * 0.6, '#D4A853', 0.12, 2);
      }
      ctx.shadowBlur = 0;

      // Sharp pass for icosphere
      for (const [i, j] of ICO_EDGES) {
        drawEdge(ctx, icoVerts[i], icoVerts[j], icoRx, icoRy, icoRz,
          cx + parallaxX * 0.6, cy + parallaxY * 0.6, '#D4A853', 0.2, 0.8);
      }

      // Draw icosphere vertices
      for (let vi = 0; vi < icoVerts.length; vi++) {
        let v = rotateX(icoVerts[vi], icoRx);
        v = rotateY(v, icoRy);
        v = rotateZ(v, icoRz);
        const [px, py] = project(v, FOV, cx + parallaxX * 0.6, cy + parallaxY * 0.6);
        const depthAlpha = Math.max(0.15, Math.min(1, (FOV + v[2]) / (FOV * 1.5)));
        ctx.globalAlpha = 0.25 * depthAlpha;
        ctx.fillStyle = '#D4A853';
        ctx.beginPath();
        ctx.arc(px, py, 1.5, 0, Math.PI * 2);
        ctx.fill();
      }

      // --- Cube (brighter, in front) ---
      const cubeRx = t * 0.4 + camTiltX;
      const cubeRy = t * 0.55 + camTiltY;
      const cubeRz = t * 0.1;

      // Glow pass for cube
      ctx.shadowColor = '#D4A853';
      ctx.shadowBlur = 12;
      for (const [i, j] of CUBE_EDGES) {
        drawEdge(ctx, cubeVerts[i], cubeVerts[j], cubeRx, cubeRy, cubeRz,
          cx + parallaxX, cy + parallaxY, '#D4A853', 0.25, 2.5);
      }
      ctx.shadowBlur = 0;

      // Sharp pass for cube
      for (const [i, j] of CUBE_EDGES) {
        drawEdge(ctx, cubeVerts[i], cubeVerts[j], cubeRx, cubeRy, cubeRz,
          cx + parallaxX, cy + parallaxY, '#D4A853', 0.45, 1);
      }

      // Draw cube vertices as bright dots
      for (let vi = 0; vi < cubeVerts.length; vi++) {
        let v = rotateX(cubeVerts[vi], cubeRx);
        v = rotateY(v, cubeRy);
        v = rotateZ(v, cubeRz);
        const [px, py] = project(v, FOV, cx + parallaxX, cy + parallaxY);
        const depthAlpha = Math.max(0.15, Math.min(1, (FOV + v[2]) / (FOV * 1.5)));

        // Glow
        ctx.globalAlpha = 0.3 * depthAlpha;
        ctx.shadowColor = '#D4A853';
        ctx.shadowBlur = 10;
        ctx.fillStyle = '#D4A853';
        ctx.beginPath();
        ctx.arc(px, py, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Sharp core
        ctx.globalAlpha = 0.7 * depthAlpha;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(px, py, 1.2, 0, Math.PI * 2);
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
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 0,
        pointerEvents: 'none',
        background: '#0A0908',
      }}
    />
  );
}
