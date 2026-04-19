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
  paintTexture(scene, key, 48, 58, (graphics) => {
    graphics.fillStyle(0x050a10, 0.35);
    graphics.fillEllipse(24, 48, 22, 8);

    graphics.fillStyle(palette.glow, 1);
    graphics.fillCircle(24, 12, 7);
    graphics.fillStyle(0xe0cab0, 0.45);
    graphics.fillCircle(22, 10, 2);

    graphics.fillStyle(palette.deep, 1);
    graphics.fillTriangle(24, 15, 11, 26, 37, 26);
    graphics.fillRect(16, 24, 16, 20);

    graphics.fillStyle(palette.mid, 0.96);
    graphics.fillTriangle(24, 16, 16, 41, 32, 41);
    graphics.fillRect(18, 22, 12, 18);

    graphics.fillStyle(palette.accent, 0.88);
    graphics.fillTriangle(24, 18, 14, 34, 20, 36);
    graphics.fillTriangle(24, 18, 34, 34, 28, 36);
    graphics.fillRect(22, 21, 4, 20);

    graphics.fillStyle(palette.deep, 1);
    graphics.fillRect(17, 40, 5, 12);
    graphics.fillRect(26, 40, 5, 12);
    graphics.fillRect(12, 24, 4, 16);
    graphics.fillRect(32, 24, 4, 16);

    graphics.lineStyle(2, 0xffffff, 0.18);
    graphics.strokeCircle(24, 12, 7);
    graphics.lineStyle(1, palette.glow, 0.35);
    graphics.lineBetween(24, 16, 24, 44);
  });
}

export function generatePet(
  scene: Phaser.Scene,
  key: string,
  palette: ForgePalette,
  rng: SeededRng
) {
  paintTexture(scene, key, 56, 42, (graphics) => {
    const bodyWidth = rng.between(24, 34);
    const bodyHeight = rng.between(14, 20);
    const centerX = 28;
    const centerY = 22;
    const tailLift = rng.between(2, 8);

    graphics.fillStyle(0x050910, 0.3);
    graphics.fillEllipse(28, 34, 26, 8);

    graphics.fillStyle(palette.deep, 0.98);
    graphics.fillTriangle(10, 24, 2, 14, 6, 28);
    graphics.fillTriangle(44, 24, 52, 14, 48, 28);
    graphics.fillTriangle(20, 10, 14, 2, 24, 12);
    graphics.fillTriangle(36, 10, 42, 2, 32, 12);

    graphics.fillStyle(palette.mid, 0.98);
    graphics.fillEllipse(centerX, centerY, bodyWidth, bodyHeight);
    graphics.fillEllipse(17, 22, 12, 10);
    graphics.fillRect(18, 26, 4, 10);
    graphics.fillRect(25, 28, 4, 8);
    graphics.fillRect(32, 28, 4, 8);
    graphics.fillRect(39, 26, 4, 10);
    graphics.fillTriangle(42, 18, 52, 10-tailLift, 46, 22);

    if (rng.float() > 0.3) {
      graphics.fillStyle(palette.accent, 0.92);
      graphics.fillTriangle(28, 11, 22, 18, 28, 16);
      graphics.fillTriangle(28, 11, 34, 18, 28, 16);
    }

    graphics.fillStyle(palette.bright, 0.3);
    graphics.fillEllipse(centerX + 3, centerY - 2, bodyWidth * 0.56, bodyHeight * 0.35);
    graphics.fillStyle(palette.glow, 1);
    graphics.fillCircle(15, 20, 2);
    graphics.fillCircle(21, 20, 2);
    graphics.fillStyle(palette.accent, 0.9);
    graphics.fillTriangle(18, 24, 15, 27, 21, 27);
  });
}

