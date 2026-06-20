'use client';

import { useEffect, useRef } from 'react';

interface OscilloscopeProps {
  width?: number;
  height?: number;
  color?: string;
}

export default function Oscilloscope({
  width = 600,
  height = 200,
  color = '#D4A853',
}: OscilloscopeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    let animId: number;

    // Buffer to store waveform values
    const buffer = new Float32Array(width);
    buffer.fill(0);

    // ECG-like waveform generator
    // Produces a repeating pattern: flat -> small P wave -> flat -> sharp QRS complex -> flat -> small T wave -> flat
    const ecgWave = (phase: number): number => {
      // Normalize phase to 0..1
      const p = ((phase % 1) + 1) % 1;

      // P wave (small bump): 0.10 - 0.18
      if (p > 0.10 && p < 0.18) {
        const t = (p - 0.10) / 0.08;
        return Math.sin(t * Math.PI) * 0.12;
      }

      // Q dip: 0.24 - 0.27
      if (p > 0.24 && p < 0.27) {
        const t = (p - 0.24) / 0.03;
        return -Math.sin(t * Math.PI) * 0.15;
      }

      // R peak (sharp spike): 0.27 - 0.32
      if (p > 0.27 && p < 0.32) {
        const t = (p - 0.27) / 0.05;
        return Math.sin(t * Math.PI) * 0.85;
      }

      // S dip: 0.32 - 0.36
      if (p > 0.32 && p < 0.36) {
        const t = (p - 0.32) / 0.04;
        return -Math.sin(t * Math.PI) * 0.2;
      }

      // T wave (rounded bump): 0.45 - 0.58
      if (p > 0.45 && p < 0.58) {
        const t = (p - 0.45) / 0.13;
        return Math.sin(t * Math.PI) * 0.18;
      }

      // Flat baseline with micro-noise
      return (Math.random() - 0.5) * 0.008;
    };

    // Scan speed in pixels per frame
    const scanSpeed = 2.5;
    let scanPos = 0;
    let wavePhase = 0;
    const cycleLength = 180; // pixels per ECG cycle

    const render = () => {
      const cy = height / 2;

      // Advance scan position
      for (let i = 0; i < scanSpeed; i++) {
        const idx = Math.floor(scanPos) % width;
        wavePhase += 1 / cycleLength;
        buffer[idx] = ecgWave(wavePhase);
        scanPos = (scanPos + 1) % width;
      }

      // Clear canvas
      ctx.fillStyle = 'rgba(10, 9, 8, 1)';
      ctx.fillRect(0, 0, width, height);

      // --- Grid lines ---
      ctx.globalAlpha = 0.06;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 0.5;

      // Horizontal grid
      const hLines = 8;
      for (let i = 0; i <= hLines; i++) {
        const y = (height / hLines) * i;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // Vertical grid
      const vLines = 12;
      for (let i = 0; i <= vLines; i++) {
        const x = (width / vLines) * i;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }

      // Center line slightly brighter
      ctx.globalAlpha = 0.1;
      ctx.beginPath();
      ctx.moveTo(0, cy);
      ctx.lineTo(width, cy);
      ctx.stroke();

      ctx.globalAlpha = 1;

      const currentScan = Math.floor(scanPos) % width;
      const amplitude = height * 0.38;

      // --- Glow pass (thick, blurred) ---
      ctx.save();
      ctx.shadowColor = color;
      ctx.shadowBlur = 15;
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.globalAlpha = 0.35;
      ctx.beginPath();

      let started = false;
      for (let x = 0; x < width; x++) {
        // Calculate distance behind scan line (wrapping)
        const dist = ((currentScan - x) + width) % width;

        // Fade region: the area just ahead of the scan line is blank
        // The trail fades as we approach from behind
        let trailAlpha: number;
        if (dist < 8) {
          // Very close behind scan — full brightness
          trailAlpha = 1;
        } else if (dist < 80) {
          trailAlpha = 1 - (dist - 8) / 72;
        } else {
          trailAlpha = 0;
        }

        if (trailAlpha <= 0.01) continue;

        const val = buffer[x];
        const py = cy - val * amplitude;

        if (!started) {
          ctx.moveTo(x, py);
          started = true;
        } else {
          ctx.lineTo(x, py);
        }
      }
      ctx.stroke();
      ctx.restore();

      // --- Sharp pass (thin, crisp) ---
      // Draw per-segment with individual alpha for fade
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      for (let x = 1; x < width; x++) {
        const dist = ((currentScan - x) + width) % width;

        let trailAlpha: number;
        if (dist < 8) {
          trailAlpha = 1;
        } else if (dist < 120) {
          trailAlpha = 1 - (dist - 8) / 112;
        } else {
          trailAlpha = 0;
        }

        if (trailAlpha <= 0.01) continue;

        const val = buffer[x];
        const prevVal = buffer[x - 1];
        const py = cy - val * amplitude;
        const prevPy = cy - prevVal * amplitude;

        ctx.globalAlpha = trailAlpha * 0.9;
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(x - 1, prevPy);
        ctx.lineTo(x, py);
        ctx.stroke();
      }

      // --- Scan line ---
      const grad = ctx.createLinearGradient(currentScan - 20, 0, currentScan + 3, 0);
      grad.addColorStop(0, 'rgba(212, 168, 83, 0)');
      grad.addColorStop(0.7, 'rgba(212, 168, 83, 0.15)');
      grad.addColorStop(1, 'rgba(212, 168, 83, 0.5)');

      ctx.globalAlpha = 1;
      ctx.fillStyle = grad;
      ctx.fillRect(currentScan - 20, 0, 23, height);

      // Bright scan line edge
      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      ctx.globalAlpha = 0.6;
      ctx.beginPath();
      ctx.moveTo(currentScan, 0);
      ctx.lineTo(currentScan, height);
      ctx.stroke();

      // Scan dot
      const scanVal = buffer[Math.max(0, currentScan - 1)];
      const scanY = cy - scanVal * amplitude;
      ctx.globalAlpha = 0.9;
      ctx.shadowColor = color;
      ctx.shadowBlur = 20;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(currentScan, scanY, 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      ctx.globalAlpha = 1;
      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [width, height, color]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        display: 'block',
        borderRadius: 4,
        border: '1px solid rgba(212, 168, 83, 0.1)',
      }}
    />
  );
}
