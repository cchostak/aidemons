import Phaser from "phaser";
import type { BootstrapPayload, EncounterSessionState, NpcSessionState } from "../../lib/types";
import { AmbientEngine, type AmbientMote } from "../world/AmbientEngine";
import {
  WORLD_SIZE,
  clampWorldPoint,
  findWorldPath,
  isPointWalkable,
  type WorldPoint,
  type WorldSnapshot
} from "../world/buildWorldSnapshot";
import { createSeededRng, hashSeed, worldSeedKey } from "../world/seed";

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

interface NPCVisuals {
  sprite: Phaser.GameObjects.Image;
  shadow: Phaser.GameObjects.Ellipse;
  label: Phaser.GameObjects.Text;
  ring: Phaser.GameObjects.Ellipse;
  npcId: string;
  x: number;
  y: number;
}

export interface WorldSceneTelemetry {
  playerPosition: WorldPoint;
  petPosition: WorldPoint;
  activePath: WorldPoint[];
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
  private npcVisuals = new Map<string, NPCVisuals>();
  private pendingEncounters: EncounterSessionState[];
  private pendingNpcs: NpcSessionState[];
  private selectedEncounterId: string;
  private selectedNpcId: string;
  private selectedPetId: string;
  private activePath: WorldPoint[] = [];
  private routeGraphics?: Phaser.GameObjects.Graphics;
  private lastTelemetryTime = 0;

  constructor(
    private readonly world: BootstrapPayload,
    private readonly snapshot: WorldSnapshot,
    selectedPetId: string,
    encounters: EncounterSessionState[],
    npcs: NpcSessionState[],
    selectedEncounterId: string,
    selectedNpcId: string,
    private readonly onSelectEncounter: (encounterId: string) => void,
    private readonly onSelectNpc: (npcId: string) => void,
    private readonly onTelemetryChange: (telemetry: WorldSceneTelemetry) => void
  ) {
    super("world");
    this.selectedPetId = selectedPetId;
    this.pendingEncounters = encounters;
    this.pendingNpcs = npcs;
    this.selectedEncounterId = selectedEncounterId;
    this.selectedNpcId = selectedNpcId;
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
    const motes = new AmbientEngine(createSeededRng(hashSeed(`${shardSeed}:ambient`))).buildMotes(28);

    this.drawShardFloor(motes);
    this.spawnBiome();

    this.routeGraphics = this.add.graphics().setDepth(98);

    this.player = this.physics.add.sprite(0, 0, "avatar-frontier");
    this.player.setCollideWorldBounds(true);
    this.player.setDepth(120);

    this.pet = this.add.sprite(52, 0, this.petTextureKey());
    this.pet.setDepth(119);

    this.renderNpcs();
    this.renderEncounters();
    this.redrawRoute();

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
      .text(24, 52, "Move with WASD or click terrain. Click monsters or NPCs to interact.", {
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

    this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      const destination = clampWorldPoint({ x: pointer.worldX, y: pointer.worldY });
      const path = findWorldPath(this.snapshot, this.playerPosition(), destination);
      this.activePath = path;
      this.redrawRoute();
      this.emitTelemetry(true);
    });

    this.ready = true;
    this.emitTelemetry(true);
  }

  syncCombatState(
    encounters: EncounterSessionState[],
    npcs: NpcSessionState[],
    selectedPetId: string,
    selectedEncounterId: string,
    selectedNpcId: string
  ) {
    this.pendingEncounters = encounters;
    this.pendingNpcs = npcs;
    this.selectedPetId = selectedPetId;
    this.selectedEncounterId = selectedEncounterId;
    this.selectedNpcId = selectedNpcId;

    if (this.ready) {
      if (this.pet) {
        this.pet.setTexture(this.petTextureKey());
      }
      this.renderNpcs();
      this.renderEncounters();
      this.redrawRoute();
      this.emitTelemetry(true);
    }
  }

