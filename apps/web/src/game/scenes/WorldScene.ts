import Phaser from "phaser";
import type { BootstrapPayload, EncounterSessionState } from "../../lib/types";
import { AmbientEngine, type AmbientMote } from "../world/AmbientEngine";
import { BiomeEngine, type BiomeLayout } from "../world/BiomeEngine";
import { createSeededRng, hashSeed, worldSeedKey } from "../world/seed";

const WORLD_SIZE = 2400;
const MOVE_SPEED = 260;

interface FloatingPickup {
  image: Phaser.GameObjects.Image;
  glow: Phaser.GameObjects.Ellipse;
  baseX: number;
  baseY: number;
  phase: number;
}

interface AmbientSprite {
  shape: Phaser.GameObjects.Ellipse;
  alpha: number;
  phase: number;
}

interface EnemyVisuals {
  sprite: Phaser.GameObjects.Image;
  shadow: Phaser.GameObjects.Ellipse;
  label: Phaser.GameObjects.Text;
  healthTrack: Phaser.GameObjects.Rectangle;
  healthFill: Phaser.GameObjects.Rectangle;
  selectionRing: Phaser.GameObjects.Ellipse;
  encounterId: string;
  baseX: number;
  baseY: number;
  phase: number;
  orbitRadius: number;
}

export class WorldScene extends Phaser.Scene {
  private ready = false;
  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
  private movementKeys?: {
    up: Phaser.Input.Keyboard.Key;
    down: Phaser.Input.Keyboard.Key;
    left: Phaser.Input.Keyboard.Key;
    right: Phaser.Input.Keyboard.Key;
  };
  private player?: Phaser.Physics.Arcade.Sprite;
  private pet?: Phaser.GameObjects.Sprite;
  private petAngle = 0;
  private signalMarkers: Phaser.GameObjects.Image[] = [];
  private pickups: FloatingPickup[] = [];
  private ambientMotes: AmbientSprite[] = [];
  private enemyVisuals = new Map<string, EnemyVisuals>();
  private pendingEncounters: EncounterSessionState[];
  private selectedEncounterId: string;
  private selectedPetId: string;

  constructor(
    private readonly world: BootstrapPayload,
    selectedPetId: string,
    encounters: EncounterSessionState[],
    selectedEncounterId: string,
    private readonly onSelectEncounter: (encounterId: string) => void
  ) {
    super("world");
    this.selectedPetId = selectedPetId;
    this.pendingEncounters = encounters;
    this.selectedEncounterId = selectedEncounterId;
  }

