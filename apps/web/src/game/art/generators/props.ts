import Phaser from "phaser";
import type { ForgePalette } from "../palettes";
import type { SeededRng } from "../../world/seed";

function paintTexture(
  scene: Phaser.Scene,
  key: string,
  width: number,
  height: number,
  draw: (graphics: Phaser.GameObjects.Graphics) => void
) {
  if (scene.textures.exists(key)) {
    scene.textures.remove(key);
  }

  const graphics = scene.add.graphics();
  graphics.setVisible(false);
  draw(graphics);
  graphics.generateTexture(key, width, height);
  graphics.destroy();
}

export function generateBrushClump(
  scene: Phaser.Scene,
  key: string,
  palette: ForgePalette,
  rng: SeededRng
) {
  paintTexture(scene, key, 56, 40, (graphics) => {
    for (let index = 0; index < 12; index += 1) {
      const x = rng.between(6, 50);
      const height = rng.between(10, 26);

      graphics.lineStyle(2, index % 2 === 0 ? palette.mid : palette.deep, 0.9);
      graphics.lineBetween(x, 34, x + rng.between(-5, 5), 34 - height);
    }
  });
}

export function generateFern(scene: Phaser.Scene, key: string, palette: ForgePalette, rng: SeededRng) {
  paintTexture(scene, key, 48, 42, (graphics) => {
    graphics.lineStyle(2, palette.deep, 0.95);
    graphics.lineBetween(24, 36, 24, 10);

    for (let index = 0; index < 6; index += 1) {
      const y = 32 - index * 4;
      const reach = rng.between(8, 15);

      graphics.lineStyle(2, palette.mid, 0.85);
      graphics.lineBetween(24, y, 24 - reach, y - 4);
      graphics.lineBetween(24, y, 24 + reach, y - 4);
    }
  });
}

export function generateCrystalNode(scene: Phaser.Scene, key: string, palette: ForgePalette) {
  paintTexture(scene, key, 48, 58, (graphics) => {
    graphics.fillStyle(0x11212c, 1);
    graphics.fillRect(13, 44, 22, 6);

    graphics.fillStyle(palette.bright, 0.95);
    graphics.fillTriangle(24, 6, 12, 34, 22, 42);
    graphics.fillTriangle(24, 6, 26, 42, 36, 34);
    graphics.fillStyle(palette.accent, 0.85);
    graphics.fillTriangle(15, 20, 8, 40, 18, 42);
    graphics.fillTriangle(33, 18, 30, 42, 41, 38);
    graphics.lineStyle(2, palette.glow, 0.4);
    graphics.strokeTriangle(24, 6, 12, 34, 22, 42);
    graphics.strokeTriangle(24, 6, 26, 42, 36, 34);
    graphics.lineStyle(1, palette.glow, 0.15);
    graphics.lineBetween(24, 10, 24, 40);
  });
}

export function generateLantern(scene: Phaser.Scene, key: string, palette: ForgePalette) {
  paintTexture(scene, key, 34, 66, (graphics) => {
    graphics.fillStyle(0x2e2416, 1);
    graphics.fillRect(14, 10, 6, 48);
    graphics.fillRoundedRect(9, 18, 16, 18, 4);
    graphics.fillStyle(palette.bright, 0.9);
    graphics.fillRoundedRect(11, 20, 12, 14, 3);
    graphics.lineStyle(3, palette.glow, 0.2);
    graphics.strokeCircle(17, 27, 16);
  });
}

export function generateRunestone(scene: Phaser.Scene, key: string, palette: ForgePalette) {
  paintTexture(scene, key, 50, 62, (graphics) => {
    graphics.fillStyle(0x233549, 1);
    graphics.fillRoundedRect(12, 10, 26, 40, 6);
    graphics.fillStyle(0x101923, 1);
    graphics.fillRect(9, 48, 32, 6);

    graphics.lineStyle(2, palette.accent, 0.8);
    graphics.lineBetween(25, 16, 25, 40);
    graphics.lineBetween(18, 22, 32, 22);
    graphics.lineBetween(18, 34, 32, 34);
    graphics.strokeCircle(25, 28, 6);
    graphics.lineStyle(1, palette.bright, 0.16);
    graphics.lineBetween(16, 14, 34, 46);
  });
}
