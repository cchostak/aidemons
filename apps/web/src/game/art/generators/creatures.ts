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

export function generateAvatar(scene: Phaser.Scene, key: string, palette: ForgePalette) {
  paintTexture(scene, key, 40, 48, (graphics) => {
    graphics.fillStyle(palette.glow, 1);
    graphics.fillCircle(20, 10, 7);

    graphics.fillStyle(palette.mid, 1);
    graphics.fillRoundedRect(14, 18, 12, 16, 5);

    graphics.fillStyle(palette.accent, 0.95);
    graphics.fillTriangle(14, 18, 26, 18, 20, 34);

    graphics.fillStyle(palette.deep, 1);
    graphics.fillRect(13, 22, 4, 12);
    graphics.fillRect(23, 22, 4, 12);
    graphics.fillRect(15, 34, 4, 10);
    graphics.fillRect(21, 34, 4, 10);

    graphics.lineStyle(2, 0xffffff, 0.35);
    graphics.strokeCircle(20, 10, 7);
  });
}

export function generatePet(
  scene: Phaser.Scene,
  key: string,
  palette: ForgePalette,
  rng: SeededRng
) {
  paintTexture(scene, key, 44, 34, (graphics) => {
    const bodyWidth = rng.between(20, 28);
    const bodyHeight = rng.between(14, 18);
    const centerX = 22;
    const centerY = 18;

    graphics.fillStyle(palette.mid, 1);
    graphics.fillEllipse(centerX, centerY, bodyWidth, bodyHeight);

    graphics.fillStyle(palette.deep, 0.95);
    graphics.fillTriangle(10, 18, 4, rng.between(10, 18), 12, 24);
    graphics.fillTriangle(34, 18, 40, rng.between(10, 18), 32, 24);

    if (rng.float() > 0.4) {
      graphics.fillStyle(palette.accent, 0.92);
      graphics.fillTriangle(20, 4, 14, 14, 21, 12);
      graphics.fillTriangle(24, 4, 30, 14, 23, 12);
    }

    if (rng.float() > 0.5) {
      graphics.fillStyle(palette.bright, 0.9);
      graphics.fillTriangle(8, 18, 2, 8, 6, 22);
      graphics.fillTriangle(36, 18, 42, 8, 38, 22);
    }

    graphics.fillStyle(palette.glow, 1);
    graphics.fillCircle(17, 17, 2);
    graphics.fillCircle(27, 17, 2);

    graphics.fillStyle(palette.accent, 0.86);
    graphics.fillTriangle(22, 20, 19, 23, 25, 23);
  });
}

export function generateEnemyHound(scene: Phaser.Scene, key: string, palette: ForgePalette) {
  paintTexture(scene, key, 40, 28, (graphics) => {
    graphics.fillStyle(palette.mid, 0.96);
    graphics.fillEllipse(18, 15, 24, 14);
    graphics.fillStyle(palette.deep, 0.96);
    graphics.fillTriangle(11, 12, 4, 6, 8, 16);
    graphics.fillTriangle(22, 10, 19, 3, 26, 9);
    graphics.fillTriangle(28, 10, 31, 3, 35, 11);
    graphics.fillRect(11, 19, 3, 8);
    graphics.fillRect(22, 19, 3, 8);
    graphics.fillStyle(palette.glow, 1);
    graphics.fillCircle(24, 13, 2);
    graphics.fillStyle(palette.accent, 1);
    graphics.fillTriangle(31, 15, 38, 12, 35, 18);
  });
}

export function generateEnemyMite(scene: Phaser.Scene, key: string, palette: ForgePalette) {
  paintTexture(scene, key, 30, 30, (graphics) => {
    graphics.fillStyle(palette.bright, 0.9);
    graphics.fillCircle(15, 15, 8);
    graphics.fillStyle(palette.glow, 0.4);
    graphics.fillCircle(15, 15, 12);
    graphics.lineStyle(2, palette.accent, 0.75);
    graphics.lineBetween(8, 9, 4, 4);
    graphics.lineBetween(22, 9, 26, 4);
    graphics.lineBetween(9, 22, 3, 26);
    graphics.lineBetween(21, 22, 27, 26);
    graphics.fillStyle(palette.deep, 0.85);
    graphics.fillCircle(12, 15, 2);
    graphics.fillCircle(18, 15, 2);
  });
}

export function generateEnemyBulwark(scene: Phaser.Scene, key: string, palette: ForgePalette) {
  paintTexture(scene, key, 44, 40, (graphics) => {
    graphics.fillStyle(palette.deep, 1);
    graphics.fillRoundedRect(8, 11, 28, 20, 6);
    graphics.fillStyle(palette.mid, 0.94);
    graphics.fillRoundedRect(12, 8, 20, 24, 6);
    graphics.fillStyle(palette.accent, 0.86);
    graphics.fillTriangle(22, 3, 13, 14, 31, 14);
    graphics.fillStyle(palette.glow, 1);
    graphics.fillRect(18, 15, 3, 3);
    graphics.fillRect(23, 15, 3, 3);
    graphics.fillStyle(palette.deep, 1);
    graphics.fillRect(14, 28, 4, 9);
    graphics.fillRect(26, 28, 4, 9);
  });
}
