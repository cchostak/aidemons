import { startTransition, useEffect, useMemo, useState, type ReactNode } from "react";
import { GameViewport } from "./game/GameViewport";
import type { WorldSceneTelemetry } from "./game/scenes/WorldScene";
import {
  WORLD_SIZE,
  buildWorldSnapshot,
  worldToMinimap,
  type WorldSnapshot
} from "./game/world/buildWorldSnapshot";
import { fallbackWorld } from "./lib/fallbackWorld";
import { apiUrl, websocketUrl } from "./lib/network";
import type {
  BootstrapPayload,
  CombatActionResult,
  MutationResult,
  NpcInteractionResult,
  NpcSessionState,
  PetSessionState,
  SessionState,
  SkillSessionState
} from "./lib/types";
import { useGameStore } from "./lib/useGameStore";

const macroSlots = [
  { keybind: "1", label: "Potion", tone: "gold" },
  { keybind: "2", label: "Recall", tone: "blue" },
  { keybind: "3", label: "Mount", tone: "green" },
  { keybind: "4", label: "Ward", tone: "gold" },
  { keybind: "5", label: "Empty", tone: "muted" },
  { keybind: "6", label: "Empty", tone: "muted" },
  { keybind: "7", label: "Gem", tone: "blue" },
  { keybind: "8", label: "Scroll", tone: "gold" },
  { keybind: "9", label: "Charm", tone: "green" },
  { keybind: "0", label: "Empty", tone: "muted" }
] as const;

const fallbackSkills: SkillSessionState[] = [
  { id: "slash", label: "Slash", keybind: "F1", tone: "ruby", category: "melee", manaCost: 8, cooldown: 0, maxCooldown: 1 },
  { id: "blink", label: "Blink", keybind: "F2", tone: "blue", category: "mobility", manaCost: 12, cooldown: 0, maxCooldown: 2 },
  { id: "burst", label: "Burst", keybind: "F3", tone: "green", category: "strike", manaCost: 18, cooldown: 0, maxCooldown: 3 },
  { id: "veil", label: "Veil", keybind: "F4", tone: "gold", category: "guard", manaCost: 14, cooldown: 0, maxCooldown: 2 },
  { id: "dash", label: "Dash", keybind: "F5", tone: "blue", category: "mobility", manaCost: 10, cooldown: 0, maxCooldown: 2 },
  { id: "call", label: "Call", keybind: "F6", tone: "green", category: "pet", manaCost: 16, cooldown: 0, maxCooldown: 3 },
  { id: "awaken", label: "Awaken", keybind: "F7", tone: "gold", category: "ultimate", manaCost: 22, cooldown: 0, maxCooldown: 4 },
  { id: "forge", label: "Forge", keybind: "F8", tone: "ruby", category: "channel", manaCost: 20, cooldown: 0, maxCooldown: 3 }
];

const systemDock = ["Bag", "Quest", "Guild", "Chat", "Pet"] as const;
type UtilityPanel = (typeof systemDock)[number] | "PathFinding" | "NPC";

function HudFrame({
  className = "",
  children
}: {
  className?: string;
  children: ReactNode;
}) {
  return <section className={`hud-frame ${className}`.trim()}>{children}</section>;
}

