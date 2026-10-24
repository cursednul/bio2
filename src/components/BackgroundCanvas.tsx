import React, { useEffect, useRef } from 'react';
import { ThemeConfig } from '../types';

interface BackgroundCanvasProps {
  theme: ThemeConfig;
  motionScale: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  alpha: number;
  baseAlpha: number;
}

interface Ripple {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  alpha: number;
  color: string;
}

export const BackgroundCanvas: React.FC<BackgroundCanvasProps> = ({ theme, motionScale }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mouseRef = useRef({ x: 0, y: 0, targetX: 0, targetY: 0, active: false });
  const ripplesRef = useRef<Ripple[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', handleResize);

    const handlePointerMove = (e: PointerEvent) => {
      mouseRef.current.targetX = e.clientX;
      mouseRef.current.targetY = e.clientY;
      mouseRef.current.active = true;
    };

    const handlePointerDown = (e: PointerEvent) => {
      if (motionScale === 0) return;
      ripplesRef.current.push({
        x: e.clientX,
        y: e.clientY,
        radius: 4,
        maxRadius: Math.min(width, height) * 0.45,
        alpha: 0.7,
        color: theme.primaryLight,
      });
      if (ripplesRef.current.length > 5) ripplesRef.current.shift();
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    window.addEventListener('pointerdown', handlePointerDown, { passive: true });

    // Performance adaptation for Android / Mobile devices
    const isMobile = width < 768;
    const particleCount = isMobile ? 22 : 45;
    const particles: Particle[] = [];
    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.35,
        vy: (Math.random() - 0.5) * 0.35 - 0.1,
        radius: Math.random() * 1.8 + 0.6,
        alpha: Math.random() * 0.5 + 0.2,
        baseAlpha: Math.random() * 0.4 + 0.15,
      });
    }

    let time = 0;

    const render = () => {
      time += 0.008 * (motionScale > 0 ? motionScale : 0.05);

      // Smooth mouse lerp
      mouseRef.current.x += (mouseRef.current.targetX - mouseRef.current.x) * 0.06;
      mouseRef.current.y += (mouseRef.current.targetY - mouseRef.current.y) * 0.06;

      ctx.clearRect(0, 0, width, height);

      // 1. Draw glowing subtle radial gradient centered behind the card
      const cx = width / 2;
      const cy = height / 2;
      const mouseDistX = (mouseRef.current.x - cx) * 0.15;
      const mouseDistY = (mouseRef.current.y - cy) * 0.15;

      const radialGlow = ctx.createRadialGradient(
        cx + mouseDistX,
        cy + mouseDistY - 40,
        10,
        cx + mouseDistX,
        cy + mouseDistY - 40,
        Math.max(width, height) * 0.65
      );
      radialGlow.addColorStop(0, theme.glow);
      radialGlow.addColorStop(0.5, 'transparent');
      ctx.fillStyle = radialGlow;
      ctx.fillRect(0, 0, width, height);

      // 2. Ambient floating orbs
      const floatX1 = Math.sin(time * 0.7) * 60 + width * 0.8;
      const floatY1 = Math.cos(time * 0.6) * 50 + height * 0.2;
      const orbGrad1 = ctx.createRadialGradient(floatX1, floatY1, 0, floatX1, floatY1, 240);
      orbGrad1.addColorStop(0, theme.glow);
      orbGrad1.addColorStop(1, 'transparent');
      ctx.fillStyle = orbGrad1;
      ctx.beginPath();
      ctx.arc(floatX1, floatY1, 240, 0, Math.PI * 2);
      ctx.fill();

      // 3. Kinetic Flowing Ribbon Waves
      const waveCount = isMobile ? 3 : 5;
      const waveOffsets = isMobile ? [0.25, 0.5, 0.75] : [0.18, 0.34, 0.5, 0.66, 0.82];
      const waveSpeeds = [0.7, -0.5, 0.8, -0.6, 0.9];

      for (let i = 0; i < waveCount; i++) {
        const baseY = height * waveOffsets[i];
        const speed = waveSpeeds[i];
        const waveTime = time * speed;

        ctx.beginPath();
        const startY = baseY + Math.sin(waveTime) * 30;
        ctx.moveTo(0, startY);

        const segments = isMobile ? 4 : 5;
        const segmentWidth = width / segments;

        for (let s = 1; s <= segments; s++) {
          const segX = s * segmentWidth;
          const prevSegX = (s - 1) * segmentWidth;
          const midX = (prevSegX + segX) / 2;

          // Mouse warp effect
          const distToMouse = Math.hypot(midX - mouseRef.current.x, baseY - mouseRef.current.y);
          const mouseInfluence = Math.max(0, 1 - distToMouse / 450);
          const warpY = mouseInfluence * (mouseRef.current.y - baseY) * 0.4;

          const harmonic = Math.sin(waveTime + s * 1.2) * 40 + Math.cos(waveTime * 1.5 + s) * 18;
          const segY = baseY + harmonic + warpY;

          const cp1x = prevSegX + segmentWidth * 0.5;
          const cp1y = segY + Math.sin(waveTime + s) * 20;

          ctx.quadraticCurveTo(cp1x, cp1y, segX, segY);
        }

        ctx.strokeStyle = theme.primaryLight;
        ctx.lineWidth = i === 1 ? 1.6 : 1.1;
        ctx.globalAlpha = 0.16 + (i % 2 === 0 ? 0.08 : 0);
        ctx.setLineDash([90 + i * 20, 50 + i * 15]);
        ctx.lineDashOffset = -time * (35 + i * 15) * (speed > 0 ? 1 : -1);
        ctx.stroke();
      }

      ctx.setLineDash([]);
      ctx.globalAlpha = 1;

      // 4. Stardust Particles
      particles.forEach((p) => {
        p.x += p.vx * (motionScale > 0 ? motionScale : 0.2);
        p.y += p.vy * (motionScale > 0 ? motionScale : 0.2);

        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;
        if (p.y < 0) p.y = height;
        if (p.y > height) p.y = 0;

        ctx.fillStyle = theme.primaryLight;
        ctx.globalAlpha = p.alpha;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
      });

      // 5. Click Ripples
      for (let r = ripplesRef.current.length - 1; r >= 0; r--) {
        const rip = ripplesRef.current[r];
        rip.radius += (rip.maxRadius - rip.radius) * 0.045 + 0.8;
        rip.alpha *= 0.94;

        ctx.strokeStyle = rip.color;
        ctx.lineWidth = 1.3;
        ctx.globalAlpha = rip.alpha;
        ctx.beginPath();
        ctx.arc(rip.x, rip.y, rip.radius, 0, Math.PI * 2);
        ctx.stroke();

        if (rip.alpha < 0.02 || rip.radius >= rip.maxRadius) {
          ripplesRef.current.splice(r, 1);
        }
      }

      ctx.globalAlpha = 1;
      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerdown', handlePointerDown);
    };
  }, [theme, motionScale]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0"
      style={{ touchAction: 'none' }}
    />
  );
};
