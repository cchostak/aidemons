import Phaser from "phaser";
import type { BootstrapPayload } from "../../lib/types";
import { AssetForge } from "../art/AssetForge";

export class BootScene extends Phaser.Scene {
  constructor(private readonly world: BootstrapPayload) {
    super("boot");
  }

  create() {
    const forge = new AssetForge(this, this.world);
    forge.generateAll();
    this.scene.start("world");
  }
}