function Meter({
  label,
  value,
  tone
}: {
  label: string;
  value: number;
  tone: "red" | "blue" | "green" | "gold";
}) {
  return (
    <div className="meter">
      <div className="meter-topline">
        <span>{label}</span>
        <strong>{value}%</strong>
      </div>
      <div className="meter-track">
        <div className={`meter-fill ${tone}`} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

function StatusPlate({
  initials,
  name,
  subtitle,
  level,
  tone,
  children
}: {
  initials: string;
  name: string;
  subtitle: string;
  level: number;
  tone: "hero" | "pet" | "target";
  children: ReactNode;
}) {
  return (
    <HudFrame className={`status-plate ${tone}`}>
      <div className="status-portrait">
        <span>{initials}</span>
        <small>{level}</small>
      </div>
      <div className="status-body">
        <div className="status-topline">
          <strong>{name}</strong>
          <span>Lv {level}</span>
        </div>
        <p>{subtitle}</p>
        {children}
      </div>
    </HudFrame>
  );
}

function MacroSlot({
  keybind,
  label,
  tone,
  onClick
}: {
  keybind: string;
  label: string;
  tone: string;
  onClick: () => void;
}) {
  return (
    <button className={`macro-slot ${tone}`} onClick={onClick} type="button">
      <span>{keybind}</span>
      <small>{label}</small>
    </button>
  );
}

function ActionSlot({
  skill,
  disabled,
  onClick
}: {
  skill: SkillSessionState;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      className={`action-slot ${skill.tone}${disabled ? " disabled" : ""}`}
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      <span className="action-keybind">{skill.keybind}</span>
      <span className="action-label">{skill.label}</span>
      <small className="action-meta">
        MP {skill.manaCost}
        {skill.cooldown > 0 ? ` • CD ${skill.cooldown}` : ` • ${skill.category}`}
      </small>
    </button>
  );
}

function MinimapPanel({
  snapshot,
  telemetry,
  encounters,
  npcs,
  selectedNpcId,
  selectedEncounterId
}: {
  snapshot: WorldSnapshot;
  telemetry: WorldSceneTelemetry;
  encounters: SessionState["encounters"];
  npcs: NpcSessionState[];
  selectedNpcId: string;
  selectedEncounterId: string;
}) {
  const size = 154;

  return (
    <div className="minimap-orb">
      <svg className="minimap-svg" viewBox={`0 0 ${size} ${size}`} xmlns="http://www.w3.org/2000/svg">
        <defs>
          <radialGradient id="mapGlow" cx="35%" cy="30%">
            <stop offset="0%" stopColor="#4a7f55" />
            <stop offset="100%" stopColor="#15222b" />
          </radialGradient>
        </defs>

        <circle cx={size / 2} cy={size / 2} fill="url(#mapGlow)" r={size / 2} />

        {snapshot.biome.groundPatches.map((patch, index) => {
          const center = worldToMinimap({ x: patch.x, y: patch.y }, size);
          return (
            <ellipse
              cx={center.x}
              cy={center.y}
              fill={`#${patch.tint.toString(16).padStart(6, "0")}`}
              key={`patch-${index}`}
              opacity={Math.min(0.35, patch.alpha * 2.2)}
              rx={(patch.width / WORLD_SIZE) * size * 0.5}
              ry={(patch.height / WORLD_SIZE) * size * 0.5}
              transform={`rotate(${(patch.rotation * 180) / Math.PI} ${center.x} ${center.y})`}
            />
          );
        })}

        {snapshot.routes.map((route) => (
          <polyline
            fill="none"
            key={route.id}
            points={route.points.map((point) => {
              const mapped = worldToMinimap(point, size);
              return `${mapped.x},${mapped.y}`;
            }).join(" ")}
            stroke="#587269"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeOpacity="0.58"
            strokeWidth={Math.max(2.5, (route.width / WORLD_SIZE) * size * 2)}
          />
        ))}

        {telemetry.activePath.length > 0 ? (
          <polyline
            fill="none"
            points={[telemetry.playerPosition, ...telemetry.activePath].map((point) => {
              const mapped = worldToMinimap(point, size);
              return `${mapped.x},${mapped.y}`;
            }).join(" ")}
            stroke="#f0c06c"
            strokeDasharray="3 3"
            strokeLinecap="round"
            strokeOpacity="0.9"
            strokeWidth="2"
          />
        ) : null}

        {snapshot.obstacles.map((obstacle, index) => {
          const mapped = worldToMinimap({ x: obstacle.x, y: obstacle.y }, size);
          return (
            <circle
              cx={mapped.x}
              cy={mapped.y}
              fill={obstacle.kind === "tree" ? "#1b3524" : obstacle.kind === "crystal" ? "#1e4754" : "#3d3022"}
              key={`obstacle-${index}`}
              opacity="0.75"
              r={(obstacle.radius / WORLD_SIZE) * size}
            />
          );
        })}

        {npcs.map((npc) => {
          const mapped = worldToMinimap({ x: npc.positionX, y: npc.positionY }, size);
          return (
            <circle
              cx={mapped.x}
              cy={mapped.y}
              fill={npc.id === selectedNpcId ? "#f0c06c" : "#d6d0bf"}
              key={npc.id}
              r={npc.id === selectedNpcId ? 4.2 : 3}
            />
          );
        })}

        {encounters.map((encounter) => {
          const mapped = worldToMinimap({ x: encounter.positionX, y: encounter.positionY }, size);
          return (
            <circle
              cx={mapped.x}
              cy={mapped.y}
              fill={encounter.id === selectedEncounterId ? "#ff8e73" : "#bf5046"}
              key={encounter.id}
              r={encounter.id === selectedEncounterId ? 4 : 2.6}
            />
          );
        })}

        <circle cx={worldToMinimap(telemetry.petPosition, size).x} cy={worldToMinimap(telemetry.petPosition, size).y} fill="#54d0ff" r="3" />
        <circle cx={worldToMinimap(telemetry.playerPosition, size).x} cy={worldToMinimap(telemetry.playerPosition, size).y} fill="#f5d07b" r="4.2" />
      </svg>
      <div className="map-ring" />
    </div>
  );
}

export default function App() {
  const [world, setWorld] = useState<BootstrapPayload>(fallbackWorld);
  const [session, setSession] = useState<SessionState | null>(null);
  const [source, setSource] = useState<"api" | "fallback">("fallback");
  const [loading, setLoading] = useState(true);
  const [socketState, setSocketState] = useState<"connecting" | "open" | "closed">("connecting");
  const [onlineCount, setOnlineCount] = useState<number | null>(null);
  const [combatBusy, setCombatBusy] = useState(false);
  const [activePanel, setActivePanel] = useState<UtilityPanel | null>(null);
  const [selectedTargetId, setSelectedTargetId] = useState("");
  const [selectedNpcId, setSelectedNpcId] = useState("");
  const [chatTab, setChatTab] = useState<"System" | "Talk" | "Guild">("System");
  const [actionReadout, setActionReadout] = useState("HUD standing by.");
  const [npcInteraction, setNpcInteraction] = useState<NpcInteractionResult | null>(null);
  const [worldTelemetry, setWorldTelemetry] = useState<WorldSceneTelemetry>({
    playerPosition: { x: 0, y: 0 },
    petPosition: { x: 52, y: 0 },
    activePath: []
  });

  const selectedPetId = useGameStore((state) => state.selectedPetId);
  const setSelectedPetId = useGameStore((state) => state.setSelectedPetId);
  const snapshot = useMemo(() => buildWorldSnapshot(world), [world]);

  useEffect(() => {
    let disposed = false;

    async function loadBootstrap() {
      try {
        const response = await fetch(apiUrl("/api/v1/world/bootstrap"));
        if (!response.ok) {
          throw new Error(`Bootstrap request failed with ${response.status}`);
        }

        const payload = (await response.json()) as BootstrapPayload;
        if (disposed) {
          return;
        }

        startTransition(() => {
          setWorld(payload);
          setSource("api");
        });
      } catch {
        if (disposed) {
          return;
        }

        startTransition(() => {
          setWorld(fallbackWorld);
          setSource("fallback");
        });
      } finally {
        if (!disposed) {
          setLoading(false);
        }
      }
    }

    void loadBootstrap();

    return () => {
      disposed = true;
    };
  }, []);

  useEffect(() => {
    let disposed = false;

    async function loadSession() {
      try {
        const response = await fetch(apiUrl("/api/v1/session/state"));
        if (!response.ok) {
          throw new Error(`Session request failed with ${response.status}`);
        }

        const payload = (await response.json()) as SessionState;
        if (disposed) {
          return;
        }

        startTransition(() => {
          setSession(payload);
          setSelectedTargetId(payload.encounters[0]?.id ?? "");
          setSelectedPetId(payload.player.bondedPetId);
        });
      } catch {
        if (!disposed) {
          setActionReadout("Session shard unavailable. Combat systems standing by.");
        }
      }
    }

    void loadSession();

    return () => {
      disposed = true;
    };
  }, [setSelectedPetId]);

  useEffect(() => {
    const socket = new WebSocket(websocketUrl("/ws"));

    socket.addEventListener("open", () => {
      setSocketState("open");
    });

    socket.addEventListener("message", (event) => {
      try {
        const payload = JSON.parse(event.data) as { type?: string; online?: number };

        if (payload.type === "world:welcome" && typeof payload.online === "number") {
          setOnlineCount(payload.online);
        }
      } catch {
        // Ignore malformed socket payloads until the realtime protocol settles.
      }
    });

    const handleClosed = () => {
      setSocketState("closed");
    };

    socket.addEventListener("close", handleClosed);
    socket.addEventListener("error", handleClosed);

    return () => {
      socket.removeEventListener("close", handleClosed);
      socket.removeEventListener("error", handleClosed);
      socket.close();
    };
  }, []);

  useEffect(() => {
    if (!session) {
      return;
    }

    const activePetStillExists = session.pets.some((pet) => pet.id === selectedPetId);
    if (!activePetStillExists) {
      setSelectedPetId(session.player.bondedPetId);
    }
  }, [selectedPetId, session, setSelectedPetId]);

  useEffect(() => {
    if (!session) {
      return;
    }

    const selectedTargetStillExists = session.encounters.some((encounter) => encounter.id === selectedTargetId);
    if (!selectedTargetStillExists) {
      setSelectedTargetId(session.encounters[0]?.id ?? "");
    }
  }, [selectedTargetId, session]);

  useEffect(() => {
    if (!session) {
      return;
    }

    const selectedNpcStillExists = session.npcs.some((npc) => npc.id === selectedNpcId);
    if (!selectedNpcStillExists) {
      setSelectedNpcId("");
      setNpcInteraction(null);
    }
  }, [selectedNpcId, session]);

  useEffect(() => {
    if (!selectedNpcId) {
      return;
    }

    let disposed = false;

    async function interact() {
      try {
        const response = await fetch(apiUrl("/api/v1/npcs/interact"), {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ npcId: selectedNpcId })
        });

        if (!response.ok) {
          throw new Error(`NPC request failed with ${response.status}`);
        }

        const payload = (await response.json()) as NpcInteractionResult;
        if (disposed) {
          return;
        }

        setSession(payload.state);
        setNpcInteraction(payload);
        setActivePanel("NPC");
        setActionReadout(payload.log.join(" "));
      } catch {
        if (!disposed) {
          setActionReadout("NPC channel is not answering right now.");
        }
      }
    }

    void interact();

    return () => {
      disposed = true;
    };
  }, [selectedNpcId]);

  const selectedPetState =
    session?.pets.find((pet) => pet.id === selectedPetId) ??
    session?.pets.find((pet) => pet.active) ??
    null;
  const selectedPetMeta =
    world.starterPets.find((pet) => pet.id === selectedPetState?.id) ??
    world.starterPets.find((pet) => pet.id === selectedPetId) ??
    world.starterPets[0];
  const selectedPet = {
    ...selectedPetMeta,
    ...(selectedPetState ?? {})
  } as PetSessionState & Partial<BootstrapPayload["starterPets"][number]>;

  const petInitials = (selectedPet?.name ?? "Pet")
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  const currentTarget =
    session?.encounters.find((encounter) => encounter.id === selectedTargetId) ?? session?.encounters[0];
  const currentNpc = session?.npcs.find((npc) => npc.id === selectedNpcId) ?? null;
  const skills = session?.skills ?? fallbackSkills;

  const trackerLines = [
    `Sweep ${world.region.hotspot} and stabilize the relic lane.`,
    currentNpc ? `Consult ${currentNpc.name} for ${currentNpc.services[0] ?? "field guidance"}.` : `Featured queue: ${world.pvpQueues[0]?.name ?? "Skytrial"} ready.`,
    `Expected drop: ${world.featuredLoot[0]?.name ?? "Aurora Blade"}.`
  ];

  const heroHealthPct = session ? Math.round((session.player.health / session.player.maxHealth) * 100) : 96;
  const heroManaPct = session ? Math.round((session.player.mana / session.player.maxMana) * 100) : 72;
  const heroExpPct = session ? Math.round((session.player.exp / session.player.expToNext) * 100) : 64;
  const petHealthPct = selectedPetState ? Math.round((selectedPetState.health / selectedPetState.maxHealth) * 100) : 88;
  const petExpPct = selectedPetState ? Math.round((selectedPetState.exp / selectedPetState.expToNext) * 100) : 62;

  const uplinkStatus =
    socketState === "open"
      ? `Shard uplink live${onlineCount ? ` (${onlineCount} online)` : ""}.`
      : source === "api"
        ? "Shard uplink retrying."
        : "Frontend fallback cache active.";

  const chatLines = [
    `System: ${world.region.currentEvent}`,
    `${selectedPet?.name ?? "Companion"} bond response stable.`,
    `System: ${world.shardStatus}`,
    `System: ${uplinkStatus}`,
    session
      ? `System: ${session.encounters.length} active threats and ${session.npcs.length} field NPCs in ${world.region.hotspot}.`
      : "System: Combat session not initialized yet.",
    worldTelemetry.activePath.length > 0
      ? `System: Route plotted through ${worldTelemetry.activePath.length} navigation nodes.`
      : "System: Click the field to chart a route.",
    `System: Frontend synced against the Gin shard service.`
  ];

  const talkLines = [
    "Talk: Gamers says to all hi.",
    currentNpc ? `Talk: ${currentNpc.name} is briefing patrols near the crossing.` : "Talk: Arena scouts are accepting challengers.",
    "Talk: Forming a relic patrol near Starforge Crossing."
  ];

  const guildLines = [
    "Guild: Vanguard queue opens in 14 minutes.",
    "Guild: Bond training in the south grove.",
    "Guild: Storehouse updated with ember crests."
  ];

  const chatTabLines =
    chatTab === "Talk" ? talkLines : chatTab === "Guild" ? guildLines : chatLines;

  const togglePanel = (panel: UtilityPanel) => {
    setActivePanel((current) => (current === panel ? null : panel));
  };

  const announceAction = (message: string) => {
    setActionReadout(message);
  };

  const applyMutation = (payload: MutationResult) => {
    setSession(payload.state);
    setSelectedPetId(payload.state.player.bondedPetId);
    setActionReadout(payload.log.join(" "));
  };

  const performCombatAction = async (actionId: string, label: string) => {
    if (!session) {
      setActionReadout("Combat session is still syncing.");
      return;
    }

    if (!selectedTargetId && actionId !== "potion") {
      setActionReadout("Select a target in the field first.");
      return;
    }

    setCombatBusy(true);

    try {
      const response = await fetch(apiUrl("/api/v1/combat/action"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          actionId,
          targetId: selectedTargetId
        })
      });

      if (!response.ok) {
        throw new Error(`Combat request failed with ${response.status}`);
      }

      const payload = (await response.json()) as CombatActionResult;
      setSession(payload.state);
      setSelectedTargetId(payload.activeTargetId);
      setSelectedPetId(payload.state.player.bondedPetId);
      setActionReadout(payload.log.join(" "));
    } catch {
      setActionReadout(`${label} failed to resolve against the shard service.`);
    } finally {
      setCombatBusy(false);
    }
  };

  const selectPet = async (petId: string) => {
    try {
      const response = await fetch(apiUrl("/api/v1/pets/select"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ petId })
      });

      if (!response.ok) {
        throw new Error(`Pet request failed with ${response.status}`);
      }

      const payload = (await response.json()) as MutationResult;
      applyMutation(payload);
    } catch {
      setActionReadout("Pet channel swap failed.");
    }
  };

  const evolvePet = async () => {
    if (!selectedPetState) {
      return;
    }

    try {
      const response = await fetch(apiUrl("/api/v1/pets/evolve"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ petId: selectedPetState.id })
      });

      if (!response.ok) {
        throw new Error(`Evolution request failed with ${response.status}`);
      }

      const payload = (await response.json()) as MutationResult;
      applyMutation(payload);
    } catch {
      setActionReadout("Evolution rite is not ready yet.");
    }
  };

  useEffect(() => {
    const textEntryTags = new Set(["INPUT", "TEXTAREA", "SELECT"]);

    const isTextEntryTarget = (target: EventTarget | null) => {
      if (!(target instanceof HTMLElement)) {
        return false;
      }

      return textEntryTags.has(target.tagName) || target.isContentEditable;
    };

    const runMacro = (key: string) => {
      const slot = macroSlots.find((macroSlot) => macroSlot.keybind === key);
      if (!slot) {
        return false;
      }

      if (slot.label === "Potion") {
        void performCombatAction("potion", slot.label);
        return true;
      }

      announceAction(`${slot.keybind} ${slot.label} ready.`);
      return true;
    };

    const runSkill = (key: string) => {
      const skill = skills.find((candidate) => candidate.keybind.toLowerCase() === key.toLowerCase());
      if (!skill) {
        return false;
      }

      if (combatBusy) {
        announceAction(`${skill.label} is already resolving.`);
        return true;
      }

      if (skill.cooldown > 0) {
        announceAction(`${skill.label} cooling down for ${skill.cooldown} turns.`);
        return true;
      }

      if (session && session.player.mana < skill.manaCost) {
        announceAction(`${skill.label} needs ${skill.manaCost} MP.`);
        return true;
      }

      void performCombatAction(skill.id, skill.label);
      return true;
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.repeat || isTextEntryTarget(event.target)) {
        return;
      }

      const macroKey = event.code.startsWith("Digit")
        ? event.code.replace("Digit", "")
        : event.code.startsWith("Numpad")
          ? event.code.replace("Numpad", "")
          : "";
      const handledMacro = macroKey ? runMacro(macroKey) : false;
      const handledSkill = event.key.startsWith("F") ? runSkill(event.key) : false;

      if (handledMacro || handledSkill) {
        event.preventDefault();
        event.stopPropagation();
      }
    };

    window.addEventListener("keydown", handleKeyDown, { capture: true });

    return () => {
      window.removeEventListener("keydown", handleKeyDown, { capture: true });
    };
  }, [combatBusy, performCombatAction, session, skills]);

  const pathDestination = worldTelemetry.activePath.at(-1);
  const activePanelTitle =
    activePanel === "PathFinding"
      ? "PathFinding"
      : activePanel === "NPC"
        ? currentNpc?.name ?? npcInteraction?.npc.name ?? "NPC"
        : activePanel;

  return (
    <div className="client-shell">
      <section className="world-stage">
        <GameViewport
          encounters={session?.encounters ?? []}
          npcs={session?.npcs ?? []}
          onSelectEncounter={setSelectedTargetId}
          onSelectNpc={setSelectedNpcId}
          onTelemetryChange={setWorldTelemetry}
          selectedEncounterId={selectedTargetId}
          selectedNpcId={selectedNpcId}
          selectedPetId={selectedPet?.id ?? ""}
          snapshot={snapshot}
          world={world}
        />
        <div className="screen-vignette" />
        <div className="screen-glow" />

        <div className="hud-top-left">
          <StatusPlate
            initials="FW"
            level={session?.player.level ?? 34}
            name={session?.player.name ?? "Frontier Warden"}
            subtitle={`${world.region.name} | ${session?.player.class ?? "Riftblade"}`}
            tone="hero"
          >
            <Meter label="HP" tone="red" value={heroHealthPct} />
            <Meter label="MP" tone="blue" value={heroManaPct} />
            <Meter label="XP" tone="green" value={heroExpPct} />
          </StatusPlate>

          <StatusPlate
            initials={petInitials}
            level={selectedPetState?.level ?? session?.player.bondedPetLevel ?? 12}
            name={selectedPet?.name ?? "Companion"}
            subtitle={`${selectedPet?.role ?? "Bonded unit"} | ${selectedPet?.stage ?? selectedPet?.affinity ?? "neutral"}`}
            tone="pet"
          >
            <Meter label="Link" tone="gold" value={selectedPetState?.bond ?? session?.player.bond ?? 88} />
            <Meter label="Drive" tone="green" value={selectedPetState?.drive ?? session?.player.drive ?? 77} />
            <Meter label="Vital" tone="blue" value={petHealthPct} />
          </StatusPlate>

          <HudFrame className="buff-strip">
            <span>BP {session ? Math.max(1, Math.round(session.player.power / 632)) : 3}</span>
            <span>PK Off</span>
            <span>{selectedPet?.stage ?? "Bonded"}</span>
            <span>{selectedPetState?.evolutionReady ? "Evolve" : "Mount"}</span>
          </HudFrame>
        </div>

        <div className="hud-top-center">
          <StatusPlate
            initials={(currentTarget?.name ?? "Target")
              .split(" ")
              .slice(0, 2)
              .map((part) => part[0])
              .join("")
              .toUpperCase()}
            level={currentTarget?.level ?? 0}
            name={currentTarget?.name ?? "No Target"}
            subtitle={
              currentTarget
                ? `${world.region.hotspot} | ${currentTarget.family} pack`
                : currentNpc
                  ? `${currentNpc.title} | ${currentNpc.role}`
                  : `${world.region.hotspot} | Select a target`
            }
            tone="target"
          >
            <Meter
              label={currentTarget ? "Threat" : "Focus"}
              tone="gold"
              value={currentTarget ? Math.round((currentTarget.health / currentTarget.maxHealth) * 100) : 0}
            />
          </StatusPlate>
        </div>

        <div className="hud-top-right">
          <HudFrame className="minimap-frame">
            <div className="map-header">
              <span>{world.region.hotspot}</span>
              <span>
                {Math.round(worldTelemetry.playerPosition.x)} {Math.round(worldTelemetry.playerPosition.y)}
              </span>
            </div>

            <MinimapPanel
              encounters={session?.encounters ?? []}
              npcs={session?.npcs ?? []}
              selectedEncounterId={selectedTargetId}
              selectedNpcId={selectedNpcId}
              snapshot={snapshot}
              telemetry={worldTelemetry}
            />

            <button
              className={`path-button${activePanel === "PathFinding" ? " active" : ""}`}
              onClick={() => togglePanel("PathFinding")}
              type="button"
            >
              PathFinding
            </button>
          </HudFrame>
        </div>

        <HudFrame className="chat-console">
          <div className="chat-tabs">
            <button
              className={chatTab === "System" ? "active" : ""}
              onClick={() => setChatTab("System")}
              type="button"
            >
              System
            </button>
            <button
              className={chatTab === "Talk" ? "active" : ""}
              onClick={() => setChatTab("Talk")}
              type="button"
            >
              Talk
            </button>
            <button
              className={chatTab === "Guild" ? "active" : ""}
              onClick={() => setChatTab("Guild")}
              type="button"
            >
              Guild
            </button>
          </div>

          <div className="chat-lines">
            {chatTabLines.map((line) => (
              <p key={line}>{line}</p>
            ))}
          </div>
        </HudFrame>

        <HudFrame className="bond-console">
          <div className="bond-console-head">
            <div className="bond-portrait">{petInitials}</div>
            <div className="bond-summary">
              <p className="frame-label">Bond Focus</p>
              <strong>{selectedPet?.name ?? "Companion"}</strong>
              <span>
                {selectedPet?.stage ?? selectedPet?.affinity ?? "neutral"} | Link {selectedPetState?.bond ?? 88}%
              </span>
            </div>
          </div>

          <p className="bond-copy">{selectedPet?.blurb ?? world.tip}</p>

          <div className="pet-evolution-panel">
            <div>
              <p className="frame-label">Evolution</p>
              <strong>{selectedPetState?.evolutionName ?? selectedPet?.evolutionHint ?? "Awaiting rite"}</strong>
              <span className="pet-stage-line">
                {selectedPetState?.evolutionReady
                  ? "Evolution rite available now."
                  : selectedPet?.evolutionHint ?? world.tip}
              </span>
            </div>
            <button
              className={`evolve-button${selectedPetState?.evolutionReady ? " ready" : ""}`}
              disabled={!selectedPetState?.evolutionReady}
              onClick={() => void evolvePet()}
              type="button"
            >
              Evolve
            </button>
          </div>

          <div className="pet-meter-grid">
            <Meter label="Pet XP" tone="green" value={petExpPct} />
            <Meter label="Bond" tone="gold" value={selectedPetState?.bond ?? 88} />
          </div>

          <div className="pet-roster">
            {(session?.pets ?? []).map((pet) => (
              <button
                className={`pet-roster-button${pet.id === selectedPetState?.id ? " active" : ""}`}
                key={pet.id}
                onClick={() => void selectPet(pet.id)}
                type="button"
              >
                <strong>{pet.name}</strong>
                <span>
                  {pet.stage} • Lv {pet.level}
                </span>
              </button>
            ))}
          </div>

          <div className="skill-chip-row">
            {(selectedPetState?.skills ?? selectedPet?.skills ?? []).map((skill) => (
              <span className="skill-chip" key={skill}>
                {skill}
              </span>
            ))}
          </div>
        </HudFrame>

        {activePanel ? (
          <HudFrame className="utility-window">
            <div className="utility-window-head">
              <div>
                <p className="frame-label">Utility Window</p>
                <strong>{activePanelTitle}</strong>
              </div>
              <button className="window-close" onClick={() => setActivePanel(null)} type="button">
                x
              </button>
            </div>

            {activePanel === "Bag" ? (
              <div className="utility-list">
                {world.featuredLoot.map((loot) => (
                  <article className="utility-card" key={loot.id}>
                    <strong>{loot.name}</strong>
                    <span>
                      {loot.slot} • {loot.rarity}
                    </span>
                    <p>{loot.effect}</p>
                  </article>
                ))}
              </div>
            ) : null}

            {activePanel === "Quest" ? (
              <div className="utility-list">
                {trackerLines.map((line) => (
                  <article className="utility-card" key={line}>
                    <strong>Active Objective</strong>
                    <p>{line}</p>
                  </article>
                ))}
                {session?.npcs.map((npc) => (
                  <article className="utility-card" key={npc.id}>
                    <strong>{npc.name}</strong>
                    <span>{npc.title}</span>
                    <p>{npc.summary}</p>
                  </article>
                ))}
              </div>
            ) : null}

            {activePanel === "Guild" ? (
              <div className="utility-list">
                {world.pvpQueues.map((queue) => (
                  <article className="utility-card" key={queue.id}>
                    <strong>{queue.name}</strong>
                    <span>{queue.rewardFocus}</span>
                    <p>{queue.ruleset}</p>
                  </article>
                ))}
              </div>
            ) : null}

            {activePanel === "Chat" ? (
              <div className="utility-list">
                {[actionReadout, ...chatTabLines].map((line) => (
                  <article className="utility-card" key={line}>
                    <p>{line}</p>
                  </article>
                ))}
              </div>
            ) : null}

            {activePanel === "Pet" ? (
              <div className="utility-list">
                {(session?.pets ?? []).map((pet) => (
                  <article className="utility-card" key={pet.id}>
                    <strong>{pet.name}</strong>
                    <span>
                      {pet.stage} • Lv {pet.level} • {pet.affinity}
                    </span>
                    <p>{pet.evolutionReady ? `Evolution ready: ${pet.evolutionName}.` : pet.evolutionHint}</p>
                  </article>
                ))}
              </div>
            ) : null}

            {activePanel === "NPC" ? (
              <div className="utility-list">
                {npcInteraction ? (
                  <>
                    <article className="utility-card">
                      <strong>{npcInteraction.npc.name}</strong>
                      <span>
                        {npcInteraction.npc.title} • {npcInteraction.npc.role}
                      </span>
                      <p>{npcInteraction.npc.summary}</p>
                    </article>
                    {npcInteraction.log.map((line) => (
                      <article className="utility-card" key={line}>
                        <p>{line}</p>
                      </article>
                    ))}
                  </>
                ) : (
                  <article className="utility-card">
                    <p>Select an NPC in the field to open their service window.</p>
                  </article>
                )}
              </div>
            ) : null}

            {activePanel === "PathFinding" ? (
              <div className="utility-list">
                <article className="utility-card">
                  <strong>{world.region.hotspot}</strong>
                  <span>
                    Position: {Math.round(worldTelemetry.playerPosition.x)}, {Math.round(worldTelemetry.playerPosition.y)}
                  </span>
                  <p>Click any reachable point in the field to route around collision blockers and lane structures.</p>
                </article>
                <article className="utility-card">
                  <strong>Current route</strong>
                  <p>
                    {pathDestination
                      ? `Destination locked at ${Math.round(pathDestination.x)}, ${Math.round(pathDestination.y)} across ${worldTelemetry.activePath.length} nodes.`
                      : "No active route. Click terrain, an NPC, or a monster to chart one."}
                  </p>
                </article>
              </div>
            ) : null}
          </HudFrame>
        ) : null}

        <div className="bottom-hud">
          <HudFrame className="exp-bar">
            <span>
              Exp {session ? `${session.player.exp}/${session.player.expToNext}` : "64.236% +28"}
            </span>
            <div className="xp-track">
              <div className="xp-fill" style={{ width: `${heroExpPct}%` }} />
            </div>
          </HudFrame>

          <HudFrame className="command-deck">
            <section className="combat-bar">
              <div className="action-readout">{actionReadout}</div>

              <div className="macro-row">
                {macroSlots.map((slot) => (
                  <MacroSlot
                    key={slot.keybind}
                    keybind={slot.keybind}
                    label={slot.label}
                    onClick={() =>
                      slot.label === "Potion"
                        ? void performCombatAction("potion", slot.label)
                        : announceAction(`${slot.keybind} ${slot.label} ready.`)
                    }
                    tone={slot.tone}
                  />
                ))}
              </div>

              <div className="action-rack">
                <div className="bp-core">
                  <span>BP</span>
                  <strong>{session ? Math.max(1, Math.round(session.player.power / 632)) : 3}</strong>
                </div>

                <div className="action-grid">
                  {skills.map((skill) => (
                    <ActionSlot
                      disabled={combatBusy || skill.cooldown > 0 || (session ? session.player.mana < skill.manaCost : false)}
                      key={skill.id}
                      onClick={() => void performCombatAction(skill.id, skill.label)}
                      skill={skill}
                    />
                  ))}
                </div>
              </div>
            </section>
          </HudFrame>
        </div>

        <section className="system-dock">
          {systemDock.map((item) => (
            <button
              className={`dock-button${activePanel === item ? " active" : ""}`}
              key={item}
              onClick={() => togglePanel(item)}
              type="button"
            >
              {item}
            </button>
          ))}
        </section>

        <div className="brand-stamp">
          <span>Aidemons</span>
          <small>
            {combatBusy
              ? "Resolving combat..."
              : loading
                ? "Syncing shard..."
                : source === "api"
                  ? "Live shard link"
                  : "Fallback shard cache"}
          </small>
        </div>
      </section>
    </div>
  );
}
