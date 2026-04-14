import type { BootstrapPayload } from "../../lib/types";
import type { SeededRng } from "./seed";

export interface GroundPatch {
  x: number;
  y: number;
  width: number;
  height: number;
  alpha: number;
  tint: number;
  rotation: number;
}

export interface PropPlacement {
  x: number;
  y: number;
  texture: string;
  scale: number;
}

export interface PickupPlacement {
  x: number;
  y: number;
  texture: string;
}

export interface BiomeLayout {
  groundPatches: GroundPatch[];
  brushClusters: PropPlacement[];
  trees: PropPlacement[];
  crystals: PropPlacement[];
  obelisks: PropPlacement[];
  lanterns: PropPlacement[];
  pickups: PickupPlacement[];
}

export class BiomeEngine {
  constructor(
    private readonly world: BootstrapPayload,
    private readonly rng: SeededRng
  ) {}

  build(): BiomeLayout {
    const climateBoost = this.world.region.climate.includes("monsoon") ? 1.15 : 1;

    return {
      groundPatches: this.makeGroundPatches(18, climateBoost),
      brushClusters: this.scatterProps(42, ["prop-brush", "prop-fern"], 900, 0.8, 1.35),
      trees: this.scatterProps(14, ["landmark-tree"], 1080, 0.9, 1.35),
      crystals: this.scatterProps(9, ["prop-crystal"], 860, 0.8, 1.15),
      obelisks: this.scatterProps(6, ["landmark-obelisk", "prop-runestone"], 940, 0.95, 1.08),
      lanterns: this.scatterProps(7, ["prop-lantern"], 820, 0.9, 1.05),
      pickups: this.makePickups()
    };
  }

  private makeGroundPatches(count: number, scale: number) {
    const tints = [0x154a63, 0x0f344d, 0x184f5f, 0x365d36, 0x5f451f] as const;

    return Array.from({ length: count }, () => ({
      x: this.rng.between(-920, 920),
      y: this.rng.between(-860, 860),
      width: this.rng.between(220, 520) * scale,
      height: this.rng.between(140, 360) * scale,
      alpha: 0.06 + this.rng.float() * 0.08,
      tint: this.rng.pick(tints),
      rotation: this.rng.float() * Math.PI
    }));
  }

  private scatterProps(
    count: number,
    textures: readonly string[],
    radius: number,
    minScale: number,
    maxScale: number
  ) {
    const props: PropPlacement[] = [];

    for (let index = 0; index < count; index += 1) {
      const distance = this.rng.between(140, radius);
      const angle = this.rng.float() * Math.PI * 2;

      props.push({
        x: Math.cos(angle) * distance + this.rng.between(-80, 80),
        y: Math.sin(angle) * distance + this.rng.between(-80, 80),
        texture: this.rng.pick(textures),
        scale: minScale + this.rng.float() * (maxScale - minScale)
      });
    }

    return props;
  }

  private makePickups() {
    const textures = ["pickup-potion", "pickup-blade", "pickup-gem"] as const;

    return Array.from({ length: 8 }, () => {
      const distance = this.rng.between(180, 760);
      const angle = this.rng.float() * Math.PI * 2;

      return {
        x: Math.cos(angle) * distance,
        y: Math.sin(angle) * distance,
        texture: this.rng.pick(textures)
      };
    });
  }
}
