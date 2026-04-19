export interface RegionSnapshot {
  name: string;
  climate: string;
  hotspot: string;
  currentEvent: string;
}

export interface PetProfile {
  id: string;
  name: string;
  role: string;
  affinity: string;
  blurb: string;
  skills: string[];
  evolutionHint: string;
}

export interface LootHighlight {
  id: string;
  name: string;
  slot: string;
  rarity: string;
  effect: string;
}

export interface PvpQueue {
  id: string;
  name: string;
  ruleset: string;
  recommendedPower: number;
  rewardFocus: string;
}

export interface BootstrapPayload {
  worldName: string;
  shardStatus: string;
  region: RegionSnapshot;
  starterPets: PetProfile[];
  featuredLoot: LootHighlight[];
  pvpQueues: PvpQueue[];
  tip: string;
}

export interface PlayerSessionState {
  name: string;
  class: string;
  level: number;
  power: number;
  health: number;
  maxHealth: number;
  mana: number;
  maxMana: number;
  exp: number;
  expToNext: number;
  bond: number;
  drive: number;
  bondedPetId: string;
  bondedPetLevel: number;
  positionX: number;
  positionY: number;
}

export interface SkillSessionState {
  id: string;
  label: string;
  keybind: string;
  tone: string;
  category: string;
  manaCost: number;
  cooldown: number;
  maxCooldown: number;
}

export interface PetSessionState {
  id: string;
  name: string;
  role: string;
  affinity: string;
  stage: string;
  level: number;
  health: number;
  maxHealth: number;
  bond: number;
  drive: number;
  exp: number;
  expToNext: number;
  skills: string[];
  blurb: string;
  evolutionHint: string;
  evolutionName: string;
  evolutionReady: boolean;
  active: boolean;
}

export interface NpcSessionState {
  id: string;
  name: string;
  role: string;
  title: string;
  positionX: number;
  positionY: number;
  summary: string;
  dialogue: string[];
  services: string[];
}

export interface EncounterSessionState {
  id: string;
  name: string;
  family: string;
  level: number;
  health: number;
  maxHealth: number;
  positionX: number;
  positionY: number;
  expReward: number;
}

export interface SessionState {
  player: PlayerSessionState;
  skills: SkillSessionState[];
  pets: PetSessionState[];
  npcs: NpcSessionState[];
  encounters: EncounterSessionState[];
}

export interface CombatActionResult {
  state: SessionState;
  log: string[];
  awardedExp: number;
  levelUp: boolean;
  loot?: string;
  activeTargetId: string;
}

export interface MutationResult {
  state: SessionState;
  log: string[];
}

export interface NpcInteractionResult {
  state: SessionState;
  npc: NpcSessionState;
  log: string[];
}
