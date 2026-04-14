export interface SeededRng {
  float: () => number;
  between: (min: number, max: number) => number;
  pick: <T>(items: readonly T[]) => T;
}

export function hashSeed(input: string) {
  let hash = 2166136261;

  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

export function createSeededRng(seed: number): SeededRng {
  let state = seed || 1;

  const next = () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0xffffffff;
  };

  return {
    float: next,
    between: (min, max) => Math.round(min + next() * (max - min)),
    pick: (items) => items[Math.floor(next() * items.length)] ?? items[0]
  };
}

export function worldSeedKey(input: {
  worldName: string;
  regionName: string;
  climate: string;
  hotspot: string;
}) {
  return `${input.worldName}:${input.regionName}:${input.climate}:${input.hotspot}`;
}
