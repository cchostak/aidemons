import Phaser from "phaser";
import type { ForgePalette } from "../palettes";

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

export function generatePotionIcon(scene: Phaser.Scene, key: string, palette: ForgePalette) {
  paintTexture(scene, key, 26, 34, (graphics) => {
    graphics.fillStyle(0xb58f5e, 1);
    graphics.fillRoundedRect(9, 2, 8, 8, 2);

    graphics.fillStyle(palette.mid, 1);
    graphics.fillRoundedRect(5, 9, 16, 20, 5);
    graphics.fillStyle(palette.glow, 0.36);
    graphics.fillRoundedRect(8, 12, 5, 12, 2);
    graphics.lineStyle(2, 0xffffff, 0.2);
    graphics.strokeRoundedRect(5, 9, 16, 20, 5);
  });
}

export function generateBladeIcon(scene: Phaser.Scene, key: string, palette: ForgePalette) {
  paintTexture(scene, key, 36, 36, (graphics) => {
    graphics.fillStyle(palette.glow, 1);
    graphics.fillTriangle(18, 2, 12, 24, 24, 24);

    graphics.fillStyle(palette.accent, 1);
    graphics.fillRect(16, 22, 4, 8);
    graphics.fillStyle(0x6f4d2d, 1);
    graphics.fillRoundedRect(11, 28, 14, 4, 2);
  });
}

export function generateGemIcon(scene: Phaser.Scene, key: string, palette: ForgePalette) {
  paintTexture(scene, key, 30, 30, (graphics) => {
    graphics.fillStyle(palette.bright, 0.96);
    graphics.fillTriangle(15, 3, 5, 12, 10, 24);
    graphics.fillTriangle(15, 3, 20, 24, 25, 12);
    graphics.fillStyle(palette.accent, 0.86);
    graphics.fillTriangle(15, 3, 10, 24, 20, 24);
    graphics.lineStyle(2, palette.glow, 0.35);
    graphics.strokeTriangle(15, 3, 5, 12, 10, 24);
    graphics.strokeTriangle(15, 3, 20, 24, 25, 12);
  });
}

export function generateSignalMarker(scene: Phaser.Scene, key: string, palette: ForgePalette) {
  paintTexture(scene, key, 42, 42, (graphics) => {
    graphics.fillStyle(palette.glow, 0.14);
    graphics.fillCircle(21, 21, 18);
    graphics.fillStyle(palette.accent, 0.95);
    graphics.fillCircle(21, 21, 6);
    graphics.lineStyle(2, palette.bright, 0.35);
    graphics.strokeCircle(21, 21, 12);
  });
}
