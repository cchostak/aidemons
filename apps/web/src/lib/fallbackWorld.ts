import type { BootstrapPayload } from "./types";

export const fallbackWorld: BootstrapPayload = {
  worldName: "Astra Vale",
  shardStatus: "Frontier shard online. PvP storms expected at dusk.",
  region: {
    name: "Sunfall Causeway",
    climate: "amber monsoon",
    hotspot: "Starforge Crossing",
    currentEvent: "Rift beasts are dropping ember crests and hatch sigils."
  },
  starterPets: [
    {
      id: "pet-ember-lynx",
      name: "Ember Lynx",
      role: "Assassin companion",
      affinity: "ember",
      blurb: "Fast burst pet that blinks through frontlines and amplifies crit chains.",
      skills: ["Cinder Pounce", "Solar Fang", "Heat Mirage"],
      evolutionHint: "Evolves by stacking arena streaks and rare ash cores."
    },
    {
      id: "pet-tide-seraph",
      name: "Tide Seraph",
      role: "Support companion",
      affinity: "tide",
      blurb: "Protective summon that shields allies and converts incoming damage into mana.",
      skills: ["Foam Guard", "Moonwake", "Harbor Pulse"],
      evolutionHint: "Unlocks higher wings through guild raids and relic pearls."
    },
    {
      id: "pet-verdant-drake",
      name: "Verdant Drake",
      role: "Bruiser companion",
      affinity: "verdant",
      blurb: "Frontline pet with root pressure, sustain, and lane denial in duels.",
      skills: ["Bramble Crash", "Sporespike", "Wild Resurgence"],
      evolutionHint: "Mutates after feeding world-boss hearts and grove resin."
    }
  ],
  featuredLoot: [
    {
      id: "loot-aurora-blade",
      name: "Aurora Blade",
      slot: "Weapon",
      rarity: "Mythic",
      effect: "Critical hits charge pet ultimates 12% faster."
    },
    {
      id: "loot-citadel-mantle",
      name: "Citadel Mantle",
      slot: "Chest",
      rarity: "Epic",
      effect: "Reduces control effects while carrying contested relics."
    },
    {
      id: "loot-rift-ring",
      name: "Rift Ring",
      slot: "Accessory",
      rarity: "Legendary",
      effect: "PvP takedowns open a brief blink portal for your bonded pet."
    }
  ],
  pvpQueues: [
    {
      id: "queue-skytrial",
      name: "Skytrial 2v2",
      ruleset: "Short-form ladder with pet combo drafting and tight objective windows.",
      recommendedPower: 1800,
      rewardFocus: "Arena crests and evolution catalysts"
    },
    {
      id: "queue-relicwar",
      name: "Relic War 5v5",
      ruleset: "Team skirmish around a moving relic core that buffs active companions.",
      recommendedPower: 2600,
      rewardFocus: "Guild ranking, siege coins, and rare sockets"
    }
  ],
  tip: "Early game depth comes from the pet bond loop, so every class should have at least one offensive and one utility companion path."
};
