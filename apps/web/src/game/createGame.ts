import Phaser from "phaser";
import type { BootstrapPayload, EncounterSessionState } from "../lib/types";
import { BootScene } from "./scenes/BootScene";
import { WorldScene } from "./scenes/WorldScene";

interface CreateGameOptions {
  host: HTMLDivElement;
  world: BootstrapPayload;
  selectedPetId: string;
  encounters: EncounterSessionState[];
  selectedEncounterId: string;
  onSelectEncounter: (encounterId: string) => void;
}

export function createGame(
  options: CreateGameOptions
) {
  const { host, world, selectedPetId, encounters, selectedEncounterId, onSelectEncounter } = options;
  const width = host.clientWidth || 960;
  const height = host.clientHeight || 560;
  const worldScene = new WorldScene(world, selectedPetId, encounters, selectedEncounterId, onSelectEncounter);

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