export function generateEnemyHound(scene: Phaser.Scene, key: string, palette: ForgePalette) {
  paintTexture(scene, key, 50, 36, (graphics) => {
    graphics.fillStyle(0x04080d, 0.34);
    graphics.fillEllipse(24, 30, 28, 8);
    graphics.fillStyle(palette.deep, 1);
    graphics.fillEllipse(22, 18, 28, 16);
    graphics.fillTriangle(13, 16, 5, 9, 8, 21);
    graphics.fillTriangle(23, 12, 19, 2, 27, 11);
    graphics.fillTriangle(30, 12, 34, 3, 39, 13);
    graphics.fillRect(16, 24, 4, 10);
    graphics.fillRect(28, 24, 4, 10);
    graphics.fillStyle(palette.mid, 0.92);
    graphics.fillEllipse(18, 19, 14, 10);
    graphics.fillStyle(palette.glow, 1);
    graphics.fillCircle(24, 15, 2);
    graphics.fillStyle(palette.accent, 0.96);
    graphics.fillTriangle(36, 18, 46, 13, 42, 20);
    graphics.lineStyle(1, palette.bright, 0.35);
    graphics.lineBetween(14, 19, 32, 15);
  });
}

export function generateEnemyMite(scene: Phaser.Scene, key: string, palette: ForgePalette) {
  paintTexture(scene, key, 34, 34, (graphics) => {
    graphics.fillStyle(0x04080d, 0.28);
    graphics.fillEllipse(17, 28, 18, 6);
    graphics.fillStyle(palette.deep, 1);
    graphics.fillCircle(17, 17, 10);
    graphics.fillStyle(palette.bright, 0.92);
    graphics.fillCircle(17, 16, 7);
    graphics.fillStyle(palette.glow, 0.28);
    graphics.fillCircle(17, 17, 13);
    graphics.lineStyle(2, palette.accent, 0.75);
    graphics.lineBetween(10, 10, 4, 5);
    graphics.lineBetween(24, 10, 30, 5);
    graphics.lineBetween(10, 24, 4, 29);
    graphics.lineBetween(24, 24, 30, 29);
    graphics.fillStyle(palette.deep, 0.9);
    graphics.fillCircle(13, 16, 2);
    graphics.fillCircle(21, 16, 2);
    graphics.lineStyle(1, palette.glow, 0.35);
    graphics.strokeCircle(17, 17, 11);
  });
}

export function generateEnemyBulwark(scene: Phaser.Scene, key: string, palette: ForgePalette) {
  paintTexture(scene, key, 50, 46, (graphics) => {
    graphics.fillStyle(0x04080d, 0.32);
    graphics.fillEllipse(24, 38, 28, 8);
    graphics.fillStyle(palette.deep, 1);
    graphics.fillRoundedRect(10, 13, 30, 22, 6);
    graphics.fillStyle(palette.mid, 0.94);
    graphics.fillRoundedRect(14, 10, 22, 26, 6);
    graphics.fillStyle(palette.accent, 0.9);
    graphics.fillTriangle(25, 4, 14, 16, 36, 16);
    graphics.fillRect(23, 14, 4, 18);
    graphics.fillStyle(palette.glow, 1);
    graphics.fillRect(19, 17, 3, 3);
    graphics.fillRect(27, 17, 3, 3);
    graphics.fillStyle(palette.deep, 1);
    graphics.fillRect(16, 32, 4, 10);
    graphics.fillRect(30, 32, 4, 10);
    graphics.lineStyle(1, palette.bright, 0.28);
    graphics.lineBetween(16, 22, 34, 22);
  });
}

export function generateNpcWarden(scene: Phaser.Scene, key: string, palette: ForgePalette) {
  paintTexture(scene, key, 48, 58, (graphics) => {
    graphics.fillStyle(0x04080d, 0.32);
    graphics.fillEllipse(24, 48, 22, 8);
    graphics.fillStyle(palette.glow, 1);
    graphics.fillCircle(24, 12, 7);
    graphics.fillStyle(palette.deep, 1);
    graphics.fillTriangle(24, 16, 12, 48, 36, 48);
    graphics.fillStyle(palette.mid, 0.96);
    graphics.fillTriangle(24, 17, 16, 42, 32, 42);
    graphics.fillRect(20, 20, 8, 14);
    graphics.fillStyle(palette.accent, 0.92);
    graphics.fillRect(22, 18, 4, 18);
    graphics.fillRect(15, 28, 18, 3);
    graphics.fillStyle(palette.deep, 1);
    graphics.fillRect(18, 42, 4, 10);
    graphics.fillRect(26, 42, 4, 10);
    graphics.lineStyle(2, palette.bright, 0.28);
    graphics.lineBetween(24, 17, 24, 48);
  });
}
