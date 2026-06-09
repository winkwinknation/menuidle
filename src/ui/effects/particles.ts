// A tiny pooled particle system drawn on a single fixed canvas. Used for collect bursts.
interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
}

const MAX = 600;
const GRAVITY = 520; // px/s^2

class ParticleSystem {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private parts: Particle[] = [];
  private raf = 0;
  private last = 0;
  private dpr = 1;

  attach(canvas: HTMLCanvasElement): void {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.resize();
    window.addEventListener('resize', this.resize);
    this.last = performance.now();
    this.loop(this.last);
  }

  detach(): void {
    cancelAnimationFrame(this.raf);
    window.removeEventListener('resize', this.resize);
    this.canvas = null;
    this.ctx = null;
    this.parts = [];
  }

  private resize = (): void => {
    if (!this.canvas) return;
    this.dpr = window.devicePixelRatio || 1;
    this.canvas.width = window.innerWidth * this.dpr;
    this.canvas.height = window.innerHeight * this.dpr;
  };

  emit(x: number, y: number, color: string, count: number): void {
    for (let i = 0; i < count && this.parts.length < MAX; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 60 + Math.random() * 180;
      this.parts.push({
        x,
        y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp - 80,
        life: 0,
        maxLife: 0.5 + Math.random() * 0.4,
        size: 2 + Math.random() * 3,
        color,
      });
    }
  }

  private loop = (now: number): void => {
    this.raf = requestAnimationFrame(this.loop);
    const ctx = this.ctx;
    const canvas = this.canvas;
    if (!ctx || !canvas) return;
    const dt = Math.min((now - this.last) / 1000, 0.05);
    this.last = now;

    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const next: Particle[] = [];
    for (const p of this.parts) {
      p.life += dt;
      if (p.life >= p.maxLife) continue;
      p.vy += GRAVITY * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      const alpha = 1 - p.life / p.maxLife;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x, p.y, p.size, p.size);
      next.push(p);
    }
    ctx.globalAlpha = 1;
    this.parts = next;
  };
}

export const particles = new ParticleSystem();