  update(_: number, delta: number) {
    if (!this.player || !this.cursors || !this.movementKeys) {
      return;
    }

    const keyboardDirection = new Phaser.Math.Vector2(0, 0);

    if (this.cursors.left.isDown || this.movementKeys.left.isDown) {
      keyboardDirection.x -= 1;
    }
    if (this.cursors.right.isDown || this.movementKeys.right.isDown) {
      keyboardDirection.x += 1;
    }
    if (this.cursors.up.isDown || this.movementKeys.up.isDown) {
      keyboardDirection.y -= 1;
    }
    if (this.cursors.down.isDown || this.movementKeys.down.isDown) {
      keyboardDirection.y += 1;
    }

    let direction = keyboardDirection;
    if (keyboardDirection.lengthSq() > 0) {
      this.activePath = [];
      this.redrawRoute();
    } else if (this.activePath.length > 0) {
      const waypoint = this.activePath[0];
      const vector = new Phaser.Math.Vector2(waypoint.x - this.player.x, waypoint.y - this.player.y);
      if (vector.length() <= 12) {
        this.activePath.shift();
        this.redrawRoute();
      } else {
        direction = vector.normalize();
      }
    }

    if (direction.lengthSq() > 0) {
      direction = direction.normalize().scale((MOVE_SPEED * delta) / 1000);
      const next = this.resolveMovement(direction);
      this.player.setPosition(next.x, next.y);
      this.player.rotation = Math.atan2(direction.y, direction.x);
    }

    this.player.setDepth(120 + this.player.y * 0.01);

    if (this.pet) {
      this.petAngle += delta * 0.0035;
      const orbit = 44 + Math.sin(this.time.now * 0.004) * 12;
      const nextPetPosition = {
        x: this.player.x + Math.cos(this.petAngle) * orbit,
        y: this.player.y + Math.sin(this.petAngle) * (orbit * 0.7)
      };
      this.pet.setPosition(nextPetPosition.x, nextPetPosition.y);
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

    this.npcVisuals.forEach((visual) => {
      const selected = visual.npcId === this.selectedNpcId;
      visual.ring.setVisible(selected);
      visual.shadow.setAlpha(0.16 + Math.sin(this.time.now * 0.0024 + visual.x) * 0.03);
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

    this.emitTelemetry(false);
  }

  private drawShardFloor(motes: AmbientMote[]) {
    this.add.tileSprite(0, 0, WORLD_SIZE, WORLD_SIZE, "terrain-tile").setDepth(-40);
    this.add.image(0, 0, "terrain-relic-ring").setDepth(-31).setAlpha(0.34).setScale(0.92);

    const laneGraphics = this.add.graphics().setDepth(-35);
    laneGraphics.lineStyle(26, 0x0c1825, 0.48);
    this.snapshot.routes.forEach((route) => {
      const [first, ...points] = route.points;
      laneGraphics.beginPath();
      laneGraphics.moveTo(first.x, first.y);
      points.forEach((point) => laneGraphics.lineTo(point.x, point.y));
      laneGraphics.strokePath();
    });
    laneGraphics.lineStyle(10, 0x355268, 0.26);
    this.snapshot.routes.forEach((route) => {
      const [first, ...points] = route.points;
      laneGraphics.beginPath();
      laneGraphics.moveTo(first.x, first.y);
      points.forEach((point) => laneGraphics.lineTo(point.x, point.y));
      laneGraphics.strokePath();
    });

    const haze = this.add.graphics();
    haze.fillGradientStyle(0x132232, 0x08141f, 0x040b12, 0x0c1b28, 0.9);
    haze.fillRect(-WORLD_SIZE / 2, -WORLD_SIZE / 2, WORLD_SIZE, WORLD_SIZE);
    haze.setDepth(-39);

    this.snapshot.biome.groundPatches.forEach((patch) => {
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

  private spawnBiome() {
    this.snapshot.biome.brushClusters.forEach((prop) => {
      this.add.image(prop.x, prop.y, prop.texture).setScale(prop.scale).setDepth(18 + prop.y * 0.01);
    });

    this.snapshot.biome.trees.forEach((prop) => {
      this.add.ellipse(prop.x, prop.y + 34, 58 * prop.scale, 20 * prop.scale, 0x000000, 0.22).setDepth(9);
      this.add.image(prop.x, prop.y, prop.texture).setScale(prop.scale).setDepth(36 + prop.y * 0.01);
    });

    this.snapshot.biome.crystals.forEach((prop) => {
      this.add.ellipse(prop.x, prop.y + 15, 36 * prop.scale, 12 * prop.scale, 0x000000, 0.16).setDepth(11);
      this.add.ellipse(prop.x, prop.y + 6, 26 * prop.scale, 26 * prop.scale, 0x7ce7ff, 0.06).setDepth(12);
      this.add.image(prop.x, prop.y, prop.texture).setScale(prop.scale).setDepth(28 + prop.y * 0.01);
    });

    this.snapshot.biome.obelisks.forEach((prop) => {
      this.add.ellipse(prop.x, prop.y + 20, 44 * prop.scale, 12 * prop.scale, 0x000000, 0.18).setDepth(10);
      this.add.image(prop.x, prop.y, prop.texture).setScale(prop.scale).setDepth(32 + prop.y * 0.01);

      if (prop.texture === "landmark-obelisk") {
        const marker = this.add.image(prop.x, prop.y - 36, "signal-marker").setDepth(40 + prop.y * 0.01);
        this.signalMarkers.push(marker);
      }
    });

    this.snapshot.biome.lanterns.forEach((prop) => {
      this.add.ellipse(prop.x, prop.y + 12, 34 * prop.scale, 10 * prop.scale, 0x000000, 0.16).setDepth(12);
      this.add.image(prop.x, prop.y, prop.texture).setScale(prop.scale).setDepth(30 + prop.y * 0.01);
    });

    this.snapshot.biome.pickups.forEach((pickup, index) => {
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
      sprite.on(
        "pointerdown",
        (_pointer: Phaser.Input.Pointer, _localX: number, _localY: number, event: Phaser.Types.Input.EventData) => {
          event.stopPropagation();
          this.onSelectEncounter(encounter.id);
          this.activePath = findWorldPath(this.snapshot, this.playerPosition(), {
            x: encounter.positionX,
            y: encounter.positionY
          });
          this.redrawRoute();
          this.emitTelemetry(true);
        }
      );

      const shadow = this.add.ellipse(encounter.positionX, encounter.positionY + 11, 28, 10, 0x000000, 0.13);
      const label = this.add.text(encounter.positionX - 24, encounter.positionY - 28, encounter.name, {
        fontFamily: "Exo 2",
        fontSize: "12px",
        color: "#e6edf5",
        stroke: "#051019",
        strokeThickness: 3
      });
      const healthTrack = this.add
        .rectangle(encounter.positionX - 20, encounter.positionY - 10, 40, 4, 0x0d1824, 0.9)
        .setOrigin(0, 0.5);
      const healthFill = this.add
        .rectangle(encounter.positionX - 20, encounter.positionY - 10, 40 * (encounter.health / encounter.maxHealth), 4, 0xc94f48, 0.95)
        .setOrigin(0, 0.5);
      const selectionRing = this.add
        .ellipse(encounter.positionX, encounter.positionY + 2, 30, 18, 0x6dd8ff, 0.16)
        .setVisible(encounter.id === this.selectedEncounterId);

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

  private renderNpcs() {
    this.npcVisuals.forEach((visual) => {
      visual.sprite.destroy();
      visual.shadow.destroy();
      visual.label.destroy();
      visual.ring.destroy();
    });
    this.npcVisuals.clear();

    this.pendingNpcs.forEach((npc) => {
      const sprite = this.add.image(npc.positionX, npc.positionY, "npc-warden").setInteractive({ cursor: "pointer" });
      sprite.on(
        "pointerdown",
        (_pointer: Phaser.Input.Pointer, _localX: number, _localY: number, event: Phaser.Types.Input.EventData) => {
          event.stopPropagation();
          this.onSelectNpc(npc.id);
          this.activePath = findWorldPath(this.snapshot, this.playerPosition(), {
            x: npc.positionX,
            y: npc.positionY
          });
          this.redrawRoute();
          this.emitTelemetry(true);
        }
      );

      const shadow = this.add.ellipse(npc.positionX, npc.positionY + 14, 28, 10, 0x000000, 0.18).setDepth(94);
      const label = this.add
        .text(npc.positionX - 36, npc.positionY - 34, npc.name, {
          fontFamily: "Exo 2",
          fontSize: "12px",
          color: "#d6cbac",
          stroke: "#06111a",
          strokeThickness: 3
        })
        .setDepth(98);
      const ring = this.add
        .ellipse(npc.positionX, npc.positionY + 6, 34, 18, 0xe4b866, 0.14)
        .setVisible(npc.id === this.selectedNpcId)
        .setDepth(93);

      sprite.setDepth(96 + npc.positionY * 0.01);

      this.npcVisuals.set(npc.id, {
        sprite,
        shadow,
        label,
        ring,
        npcId: npc.id,
        x: npc.positionX,
        y: npc.positionY
      });
    });
  }

  private resolveMovement(direction: Phaser.Math.Vector2) {
    if (!this.player) {
      return { x: 0, y: 0 };
    }

    const current = { x: this.player.x, y: this.player.y };
    const desired = clampWorldPoint({ x: current.x + direction.x, y: current.y + direction.y });

    if (isPointWalkable(this.snapshot, desired)) {
      return desired;
    }

    const slideX = clampWorldPoint({ x: desired.x, y: current.y });
    if (isPointWalkable(this.snapshot, slideX)) {
      return slideX;
    }

    const slideY = clampWorldPoint({ x: current.x, y: desired.y });
    if (isPointWalkable(this.snapshot, slideY)) {
      return slideY;
    }

    return current;
  }

  private redrawRoute() {
    if (!this.routeGraphics || !this.player) {
      return;
    }

    this.routeGraphics.clear();

    if (this.activePath.length === 0) {
      return;
    }

    this.routeGraphics.lineStyle(6, 0x1f5270, 0.55);
    this.routeGraphics.beginPath();
    this.routeGraphics.moveTo(this.player.x, this.player.y);
    this.activePath.forEach((point) => this.routeGraphics?.lineTo(point.x, point.y));
    this.routeGraphics.strokePath();

    this.routeGraphics.lineStyle(2, 0x8ce7ff, 0.66);
    this.routeGraphics.beginPath();
    this.routeGraphics.moveTo(this.player.x, this.player.y);
    this.activePath.forEach((point) => this.routeGraphics?.lineTo(point.x, point.y));
    this.routeGraphics.strokePath();

    this.activePath.forEach((point) => {
      this.routeGraphics?.fillStyle(0xe4b866, 0.72);
      this.routeGraphics?.fillCircle(point.x, point.y, 4);
    });
  }

  private emitTelemetry(force: boolean) {
    if (!this.player || !this.pet) {
      return;
    }

    if (!force && this.time.now - this.lastTelemetryTime < 120) {
      return;
    }

    this.lastTelemetryTime = this.time.now;
    this.onTelemetryChange({
      playerPosition: this.playerPosition(),
      petPosition: { x: this.pet.x, y: this.pet.y },
      activePath: [...this.activePath]
    });
  }

  private playerPosition() {
    return {
      x: this.player?.x ?? 0,
      y: this.player?.y ?? 0
    };
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
