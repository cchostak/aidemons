package service

import (
	"aidemons/api/internal/domain/item"
	"aidemons/api/internal/domain/pet"
	"aidemons/api/internal/domain/pvp"
)

type RegionSnapshot struct {
	Name         string `json:"name"`
	Climate      string `json:"climate"`
	Hotspot      string `json:"hotspot"`
	CurrentEvent string `json:"currentEvent"`
}

type BootstrapPayload struct {
	WorldName    string           `json:"worldName"`
	ShardStatus  string           `json:"shardStatus"`
	Region       RegionSnapshot   `json:"region"`
	StarterPets  []pet.Profile    `json:"starterPets"`
	FeaturedLoot []item.Highlight `json:"featuredLoot"`
	PvpQueues    []pvp.Queue      `json:"pvpQueues"`
	Tip          string           `json:"tip"`
}

type WorldService struct{}

func NewWorldService() *WorldService {
	return &WorldService{}
}

func (service *WorldService) Bootstrap() BootstrapPayload {
	return BootstrapPayload{
		WorldName:   "Astra Vale",
		ShardStatus: "Shard stable. Arena weather is volatile but playable.",
		Region: RegionSnapshot{
			Name:         "Sunfall Causeway",
			Climate:      "amber monsoon",
			Hotspot:      "Starforge Crossing",
			CurrentEvent: "Rift beasts are agitating the route to the obsidian arena.",
		},
		StarterPets: []pet.Profile{
			{
				ID:            "pet-ember-lynx",
				Name:          "Ember Lynx",
				Role:          "Assassin companion",
				Affinity:      "ember",
				Blurb:         "Fast burst pet that blinks behind targets and amplifies crit windows.",
				Skills:        []string{"Cinder Pounce", "Solar Fang", "Heat Mirage"},
				EvolutionHint: "Evolves through arena streaks, ash cores, and bonded combo kills.",
			},
			{
				ID:            "pet-tide-seraph",
				Name:          "Tide Seraph",
				Role:          "Support companion",
				Affinity:      "tide",
				Blurb:         "Protects frontliners with shields and converts incoming damage into recovery.",
				Skills:        []string{"Foam Guard", "Moonwake", "Harbor Pulse"},
				EvolutionHint: "Unlocks higher wings through relic pearls, raid clears, and harmony points.",
			},
			{
				ID:            "pet-verdant-drake",
				Name:          "Verdant Drake",
				Role:          "Bruiser companion",
				Affinity:      "verdant",
				Blurb:         "Pins enemies down with roots, persistent pressure, and self-healing trades.",
				Skills:        []string{"Bramble Crash", "Sporespike", "Wild Resurgence"},
				EvolutionHint: "Mutates after feeding world-boss hearts and rare grove resin.",
			},
		},
		FeaturedLoot: []item.Highlight{
			{
				ID:     "loot-aurora-blade",
				Name:   "Aurora Blade",
				Slot:   "Weapon",
				Rarity: "Mythic",
				Effect: "Critical hits accelerate pet ultimate charge by 12%.",
			},
			{
				ID:     "loot-citadel-mantle",
				Name:   "Citadel Mantle",
				Slot:   "Chest",
				Rarity: "Epic",
				Effect: "Reduces crowd control duration while contesting relic objectives.",
			},
			{
				ID:     "loot-rift-ring",
				Name:   "Rift Ring",
				Slot:   "Accessory",
				Rarity: "Legendary",
				Effect: "PvP takedowns open a short blink portal for bonded companions.",
			},
		},
		PvpQueues: []pvp.Queue{
			{
				ID:               "queue-skytrial",
				Name:             "Skytrial 2v2",
				Ruleset:          "Fast ladder queue focused on pet combo drafts and sudden-death shrines.",
				RecommendedPower: 1800,
				RewardFocus:      "Arena crests and evolution catalysts",
			},
			{
				ID:               "queue-relicwar",
				Name:             "Relic War 5v5",
				Ruleset:          "Objective push mode around a moving relic core that powers active pets.",
				RecommendedPower: 2600,
				RewardFocus:      "Guild ranking, siege coins, and socket materials",
			},
		},
		Tip: "Keep systems centered on the pet bond loop so classes feel different because of companion synergy, not because pets are decorative.",
	}
}
