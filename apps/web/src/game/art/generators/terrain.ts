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

export function generateTerrainTile(
  scene: Phaser.Scene,
  key: string,
  palette: ForgePalette,
  rng: SeededRng
) {
  paintTexture(scene, key, 96, 96, (graphics) => {
    graphics.fillStyle(palette.base, 1);
    graphics.fillRect(0, 0, 96, 96);

    for (let i = 0; i < 52; i += 1) {
      const radius = rng.between(2, 10);
      graphics.fillStyle(i % 3 === 0 ? palette.deep : palette.mid, 0.08 + rng.float() * 0.14);
      graphics.fillEllipse(rng.between(0, 96), rng.between(0, 96), radius * 2.4, radius);
    }

    for (let i = 0; i < 18; i += 1) {
      const startX = rng.between(0, 96);
      const startY = rng.between(0, 96);
      graphics.lineStyle(1, palette.deep, 0.22);
      graphics.lineBetween(startX, startY, startX + rng.between(-18, 18), startY + rng.between(-18, 18));
    }

    for (let i = 0; i < 10; i += 1) {
      const x = rng.between(0, 96);
      const y = rng.between(0, 96);
      graphics.fillStyle(palette.glow, 0.03 + rng.float() * 0.03);
      graphics.fillRect(x, y, rng.between(8, 20), 1);
    }

    graphics.lineStyle(2, palette.deep, 0.18);
    graphics.strokeRect(0, 0, 96, 96);
  });
}

export function generateRelicRing(scene: Phaser.Scene, key: string, palette: ForgePalette) {
  paintTexture(scene, key, 540, 540, (graphics) => {
    graphics.fillStyle(palette.base, 0.08);
    graphics.fillCircle(270, 270, 240);

    graphics.lineStyle(4, palette.accent, 0.16);
    graphics.strokeCircle(270, 270, 240);

    graphics.lineStyle(1, palette.glow, 0.2);
    graphics.strokeCircle(270, 270, 180);
    graphics.strokeCircle(270, 270, 120);

    for (let i = 0; i < 8; i += 1) {
      const angle = (Math.PI * 2 * i) / 8;
      const outerX = 270 + Math.cos(angle) * 240;
      const outerY = 270 + Math.sin(angle) * 240;
      const innerX = 270 + Math.cos(angle) * 210;
      const innerY = 270 + Math.sin(angle) * 210;

      graphics.lineStyle(3, palette.glow, 0.14);
      graphics.lineBetween(innerX, innerY, outerX, outerY);
    }
  });
}

export function generateTree(scene: Phaser.Scene, key: string, palette: ForgePalette, rng: SeededRng) {
  paintTexture(scene, key, 72, 92, (graphics) => {
    graphics.fillStyle(0x4b3220, 1);
    graphics.fillRoundedRect(31, 44, 10, 36, 3);

    const crownColors = [palette.deep, palette.base, palette.mid, palette.bright] as const;
    const crownOffsets = [
      { points: [18, 50, 12, 28, 30, 22, 34, 46] },
      { points: [32, 46, 26, 20, 45, 14, 52, 38] },
      { points: [48, 50, 42, 28, 58, 26, 60, 48] },
      { points: [30, 58, 22, 34, 40, 30, 48, 56] }
    ] as const;

    crownOffsets.forEach((shape, index) => {
      graphics.fillStyle(crownColors[index], 0.9);
      graphics.fillPoints([
        new Phaser.Geom.Point(shape.points[0], shape.points[1]),
        new Phaser.Geom.Point(shape.points[2], shape.points[3]),
        new Phaser.Geom.Point(shape.points[4], shape.points[5]),
        new Phaser.Geom.Point(shape.points[6], shape.points[7])
      ], true, true);
    });

    for (let i = 0; i < 16; i += 1) {
      graphics.fillStyle(palette.glow, 0.06 + rng.float() * 0.08);
      graphics.fillCircle(rng.between(16, 56), rng.between(14, 56), rng.between(2, 5));
    }
  });
}

export function generateObelisk(scene: Phaser.Scene, key: string, palette: ForgePalette) {
  paintTexture(scene, key, 60, 104, (graphics) => {
    graphics.fillStyle(0x223446, 1);
    graphics.fillTriangle(30, 6, 16, 26, 44, 26);
    graphics.fillRect(17, 26, 26, 58);
    graphics.fillStyle(0x0f1924, 1);
    graphics.fillRect(8, 84, 44, 10);

    graphics.lineStyle(2, palette.accent, 0.6);
    graphics.lineBetween(30, 14, 30, 74);
    graphics.lineBetween(20, 36, 40, 36);
    graphics.lineStyle(4, palette.glow, 0.22);
    graphics.strokeCircle(30, 52, 8);
    graphics.lineStyle(1, palette.bright, 0.2);
    graphics.lineBetween(20, 28, 30, 18);
    graphics.lineBetween(40, 28, 30, 18);
  });
}
