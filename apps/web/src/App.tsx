import { startTransition, useEffect, useState, type ReactNode } from "react";
import { GameViewport } from "./game/GameViewport";
import { fallbackWorld } from "./lib/fallbackWorld";
import { apiUrl, websocketUrl } from "./lib/network";
import type { BootstrapPayload, CombatActionResult, SessionState } from "./lib/types";
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

const actionSlots = [
  { keybind: "F1", label: "Slash", actionId: "slash", tone: "ruby" },
  { keybind: "F2", label: "Blink", actionId: "blink", tone: "blue" },
  { keybind: "F3", label: "Burst", actionId: "burst", tone: "green" },
  { keybind: "F4", label: "Veil", actionId: "veil", tone: "gold" },
  { keybind: "F5", label: "Dash", actionId: "dash", tone: "blue" },
  { keybind: "F6", label: "Call", actionId: "call", tone: "green" },
  { keybind: "F7", label: "Awaken", actionId: "awaken", tone: "gold" },
  { keybind: "F8", label: "Forge", actionId: "forge", tone: "ruby" }
] as const;

const systemDock = ["Bag", "Quest", "Guild", "Chat"] as const;
type UtilityPanel = (typeof systemDock)[number] | "PathFinding";

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
    <button className={`action-slot ${tone}`} onClick={onClick} type="button">
      <span className="action-keybind">{keybind}</span>
      <span className="action-label">{label}</span>
    </button>
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
  const [chatTab, setChatTab] = useState<"System" | "Talk" | "Guild">("System");
  const [actionReadout, setActionReadout] = useState("HUD standing by.");

  const selectedPetId = useGameStore((state) => state.selectedPetId);
  const setSelectedPetId = useGameStore((state) => state.setSelectedPetId);

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
    const activePetStillExists = world.starterPets.some((pet) => pet.id === selectedPetId);
    if (!activePetStillExists && world.starterPets.length > 0) {
      setSelectedPetId(world.starterPets[0].id);
    }
  }, [selectedPetId, setSelectedPetId, world.starterPets]);

  useEffect(() => {
    if (!session) {
      return;
    }

    const selectedTargetStillExists = session.encounters.some((encounter) => encounter.id === selectedTargetId);
    if (!selectedTargetStillExists) {
      setSelectedTargetId(session.encounters[0]?.id ?? "");
    }
  }, [selectedTargetId, session]);

  const selectedPet =
    world.starterPets.find((pet) => pet.id === selectedPetId) ?? world.starterPets[0];

  const petInitials = (selectedPet?.name ?? "Pet")
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  const trackerLines = [
    `Sweep ${world.region.hotspot} and stabilize the relic lane.`,
    `Featured queue: ${world.pvpQueues[0]?.name ?? "Skytrial"} ready.`,
    `Expected drop: ${world.featuredLoot[0]?.name ?? "Aurora Blade"}.`
  ];
  const currentTarget =
    session?.encounters.find((encounter) => encounter.id === selectedTargetId) ?? session?.encounters[0];
  const heroHealthPct = session ? Math.round((session.player.health / session.player.maxHealth) * 100) : 96;
  const heroManaPct = session ? Math.round((session.player.mana / session.player.maxMana) * 100) : 72;
  const heroExpPct = session ? Math.round((session.player.exp / session.player.expToNext) * 100) : 64;

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
      ? `System: ${session.encounters.length} active threats in ${world.region.hotspot}.`
      : "System: Combat session not initialized yet.",
    `Talk: Arena scouts are accepting challengers.`,
    `System: Frontend synced against the Gin shard service.`
  ];

  const talkLines = [
    "Talk: Gamers says to all hi.",
    "Talk: Arena scouts are accepting challengers.",
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
      setActionReadout(payload.log.join(" "));
    } catch {
      setActionReadout(`${label} failed to resolve against the shard service.`);
    } finally {
      setCombatBusy(false);
    }
  };

  const activePanelTitle =
    activePanel === "PathFinding" ? "PathFinding" : activePanel;

  return (
    <div className="client-shell">
      <section className="world-stage">
        <GameViewport
          encounters={session?.encounters ?? []}
          onSelectEncounter={setSelectedTargetId}
          selectedEncounterId={selectedTargetId}
          selectedPetId={selectedPet?.id ?? ""}
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
            level={session?.player.bondedPetLevel ?? 12}
            name={selectedPet?.name ?? "Companion"}
            subtitle={`${selectedPet?.role ?? "Bonded unit"} | ${selectedPet?.affinity ?? "neutral"}`}
            tone="pet"
          >
            <Meter label="Bond" tone="gold" value={session?.player.bond ?? 88} />
            <Meter label="Drive" tone="green" value={session?.player.drive ?? 77} />
          </StatusPlate>

          <HudFrame className="buff-strip">
            <span>BP 3</span>
            <span>PK Off</span>
            <span>Aura</span>
            <span>Mount</span>
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
                : `${world.region.hotspot} | Select a target`
            }
            tone="target"
          >
            <Meter
              label="Threat"
              tone="gold"
              value={currentTarget ? Math.round((currentTarget.health / currentTarget.maxHealth) * 100) : 0}
            />
          </StatusPlate>
        </div>

        <div className="hud-top-right">
          <HudFrame className="minimap-frame">
            <div className="map-header">
              <span>08-22 10:05</span>
              <span>408 454</span>
            </div>

            <div className="minimap-orb">
              <div className="map-ring" />
              <span className="map-marker player" />
              <span className="map-marker ally" />
              <span className="map-marker quest" />
            </div>

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
              <span>{selectedPet?.affinity ?? "neutral"} | Link 88%</span>
            </div>
          </div>

          <p className="bond-copy">{selectedPet?.blurb ?? world.tip}</p>
          <div className="skill-chip-row">
            {selectedPet?.skills.map((skill) => (
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

            {activePanel === "PathFinding" ? (
              <div className="utility-list">
                <article className="utility-card">
                  <strong>{world.region.hotspot}</strong>
                  <span>Route lock: 408, 454</span>
                  <p>Path guidance points toward the active relic lane and arena staging path.</p>
                </article>
                <article className="utility-card">
                  <strong>Suggested route</strong>
                  <p>North bridge / grove bend / Starforge gate / relic platform.</p>
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
                  {actionSlots.map((slot) => (
                    <ActionSlot
                      key={slot.keybind}
                      keybind={slot.keybind}
                      label={slot.label}
                      onClick={() => void performCombatAction(slot.actionId, slot.label)}
                      tone={slot.tone}
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
