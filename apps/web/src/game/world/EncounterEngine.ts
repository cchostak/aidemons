import type { BootstrapPayload } from "../../lib/types";
import type { SeededRng } from "./seed";

export interface EncounterSpawn {
  x: number;
  y: number;
  texture: string;
  name: string;
  phase: number;
  orbitRadius: number;
}

export class EncounterEngine {
  constructor(
    private readonly world: BootstrapPayload,
    private readonly rng: SeededRng
  ) {}

  build() {
    const family = this.creatureFamily();
    const spawns: EncounterSpawn[] = [];

    for (let cluster = 0; cluster < 6; cluster += 1) {
      const clusterDistance = this.rng.between(260, 920);
      const clusterAngle = this.rng.float() * Math.PI * 2;
      const clusterX = Math.cos(clusterAngle) * clusterDistance;
      const clusterY = Math.sin(clusterAngle) * clusterDistance;
      const members = this.rng.between(2, 4);

      for (let index = 0; index < members; index += 1) {
        const profile = this.rng.pick(family);

        spawns.push({
          x: clusterX + this.rng.between(-90, 90),
          y: clusterY + this.rng.between(-60, 60),
          texture: profile.texture,
          name: profile.name,
          phase: this.rng.float() * Math.PI * 2,
          orbitRadius: this.rng.between(8, 22)
        });
      }
    }

    return spawns;
  }

  private creatureFamily() {
    if (this.world.region.climate.includes("monsoon")) {
      return [
        { texture: "enemy-rift-hound", name: "Rift Hound" },
        { texture: "enemy-lantern-mite", name: "Lantern Mite" },
        { texture: "enemy-marsh-bulwark", name: "Marsh Bulwark" }
      ] as const;
    }

    return [
      { texture: "enemy-rift-hound", name: "Rift Hound" },
      { texture: "enemy-lantern-mite", name: "Lantern Mite" }
    ] as const;
  }
}
