export type Range = { min: number; max: number };

const UINT_MAX = 0xffffffff;

export class SeededRng {
  private state: number;

  constructor(seed: number) {
    this.state = seed >>> 0;
  }

  next(): number {
    this.state = (1664525 * this.state + 1013904223) >>> 0;
    return this.state / UINT_MAX;
  }

  float(min: number, max: number): number {
    return min + (max - min) * this.next();
  }

  int(min: number, max: number): number {
    return Math.floor(this.float(min, max + 1));
  }

  pick<T>(items: T[]): T {
    return items[Math.floor(this.next() * items.length)];
  }
}

export const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

export const sampleRange = (rng: SeededRng, range: Range, integer = false): number =>
  integer ? Math.round(rng.float(range.min, range.max)) : rng.float(range.min, range.max);

export const hashSeed = (...parts: number[]): number => {
  let h = 2166136261;
  for (const part of parts) {
    let v = part >>> 0;
    for (let i = 0; i < 4; i += 1) {
      h ^= v & 0xff;
      h = Math.imul(h, 16777619);
      v >>>= 8;
    }
  }
  return h >>> 0;
};

export const makeInstanceId = (seed: number, presetId: string): string =>
  `${presetId}-${seed.toString(16)}`;