  create() {
    this.cameras.main.setBackgroundColor("#07131f");
    this.cameras.main.setBounds(-WORLD_SIZE / 2, -WORLD_SIZE / 2, WORLD_SIZE, WORLD_SIZE);
    this.physics.world.setBounds(-WORLD_SIZE / 2, -WORLD_SIZE / 2, WORLD_SIZE, WORLD_SIZE);

    const shardSeed = hashSeed(
      worldSeedKey({
        worldName: this.world.worldName,
        regionName: this.world.region.name,
        climate: this.world.region.climate,
        hotspot: this.world.region.hotspot
      })
    );

    const biome = new BiomeEngine(this.world, createSeededRng(hashSeed(`${shardSeed}:biome`))).build();
    const motes = new AmbientEngine(createSeededRng(hashSeed(`${shardSeed}:ambient`))).buildMotes(28);

    this.drawShardFloor(biome, motes);
    this.spawnBiome(biome);

    this.player = this.physics.add.sprite(0, 0, "avatar-frontier");
    this.player.setCollideWorldBounds(true);
    this.player.setDamping(true);
    this.player.setDrag(0.88);
    this.player.setMaxVelocity(MOVE_SPEED);
    this.player.setDepth(120);

    this.pet = this.add.sprite(52, 0, this.petTextureKey());
    this.pet.setDepth(119);

    this.renderEncounters();

    this.cameras.main.startFollow(this.player, true, 0.08, 0.08);
    this.cameras.main.setZoom(1.15);

    this.add
      .text(24, 24, `${this.world.worldName} | ${this.world.region.name}`, {
        fontFamily: "Exo 2",
        fontSize: "18px",
        color: "#f7f0d4"
      })
      .setScrollFactor(0)
      .setDepth(210);

    this.add
      .text(24, 52, "Move with WASD or arrow keys. Click monsters to target.", {
        fontFamily: "Exo 2",
        fontSize: "14px",
        color: "#a9bed0"
      })
      .setScrollFactor(0)
      .setDepth(210);

    this.cursors = this.input.keyboard?.createCursorKeys();
    this.movementKeys = this.input.keyboard?.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.W,
      down: Phaser.Input.Keyboard.KeyCodes.S,
      left: Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D
    }) as WorldScene["movementKeys"];
    this.ready = true;
  }

  syncCombatState(
    encounters: EncounterSessionState[],
    selectedPetId: string,
    selectedEncounterId: string
  ) {
    this.pendingEncounters = encounters;
    this.selectedPetId = selectedPetId;
    this.selectedEncounterId = selectedEncounterId;

    if (this.ready) {
      if (this.pet) {
        this.pet.setTexture(this.petTextureKey());
      }
      this.renderEncounters();
    }
  }

  update(_: number, delta: number) {
    if (!this.player || !this.cursors || !this.movementKeys) {
      return;
    }

    const direction = new Phaser.Math.Vector2(0, 0);

    if (this.cursors.left.isDown || this.movementKeys.left.isDown) {
      direction.x -= 1;
    }
    if (this.cursors.right.isDown || this.movementKeys.right.isDown) {
      direction.x += 1;
    }
    if (this.cursors.up.isDown || this.movementKeys.up.isDown) {
      direction.y -= 1;
    }
    if (this.cursors.down.isDown || this.movementKeys.down.isDown) {
      direction.y += 1;
    }

    if (direction.lengthSq() > 0) {
      direction.normalize().scale(MOVE_SPEED);
    }

    this.player.setVelocity(direction.x, direction.y);

    if (direction.lengthSq() > 0) {
      this.player.rotation = direction.angle();
    }

    this.player.setDepth(120 + this.player.y * 0.01);

    if (this.pet) {
      this.petAngle += delta * 0.0035;
      const orbit = 44 + Math.sin(this.time.now * 0.004) * 12;
      this.pet.setPosition(
        this.player.x + Math.cos(this.petAngle) * orbit,
        this.player.y + Math.sin(this.petAngle) * (orbit * 0.7)
      );
      this.pet.setDepth(119 + this.pet.y * 0.01);
    }

    this.signalMarkers.forEach((marker, index) => {
      marker.setAlpha(0.35 + Math.sin(this.time.now * 0.004 + index) * 0.12);
      marker.setScale(0.95 + Math.sin(this.time.now * 0.0034 + index) * 0.06);
    });

    this.enemyVisuals.forEach((visual) => {
      const x = visual.baseX + Math.cos(this.time.now * 0.0014 + visual.phase) * visual.orbitRadius;
      const y = visual.baseY + Math.sin(this.time.now * 0.0012 + visual.phase) * (visual.orbitRadius * 0.6);
      const selected = visual.encounterId === this.selectedEncounterId;

      visual.sprite.setPosition(x, y);
      visual.shadow.setPosition(x, visual.baseY + 11);
      visual.label.setPosition(x - visual.label.width / 2, y - 28);
      visual.healthTrack.setPosition(x - 20, y - 10);
      visual.healthFill.setPosition(x - 20, y - 10);
      visual.selectionRing.setPosition(x, y + 2);
      visual.selectionRing.setVisible(selected);
      visual.sprite.setDepth(104 + y * 0.01);
      visual.label.setDepth(105 + y * 0.01);
      visual.healthTrack.setDepth(105 + y * 0.01);
      visual.healthFill.setDepth(106 + y * 0.01);
      visual.selectionRing.setDepth(103 + y * 0.01);
      visual.shadow.setAlpha(0.12 + Math.sin(this.time.now * 0.002 + visual.phase) * 0.03);
    });

    this.pickups.forEach((pickup) => {
      const bob = Math.sin(this.time.now * 0.0025 + pickup.phase) * 6;
      pickup.image.setPosition(pickup.baseX, pickup.baseY + bob);
      pickup.glow.setPosition(pickup.baseX, pickup.baseY + 14);
      pickup.glow.setAlpha(0.1 + Math.sin(this.time.now * 0.003 + pickup.phase) * 0.04);
    });

    this.ambientMotes.forEach((mote) => {
      mote.shape.setAlpha(mote.alpha + Math.sin(this.time.now * 0.0014 + mote.phase) * 0.025);
      mote.shape.setScale(1 + Math.sin(this.time.now * 0.001 + mote.phase) * 0.08);
    });
  }

  private drawShardFloor(biome: BiomeLayout, motes: AmbientMote[]) {
    this.add.tileSprite(0, 0, WORLD_SIZE, WORLD_SIZE, "terrain-tile").setDepth(-40);
    this.add.image(0, 0, "terrain-relic-ring").setDepth(-31).setAlpha(0.48).setScale(0.92);

    const haze = this.add.graphics();
    haze.fillGradientStyle(0x15314b, 0x07131f, 0x050d15, 0x102334, 0.86);
    haze.fillRect(-WORLD_SIZE / 2, -WORLD_SIZE / 2, WORLD_SIZE, WORLD_SIZE);
    haze.setDepth(-39);

    biome.groundPatches.forEach((patch) => {
      this.add
        .ellipse(patch.x, patch.y, patch.width, patch.height, patch.tint, patch.alpha)
        .setRotation(patch.rotation)
        .setDepth(-34);
    });

    motes.forEach((mote) => {
      const shape = this.add
        .ellipse(mote.x, mote.y, mote.radius * 2, mote.radius * 2, mote.tint, mote.alpha)
        .setDepth(-28);

      this.ambientMotes.push({
        shape,
        alpha: mote.alpha,
        phase: mote.phase
      });
    });
  }

  private spawnBiome(biome: BiomeLayout) {
    biome.brushClusters.forEach((prop) => {
      this.add.image(prop.x, prop.y, prop.texture).setScale(prop.scale).setDepth(18 + prop.y * 0.01);
    });

    biome.trees.forEach((prop) => {
      this.add.ellipse(prop.x, prop.y + 34, 58 * prop.scale, 20 * prop.scale, 0x000000, 0.18).setDepth(9);
      this.add.image(prop.x, prop.y, prop.texture).setScale(prop.scale).setDepth(36 + prop.y * 0.01);
    });

    biome.crystals.forEach((prop) => {
      this.add.ellipse(prop.x, prop.y + 15, 36 * prop.scale, 12 * prop.scale, 0x000000, 0.15).setDepth(11);
      this.add.ellipse(prop.x, prop.y + 6, 26 * prop.scale, 26 * prop.scale, 0x7ce7ff, 0.08).setDepth(12);
      this.add.image(prop.x, prop.y, prop.texture).setScale(prop.scale).setDepth(28 + prop.y * 0.01);
    });

    biome.obelisks.forEach((prop) => {
      this.add.ellipse(prop.x, prop.y + 20, 44 * prop.scale, 12 * prop.scale, 0x000000, 0.16).setDepth(10);
      this.add.image(prop.x, prop.y, prop.texture).setScale(prop.scale).setDepth(32 + prop.y * 0.01);

      if (prop.texture === "landmark-obelisk") {
        const marker = this.add.image(prop.x, prop.y - 36, "signal-marker").setDepth(40 + prop.y * 0.01);
        this.signalMarkers.push(marker);
      }
    });

    biome.lanterns.forEach((prop) => {
      this.add.ellipse(prop.x, prop.y + 12, 34 * prop.scale, 10 * prop.scale, 0x000000, 0.13).setDepth(12);
      this.add.image(prop.x, prop.y, prop.texture).setScale(prop.scale).setDepth(30 + prop.y * 0.01);
    });

    biome.pickups.forEach((pickup, index) => {
      const image = this.add.image(pickup.x, pickup.y, pickup.texture).setDepth(58 + pickup.y * 0.01);
      const glow = this.add
        .ellipse(pickup.x, pickup.y + 14, 26, 12, pickup.texture === "pickup-blade" ? 0xffd47b : 0x7ce7ff, 0.11)
        .setDepth(52 + pickup.y * 0.01);

      this.pickups.push({
        image,
        glow,
        baseX: pickup.x,
        baseY: pickup.y,
        phase: index * 0.6
      });
    });
  }

  private renderEncounters() {
    this.enemyVisuals.forEach((visual) => {
      visual.sprite.destroy();
      visual.shadow.destroy();
      visual.label.destroy();
      visual.healthTrack.destroy();
      visual.healthFill.destroy();
      visual.selectionRing.destroy();
    });
    this.enemyVisuals.clear();

    this.pendingEncounters.forEach((encounter, index) => {
      const sprite = this.add
        .image(encounter.positionX, encounter.positionY, this.textureForFamily(encounter.family))
        .setInteractive({ cursor: "pointer" });
      sprite.on("pointerdown", () => this.onSelectEncounter(encounter.id));

      const shadow = this.add.ellipse(encounter.positionX, encounter.positionY+11, 28, 10, 0x000000, 0.13);
      const label = this.add.text(encounter.positionX - 24, encounter.positionY - 28, encounter.name, {
        fontFamily: "Exo 2",
        fontSize: "12px",
        color: "#e6edf5",
        stroke: "#051019",
        strokeThickness: 3
      });
      const healthTrack = this.add.rectangle(encounter.positionX - 20, encounter.positionY - 10, 40, 4, 0x0d1824, 0.9).setOrigin(0, 0.5);
      const healthFill = this.add.rectangle(encounter.positionX - 20, encounter.positionY - 10, 40 * (encounter.health / encounter.maxHealth), 4, 0xc94f48, 0.95).setOrigin(0, 0.5);
      const selectionRing = this.add.ellipse(encounter.positionX, encounter.positionY + 2, 30, 18, 0x6dd8ff, 0.16).setVisible(encounter.id === this.selectedEncounterId);

      this.enemyVisuals.set(encounter.id, {
        sprite,
        shadow,
        label,
        healthTrack,
        healthFill,
        selectionRing,
        encounterId: encounter.id,
        baseX: encounter.positionX,
        baseY: encounter.positionY,
        phase: index * 0.7,
        orbitRadius: 10 + (index % 4) * 3
      });
    });
  }

  private textureForFamily(family: string) {
    if (family === "mite") {
      return "enemy-lantern-mite";
    }
    if (family === "bulwark") {
      return "enemy-marsh-bulwark";
    }
    return "enemy-rift-hound";
  }

  private petTextureKey() {
    if (this.selectedPetId.includes("tide")) {
      return "pet-tide";
    }

    if (this.selectedPetId.includes("verdant")) {
      return "pet-verdant";
    }

    return "pet-ember";
  }
}
