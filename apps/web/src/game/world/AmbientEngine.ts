import type { SeededRng } from "./seed";

export interface AmbientMote {
  x: number;
  y: number;
  radius: number;
  alpha: number;
  tint: number;
  phase: number;
}

export class AmbientEngine {
  constructor(private readonly rng: SeededRng) {}

  buildMotes(count: number) {
    const tints = [0x7edbff, 0xc5f4ff, 0xffd47b, 0x9bf2c9] as const;

    return Array.from({ length: count }, () => ({
      x: this.rng.between(-1160, 1160),
      y: this.rng.between(-1160, 1160),
      radius: this.rng.between(8, 28),
      alpha: 0.04 + this.rng.float() * 0.08,
      tint: this.rng.pick(tints),
      phase: this.rng.float() * Math.PI * 2
    }));
  }
}
