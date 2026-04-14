import { useEffect, useRef } from "react";
import { createGame } from "./createGame";
import type { BootstrapPayload, EncounterSessionState } from "../lib/types";
import type { WorldScene } from "./scenes/WorldScene";

interface GameViewportProps {
  world: BootstrapPayload;
  selectedPetId: string;
  encounters: EncounterSessionState[];
  selectedEncounterId: string;
  onSelectEncounter: (encounterId: string) => void;
}

export function GameViewport({
  world,
  selectedPetId,
  encounters,
  selectedEncounterId,
  onSelectEncounter
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
      selectedPetId,
      encounters,
      selectedEncounterId,
      onSelectEncounter
    });
    worldSceneRef.current = worldScene;

    return () => {
      worldSceneRef.current = null;
      game.destroy(true);
    };
  }, [world, onSelectEncounter]);

  useEffect(() => {
    worldSceneRef.current?.syncCombatState(encounters, selectedPetId, selectedEncounterId);
  }, [encounters, selectedEncounterId, selectedPetId]);

  return <div className="game-viewport" ref={hostRef} />;
}
