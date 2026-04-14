export interface ForgePalette {
  deep: number;
  base: number;
  mid: number;
  bright: number;
  accent: number;
  glow: number;
}

const emberPalette: ForgePalette = {
  deep: 0x2b1114,
  base: 0x6f2830,
  mid: 0xc45145,
  bright: 0xf6c36d,
  accent: 0xff7a5c,
  glow: 0xffd79b
};

const tidePalette: ForgePalette = {
  deep: 0x0d1e2d,
  base: 0x16486a,
  mid: 0x2d8ec2,
  bright: 0x81dfff,
  accent: 0x42bff2,
  glow: 0xbbefff
};

const verdantPalette: ForgePalette = {
  deep: 0x102114,
  base: 0x1c4b2a,
  mid: 0x3a9b58,
  bright: 0xa9eb7a,
  accent: 0x63d86a,
  glow: 0xd8ffb5
};

const neutralPalette: ForgePalette = {
  deep: 0x101821,
  base: 0x223246,
  mid: 0x486989,
  bright: 0xcde4f8,
  accent: 0xe4b866,
  glow: 0xf9f0ca
};

export function affinityPalette(affinity: string) {
  if (affinity.includes("tide")) {
    return tidePalette;
  }

  if (affinity.includes("verdant")) {
    return verdantPalette;
  }

  if (affinity.includes("ember")) {
    return emberPalette;
  }

  return neutralPalette;
}

export function zonePalette(climate: string) {
  if (climate.includes("monsoon")) {
    return {
      deep: 0x07131f,
      base: 0x10314a,
      mid: 0x1b587b,
      bright: 0x64b9de,
      accent: 0xe2b062,
      glow: 0xaef3ff
    } satisfies ForgePalette;
  }

  return neutralPalette;
}

export function metallicPalette() {
  return neutralPalette;
}
