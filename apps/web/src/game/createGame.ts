import Phaser from "phaser";
import type { BootstrapPayload, EncounterSessionState, NpcSessionState } from "../lib/types";
import { BootScene } from "./scenes/BootScene";
import { WorldScene } from "./scenes/WorldScene";
import type { WorldSceneTelemetry } from "./scenes/WorldScene";
import type { WorldSnapshot } from "./world/buildWorldSnapshot";

interface CreateGameOptions {
  host: HTMLDivElement;
  world: BootstrapPayload;
  snapshot: WorldSnapshot;
  selectedPetId: string;
  encounters: EncounterSessionState[];
  npcs: NpcSessionState[];
  selectedEncounterId: string;
  selectedNpcId: string;
  onSelectEncounter: (encounterId: string) => void;
  onSelectNpc: (npcId: string) => void;
  onTelemetryChange: (telemetry: WorldSceneTelemetry) => void;
}

export function createGame(
  options: CreateGameOptions
) {
  const {
    host,
    world,
    snapshot,
    selectedPetId,
    encounters,
    npcs,
    selectedEncounterId,
    selectedNpcId,
    onSelectEncounter,
    onSelectNpc,
    onTelemetryChange
  } = options;
  const width = host.clientWidth || 960;
  const height = host.clientHeight || 560;
  const worldScene = new WorldScene(
    world,
    snapshot,
    selectedPetId,
    encounters,
    npcs,
    selectedEncounterId,
    selectedNpcId,
    onSelectEncounter,
    onSelectNpc,
    onTelemetryChange
  );

  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: host,
    width,
    height,
    backgroundColor: "#07131f",
    scale: {
      mode: Phaser.Scale.RESIZE,
      autoCenter: Phaser.Scale.CENTER_BOTH
    },
    scene: [new BootScene(world), worldScene],
    physics: {
      default: "arcade",
      arcade: {
        gravity: { x: 0, y: 0 },
        debug: false
      }
    }
  });

  return { game, worldScene };
}
