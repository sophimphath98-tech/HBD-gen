/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';

export interface CelebrationCanvasRef {
  firework: (x?: number, y?: number, style?: string) => void;
  confetti: (intensity?: number, style?: string) => void;
  burstAll: (fireworkStyle?: string, confettiStyle?: string) => void;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  alpha: number;
  size: number;
  gravity: number;
  fade: number;
}

interface ConfettiPiece {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  width: number;
  height: number;
  rotation: number;
  rotationSpeed: number;
  opacity: number;
  type?: 'ribbon' | 'stars' | 'hearts';
}

const PALETTE = [
  '#f59e0b', // Gold
  '#fbbf24', // Yellow Gold
  '#fca5a5', // Rose Rose
  '#f472b6', // Pink Sweet
  '#ec4899', // Hot Pink
  '#3b82f6', // Light Sky Blue
  '#c084fc', // Lilac
  '#2dd4bf', // Pastel Teal
  '#ffffff', // Celebration White
];

export const CelebrationCanvas = forwardRef<CelebrationCanvasRef, {}>((_, ref) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const confettiRef = useRef<ConfettiPiece[]>([]);
  const animationFrameIdRef = useRef<number | null>(null);

  // Resize handler
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      if (canvas) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize();

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Main canvas animation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Render & Update Fireworks Particles
      const particles = particlesRef.current;
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += p.gravity;
        p.alpha -= p.fade;

        if (p.alpha <= 0) {
          particles.splice(i, 1);
          continue;
        }

        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        ctx.shadowBlur = p.size * 2;
        ctx.shadowColor = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // Render & Update Confetti Pieces
      const confetti = confettiRef.current;
      for (let i = confetti.length - 1; i >= 0; i--) {
        const c = confetti[i];
        c.x += c.vx;
        c.y += c.vy;
        c.vy += 0.08; // moderate gravity
        c.rotation += c.rotationSpeed;
        c.vx *= 0.98; // soft drag

        // slow fade as they reach the bottom of the screen
        if (c.y > canvas.height * 0.8) {
          c.opacity -= 0.01;
        }

        if (c.y > canvas.height + 20 || c.opacity <= 0) {
          confetti.splice(i, 1);
          continue;
        }

        ctx.save();
        ctx.translate(c.x, c.y);
        ctx.rotate(c.rotation);
        ctx.globalAlpha = c.opacity;
        ctx.fillStyle = c.color;
        
        const shapeType = c.type || 'ribbon';
        if (shapeType === 'stars') {
          ctx.beginPath();
          const spikes = 5;
          const outerRadius = c.width;
          const innerRadius = c.width / 2;
          let r = Math.PI / 2 * 3;
          let sx = 0;
          let sy = 0;
          const step = Math.PI / spikes;

          ctx.moveTo(0, -outerRadius);
          for (let s = 0; s < spikes; s++) {
            sx = Math.cos(r) * outerRadius;
            sy = Math.sin(r) * outerRadius;
            ctx.lineTo(sx, sy);
            r += step;

            sx = Math.cos(r) * innerRadius;
            sy = Math.sin(r) * innerRadius;
            ctx.lineTo(sx, sy);
            r += step;
          }
          ctx.lineTo(0, -outerRadius);
          ctx.closePath();
          ctx.fill();
        } else if (shapeType === 'hearts') {
          ctx.beginPath();
          ctx.moveTo(0, -c.height / 4);
          ctx.bezierCurveTo(-c.width / 2, -c.height * 0.8, -c.width, -c.height / 3, 0, c.height / 2);
          ctx.bezierCurveTo(c.width, -c.height / 3, c.width / 2, -c.height * 0.8, 0, -c.height / 4);
          ctx.closePath();
          ctx.fill();
        } else {
          ctx.fillRect(-c.width / 2, -c.height / 2, c.width, c.height);
        }
        ctx.restore();
      }

      // Keep animation running only if there are active particles
      if (particles.length > 0 || confetti.length > 0) {
        animationFrameIdRef.current = requestAnimationFrame(render);
      } else {
        animationFrameIdRef.current = null;
      }
    };

    const ensureLoopIsRunning = () => {
      if (animationFrameIdRef.current === null) {
        animationFrameIdRef.current = requestAnimationFrame(render);
      }
    };

    // Store helper on canvas ref for local file access if needed
    (canvas as any).__checkLoop = ensureLoopIsRunning;

    return () => {
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
      }
    };
  }, []);

  const ensureAnimationLoop = () => {
    const canvas = canvasRef.current;
    if (canvas && (canvas as any).__checkLoop) {
      (canvas as any).__checkLoop();
    }
  };

  // Imperative API for Parent
  useImperativeHandle(ref, () => ({
    // Creates a glowing firework burst
    firework: (x?: number, y?: number, style?: string) => {
      const targetX = x ?? Math.random() * window.innerWidth;
      const targetY = y ?? (window.innerHeight * 0.2 + Math.random() * window.innerHeight * 0.4);
      
      const getStyleColors = (s?: string) => {
        if (s === 'rose-gold') return ['#f43f5e', '#fda4af', '#fbf7f5', '#fb7185', '#e11d48', '#fbbf24'];
        if (s === 'starry-gold') return ['#fbbf24', '#f59e0b', '#d97706', '#fef08a', '#fffbeb'];
        if (s === 'lavender') return ['#c084fc', '#a855f7', '#a5b4fc', '#818cf8', '#ffffff', '#e0e7ff'];
        if (s === 'heart-burst') return ['#ec4899', '#f43f5e', '#ff0000', '#f472b6', '#fda4af', '#fff1f2'];
        return PALETTE;
      };

      const colors = getStyleColors(style);
      const colorBatch = colors[Math.floor(Math.random() * colors.length)];
      
      if (style === 'heart-burst') {
        const particleCount = 80;
        for (let i = 0; i < particleCount; i++) {
          const t = (i / particleCount) * Math.PI * 2;
          const rX = 16 * Math.pow(Math.sin(t), 3);
          const rY = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
          
          const scale = 0.25 + Math.random() * 0.1;
          particlesRef.current.push({
            x: targetX,
            y: targetY,
            vx: rX * scale,
            vy: rY * scale,
            color: colors[Math.floor(Math.random() * colors.length)],
            alpha: 1.0,
            size: 2.0 + Math.random() * 2.0,
            gravity: 0.02 + Math.random() * 0.02,
            fade: 0.008 + Math.random() * 0.005,
          });
        }
      } else {
        const particleCount = 60 + Math.floor(Math.random() * 40);
        for (let i = 0; i < particleCount; i++) {
          const angle = Math.random() * Math.PI * 2;
          const velocity = 2 + Math.random() * 6;
          
          particlesRef.current.push({
            x: targetX,
            y: targetY,
            vx: Math.cos(angle) * velocity,
            vy: Math.sin(angle) * velocity,
            color: Math.random() > 0.3 ? colorBatch : colors[Math.floor(Math.random() * colors.length)],
            alpha: 1.0,
            size: 1.5 + Math.random() * 2.5,
            gravity: 0.05 + Math.random() * 0.05,
            fade: 0.008 + Math.random() * 0.012,
          });
        }
      }
      ensureAnimationLoop();
    },

    // Launches elegant 3D paper confetti
    confetti: (intensity: number = 80, style?: string) => {
      const getStyleColors = (s?: string) => {
        if (s === 'rose-gold') return ['#f43f5e', '#fda4af', '#fbf7f5', '#fb7185', '#e11d48', '#fbbf24'];
        if (s === 'starry-gold') return ['#fbbf24', '#f59e0b', '#d97706', '#fef08a', '#fffbeb'];
        if (s === 'lavender') return ['#c084fc', '#a855f7', '#a5b4fc', '#818cf8', '#ffffff', '#e0e7ff'];
        if (s === 'heart-burst') return ['#ec4899', '#f43f5e', '#ff0000', '#f472b6', '#fda4af', '#fff1f2'];
        return PALETTE;
      };
      const colors = getStyleColors(style);

      for (let i = 0; i < intensity; i++) {
        confettiRef.current.push({
          x: Math.random() * window.innerWidth,
          y: -20 - Math.random() * 100,
          vx: -2 + Math.random() * 4,
          vy: 1 + Math.random() * 4,
          color: colors[Math.floor(Math.random() * colors.length)],
          width: 6 + Math.random() * 8,
          height: 10 + Math.random() * 10,
          rotation: Math.random() * Math.PI * 2,
          rotationSpeed: (Math.random() - 0.5) * 0.2,
          opacity: 1.0,
          type: style as any,
        });
      }
      ensureAnimationLoop();
    },

    // Combines all fireworks and confetti for extreme celebration!
    burstAll: (fireworkStyle?: string, confettiStyle?: string) => {
      const getStyleColors = (s?: string) => {
        if (s === 'rose-gold') return ['#f43f5e', '#fda4af', '#fbf7f5', '#fb7185', '#e11d48', '#fbbf24'];
        if (s === 'starry-gold') return ['#fbbf24', '#f59e0b', '#d97706', '#fef08a', '#fffbeb'];
        if (s === 'lavender') return ['#c084fc', '#a855f7', '#a5b4fc', '#818cf8', '#ffffff', '#e0e7ff'];
        if (s === 'heart-burst') return ['#ec4899', '#f43f5e', '#ff0000', '#f472b6', '#fda4af', '#fff1f2'];
        return PALETTE;
      };

      // Confetti
      const confettiColors = getStyleColors(fireworkStyle || confettiStyle);
      for (let i = 0; i < 120; i++) {
        confettiRef.current.push({
          x: Math.random() * window.innerWidth,
          y: -20 - Math.random() * 100,
          vx: -3 + Math.random() * 6,
          vy: 1 + Math.random() * 5,
          color: confettiColors[Math.floor(Math.random() * confettiColors.length)],
          width: 6 + Math.random() * 8,
          height: 10 + Math.random() * 10,
          rotation: Math.random() * Math.PI * 2,
          rotationSpeed: (Math.random() - 0.5) * 0.25,
          opacity: 1.0,
          type: confettiStyle as any,
        });
      }

      // Three nice staggered fireworks bursts
      const width = window.innerWidth;
      const height = window.innerHeight;
      
      const locations = [
        { x: width * 0.3, y: height * 0.3 },
        { x: width * 0.5, y: height * 0.2 },
        { x: width * 0.7, y: height * 0.35 }
      ];

      locations.forEach((loc, index) => {
        setTimeout(() => {
          const colors = getStyleColors(fireworkStyle);
          const colorBatch = colors[Math.floor(Math.random() * colors.length)];
          
          if (fireworkStyle === 'heart-burst') {
            const particleCount = 75;
            for (let i = 0; i < particleCount; i++) {
              const t = (i / particleCount) * Math.PI * 2;
              const rX = 16 * Math.pow(Math.sin(t), 3);
              const rY = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
              
              const scale = 0.2 + Math.random() * 0.1;
              particlesRef.current.push({
                x: loc.x,
                y: loc.y,
                vx: rX * scale,
                vy: rY * scale,
                color: colors[Math.floor(Math.random() * colors.length)],
                alpha: 1.0,
                size: 1.8 + Math.random() * 2.5,
                gravity: 0.02 + Math.random() * 0.02,
                fade: 0.007 + Math.random() * 0.008,
              });
            }
          } else {
            const particleCount = 75;
            for (let i = 0; i < particleCount; i++) {
              const angle = Math.random() * Math.PI * 2;
              const velocity = 2 + Math.random() * 7;
              
              particlesRef.current.push({
                x: loc.x,
                y: loc.y,
                vx: Math.cos(angle) * velocity,
                vy: Math.sin(angle) * velocity,
                color: Math.random() > 0.25 ? colorBatch : colors[Math.floor(Math.random() * colors.length)],
                alpha: 1.0,
                size: 1.2 + Math.random() * 3.0,
                gravity: 0.04 + Math.random() * 0.04,
                fade: 0.007 + Math.random() * 0.01,
              });
            }
          }
          ensureAnimationLoop();
        }, index * 200);
      });
      
      ensureAnimationLoop();
    }
  }));

  return (
    <canvas
      id="celebration-effects-canvas"
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-50 overflow-hidden"
    />
  );
});

CelebrationCanvas.displayName = 'CelebrationCanvas';
