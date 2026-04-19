import Phaser from "phaser";
import type { BootstrapPayload } from "../../lib/types";
import {
  generateAvatar,
  generateEnemyBulwark,
  generateEnemyHound,
  generateEnemyMite,
  generateNpcWarden,
  generatePet
} from "./generators/creatures";
import {
  generateBladeIcon,
  generateGemIcon,
  generatePotionIcon,
  generateSignalMarker
} from "./generators/icons";
import {
  generateBrushClump,
  generateCrystalNode,
  generateFern,
  generateLantern,
  generateRunestone
} from "./generators/props";
import {
  generateObelisk,
  generateRelicRing,
  generateTerrainTile,
  generateTree
} from "./generators/terrain";
import { affinityPalette, metallicPalette, zonePalette } from "./palettes";
import { createSeededRng, hashSeed, worldSeedKey } from "../world/seed";

export class AssetForge {
  constructor(
    private readonly scene: Phaser.Scene,
    private readonly world: BootstrapPayload
  ) {}

  generateAll() {
    const worldSeed = hashSeed(
      worldSeedKey({
        worldName: this.world.worldName,
        regionName: this.world.region.name,
        climate: this.world.region.climate,
        hotspot: this.world.region.hotspot
      })
    );
    const terrainRng = createSeededRng(worldSeed);
    const zone = zonePalette(this.world.region.climate);
    const metal = metallicPalette();

    generateTerrainTile(this.scene, "terrain-tile", zone, terrainRng);
    generateRelicRing(this.scene, "terrain-relic-ring", zone);
    generateTree(this.scene, "landmark-tree", zone, terrainRng);
    generateObelisk(this.scene, "landmark-obelisk", metal);
    generateBrushClump(this.scene, "prop-brush", zone, terrainRng);
    generateFern(this.scene, "prop-fern", zone, terrainRng);
    generateCrystalNode(this.scene, "prop-crystal", zone);
    generateLantern(this.scene, "prop-lantern", zone);
    generateRunestone(this.scene, "prop-runestone", metal);

    generateAvatar(this.scene, "avatar-frontier", metal);
    generateNpcWarden(this.scene, "npc-warden", metal);
    generatePotionIcon(this.scene, "pickup-potion", zone);
    generateBladeIcon(this.scene, "pickup-blade", metal);
    generateGemIcon(this.scene, "pickup-gem", zone);
    generateSignalMarker(this.scene, "signal-marker", zone);
    generateEnemyHound(this.scene, "enemy-rift-hound", zone);
    generateEnemyMite(this.scene, "enemy-lantern-mite", zone);
    generateEnemyBulwark(this.scene, "enemy-marsh-bulwark", zone);

    this.world.starterPets.forEach((pet) => {
      const petKey = this.petTextureKey(pet.id);
      const petRng = createSeededRng(hashSeed(`${worldSeed}:${pet.id}:${pet.name}`));
      generatePet(this.scene, petKey, affinityPalette(pet.affinity), petRng);
    });
  }

  private petTextureKey(petId: string) {
    if (petId.includes("tide")) {
      return "pet-tide";
    }

    if (petId.includes("verdant")) {
      return "pet-verdant";
    }

    return "pet-ember";
  }
}
