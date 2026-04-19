import { useEffect, useRef } from "react";
import { createGame } from "./createGame";
import type { BootstrapPayload, EncounterSessionState, NpcSessionState } from "../lib/types";
import type { WorldScene, WorldSceneTelemetry } from "./scenes/WorldScene";
import type { WorldSnapshot } from "./world/buildWorldSnapshot";

interface GameViewportProps {
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

export function GameViewport({
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
}: GameViewportProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const worldSceneRef = useRef<WorldScene | null>(null);

  useEffect(() => {
    if (!hostRef.current) {
      return;
    }

    const { game, worldScene } = createGame({
      host: hostRef.current,
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
    });
    worldSceneRef.current = worldScene;

    return () => {
      worldSceneRef.current = null;
      game.destroy(true);
    };
  }, [onSelectEncounter, onSelectNpc, onTelemetryChange, snapshot, world]);

  useEffect(() => {
    worldSceneRef.current?.syncCombatState(
      encounters,
      npcs,
      selectedPetId,
      selectedEncounterId,
      selectedNpcId
    );
  }, [encounters, npcs, selectedEncounterId, selectedNpcId, selectedPetId]);

  return <div className="game-viewport" ref={hostRef} />;
}
