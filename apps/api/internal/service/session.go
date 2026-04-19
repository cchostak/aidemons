package service

import (
	"errors"
	"fmt"
	"strings"
	"sync"
)

type PlayerState struct {
	Name           string `json:"name"`
	Class          string `json:"class"`
	Level          int    `json:"level"`
	Power          int    `json:"power"`
	Health         int    `json:"health"`
	MaxHealth      int    `json:"maxHealth"`
	Mana           int    `json:"mana"`
	MaxMana        int    `json:"maxMana"`
	Exp            int    `json:"exp"`
	ExpToNext      int    `json:"expToNext"`
	Bond           int    `json:"bond"`
	Drive          int    `json:"drive"`
	BondedPetID    string `json:"bondedPetId"`
	BondedPetLevel int    `json:"bondedPetLevel"`
	PositionX      int    `json:"positionX"`
	PositionY      int    `json:"positionY"`
}

type SkillState struct {
	ID          string `json:"id"`
	Label       string `json:"label"`
	Keybind     string `json:"keybind"`
	Tone        string `json:"tone"`
	Category    string `json:"category"`
	ManaCost    int    `json:"manaCost"`
	Cooldown    int    `json:"cooldown"`
	MaxCooldown int    `json:"maxCooldown"`
}

type PetState struct {
	ID             string   `json:"id"`
	Name           string   `json:"name"`
	Role           string   `json:"role"`
	Affinity       string   `json:"affinity"`
	Stage          string   `json:"stage"`
	Level          int      `json:"level"`
	Health         int      `json:"health"`
	MaxHealth      int      `json:"maxHealth"`
	Bond           int      `json:"bond"`
	Drive          int      `json:"drive"`
	Exp            int      `json:"exp"`
	ExpToNext      int      `json:"expToNext"`
	Skills         []string `json:"skills"`
	Blurb          string   `json:"blurb"`
	EvolutionHint  string   `json:"evolutionHint"`
	EvolutionName  string   `json:"evolutionName"`
	EvolutionReady bool     `json:"evolutionReady"`
	Active         bool     `json:"active"`
}

type NPCState struct {
	ID        string   `json:"id"`
	Name      string   `json:"name"`
	Role      string   `json:"role"`
	Title     string   `json:"title"`
	PositionX int      `json:"positionX"`
	PositionY int      `json:"positionY"`
	Summary   string   `json:"summary"`
	Dialogue  []string `json:"dialogue"`
	Services  []string `json:"services"`
}

type EncounterState struct {
	ID        string `json:"id"`
	Name      string `json:"name"`
	Family    string `json:"family"`
	Level     int    `json:"level"`
	Health    int    `json:"health"`
	MaxHealth int    `json:"maxHealth"`
	PositionX int    `json:"positionX"`
	PositionY int    `json:"positionY"`
	ExpReward int    `json:"expReward"`
}

type SessionState struct {
	Player     PlayerState      `json:"player"`
	Skills     []SkillState     `json:"skills"`
	Pets       []PetState       `json:"pets"`
	NPCs       []NPCState       `json:"npcs"`
	Encounters []EncounterState `json:"encounters"`
}

type CombatActionRequest struct {
	ActionID string `json:"actionId"`
	TargetID string `json:"targetId"`
}

type PetSelectRequest struct {
	PetID string `json:"petId"`
}

type PetEvolveRequest struct {
	PetID string `json:"petId"`
}

type NPCInteractRequest struct {
	NPCID string `json:"npcId"`
}

type CombatActionResult struct {
	State          SessionState `json:"state"`
	Log            []string     `json:"log"`
	AwardedExp     int          `json:"awardedExp"`
	LevelUp        bool         `json:"levelUp"`
	Loot           string       `json:"loot,omitempty"`
	ActiveTargetID string       `json:"activeTargetId"`
}

type MutationResult struct {
	State SessionState `json:"state"`
	Log   []string     `json:"log"`
}

type NPCInteractionResult struct {
	State SessionState `json:"state"`
	NPC   NPCState     `json:"npc"`
	Log   []string     `json:"log"`
}

type actionProfile struct {
	ID               string
	Label            string
	Keybind          string
	Tone             string
	Category         string
	DamageMin        int
	DamageMax        int
	ManaCost         int
	Retaliation      float64
	MaxCooldown      int
	PetExpGain       int
	BondGain         int
	DriveGain        int
	RequiredAffinity string
}

type encounterTemplate struct {
	Name      string
	Family    string
	Level     int
	MaxHealth int
	ExpReward int
}

type SessionService struct {
	mu           sync.Mutex
	worldService *WorldService
	state        SessionState
	spawnIndex   int
	turnIndex    int
}

func NewSessionService(worldService *WorldService) *SessionService {
	service := &SessionService{worldService: worldService}
	service.reset()
	return service
}

func (service *SessionService) State() SessionState {
	service.mu.Lock()
	defer service.mu.Unlock()

	return cloneSessionState(service.state)
}

func (service *SessionService) ResolveAction(request CombatActionRequest) (CombatActionResult, error) {
	service.mu.Lock()
	defer service.mu.Unlock()

	action, ok := actionProfiles()[strings.ToLower(request.ActionID)]
	if !ok {
		return CombatActionResult{}, errors.New("unknown action")
	}

	log := []string{}
	activeTargetID := request.TargetID

	if action.ID == "potion" {
		service.advanceCooldowns("")
		heal := minInt(38, service.state.Player.MaxHealth-service.state.Player.Health)
		mana := minInt(24, service.state.Player.MaxMana-service.state.Player.Mana)
		service.state.Player.Health += heal
		service.state.Player.Mana += mana
		service.raiseActivePetBond(1, 1)
		log = append(log, fmt.Sprintf("Potion used: +%d HP, +%d MP.", heal, mana))
		return CombatActionResult{
			State:          cloneSessionState(service.state),
			Log:            log,
			ActiveTargetID: service.fallbackTargetID(activeTargetID),
		}, nil
	}

	skill := service.findSkill(action.ID)
	if skill == nil {
		return CombatActionResult{}, errors.New("skill not available")
	}

	if skill.Cooldown > 0 {
		log = append(log, fmt.Sprintf("%s is cooling down for %d turns.", action.Label, skill.Cooldown))
		return CombatActionResult{
			State:          cloneSessionState(service.state),
			Log:            log,
			ActiveTargetID: service.fallbackTargetID(activeTargetID),
		}, nil
	}

	targetIndex := -1
	for index, encounter := range service.state.Encounters {
		if encounter.ID == request.TargetID {
			targetIndex = index
			break
		}
	}

	if targetIndex == -1 {
		return CombatActionResult{}, errors.New("target not found")
	}

	if service.state.Player.Mana < action.ManaCost {
		log = append(log, fmt.Sprintf("%s fizzles. Not enough mana.", action.Label))
		return CombatActionResult{
			State:          cloneSessionState(service.state),
			Log:            log,
			ActiveTargetID: service.fallbackTargetID(activeTargetID),
		}, nil
	}

	service.turnIndex += 1
	service.state.Player.Mana -= action.ManaCost

	target := service.state.Encounters[targetIndex]
	pet := service.activePet()
	damageRange := maxInt(1, action.DamageMax-action.DamageMin+1)
	damage := action.DamageMin + ((service.turnIndex + target.Level + service.state.Player.Level + service.state.Player.Power/100) % damageRange)
	petStrike := 0

	if pet != nil {
		if pet.Affinity == "ember" && (action.ID == "slash" || action.ID == "burst") {
			damage += 10
			log = append(log, fmt.Sprintf("%s shreds the flank for +10 burn damage.", pet.Name))
		}
		if pet.Affinity == "tide" && action.ID == "call" {
			service.state.Player.Mana = minInt(service.state.Player.MaxMana, service.state.Player.Mana+10)
			log = append(log, fmt.Sprintf("%s returns 10 MP to the bond channel.", pet.Name))
		}
		if pet.Affinity == "verdant" && action.ID == "veil" {
			service.state.Player.Health = minInt(service.state.Player.MaxHealth, service.state.Player.Health+14)
			log = append(log, fmt.Sprintf("%s regrows 14 HP through the ward.", pet.Name))
		}
		if action.ID == "call" || action.ID == "awaken" {
			petStrike = pet.Level + pet.Drive/6
			damage += petStrike
			log = append(log, fmt.Sprintf("%s joins the cast for %d support damage.", pet.Name, petStrike))
		}
	}

	target.Health = maxInt(0, target.Health-damage)
	log = append(log, fmt.Sprintf("%s hits %s for %d.", action.Label, target.Name, damage))

	awardedExp := 0
	levelUp := false
	loot := ""

	if target.Health == 0 {
		awardedExp = target.ExpReward
		service.state.Player.Exp += awardedExp
		log = append(log, fmt.Sprintf("%s routed. +%d EXP.", target.Name, awardedExp))

		if pet != nil {
			service.gainPetExp(pet, awardedExp/2+action.PetExpGain)
			service.raiseActivePetBond(action.BondGain+1, action.DriveGain+1)
		}

		if service.turnIndex%2 == 0 {
			loot = service.lootForFamily(target.Family)
			log = append(log, fmt.Sprintf("Loot secured: %s.", loot))
		}

		for service.state.Player.Exp >= service.state.Player.ExpToNext {
			service.state.Player.Exp -= service.state.Player.ExpToNext
			service.state.Player.Level += 1
			service.state.Player.ExpToNext += 42
			service.state.Player.MaxHealth += 18
			service.state.Player.Health = service.state.Player.MaxHealth
			service.state.Player.MaxMana += 10
			service.state.Player.Mana = service.state.Player.MaxMana
			service.state.Player.Power += 28
			levelUp = true
			log = append(log, fmt.Sprintf("%s reaches level %d.", service.state.Player.Name, service.state.Player.Level))
		}

		service.state.Encounters[targetIndex] = service.spawnEncounter(targetIndex)
		activeTargetID = service.state.Encounters[targetIndex].ID
		log = append(log, fmt.Sprintf("%s emerges near the lane.", service.state.Encounters[targetIndex].Name))
	} else {
		retaliation := int(float64(target.Level*3+8) * action.Retaliation)
		if action.ID == "blink" || action.ID == "dash" {
			retaliation = retaliation / 2
		}
		service.state.Player.Health = maxInt(1, service.state.Player.Health-retaliation)
		service.state.Encounters[targetIndex] = target
		log = append(log, fmt.Sprintf("%s counters for %d.", target.Name, retaliation))

		if pet != nil {
			service.gainPetExp(pet, maxInt(1, action.PetExpGain/2))
			service.raiseActivePetBond(action.BondGain, action.DriveGain)
		}
	}

	service.advanceCooldowns(action.ID)
	service.refreshActivePetSnapshot()

	return CombatActionResult{
		State:          cloneSessionState(service.state),
		Log:            log,
		AwardedExp:     awardedExp,
		LevelUp:        levelUp,
		Loot:           loot,
		ActiveTargetID: service.fallbackTargetID(activeTargetID),
	}, nil
}

func (service *SessionService) SelectPet(request PetSelectRequest) (MutationResult, error) {
	service.mu.Lock()
	defer service.mu.Unlock()

	pet := service.findPet(request.PetID)
	if pet == nil {
		return MutationResult{}, errors.New("pet not found")
	}

	for index := range service.state.Pets {
		service.state.Pets[index].Active = service.state.Pets[index].ID == request.PetID
	}

	service.refreshActivePetSnapshot()

	return MutationResult{
		State: cloneSessionState(service.state),
		Log: []string{
			fmt.Sprintf("%s enters the field link.", pet.Name),
			fmt.Sprintf("%s affinity now leads the active skill synergies.", strings.Title(pet.Affinity)),
		},
	}, nil
}

func (service *SessionService) EvolvePet(request PetEvolveRequest) (MutationResult, error) {
	service.mu.Lock()
	defer service.mu.Unlock()

	targetID := request.PetID
	if targetID == "" {
		targetID = service.state.Player.BondedPetID
	}

	pet := service.findPet(targetID)
	if pet == nil {
		return MutationResult{}, errors.New("pet not found")
	}

	if !pet.EvolutionReady {
		return MutationResult{}, errors.New("pet is not ready to evolve")
	}

	pet.Stage = "Ascended"
	pet.Level += 4
	pet.MaxHealth += 26
	pet.Health = pet.MaxHealth
	pet.Drive = minInt(100, pet.Drive+9)
	pet.Bond = minInt(100, pet.Bond+6)
	pet.Exp = 0
	pet.ExpToNext += 90
	pet.EvolutionReady = false
	pet.Blurb = fmt.Sprintf("%s has evolved into its %s form and now channels a sharper battlefield aura.", pet.Name, pet.EvolutionName)
	pet.Skills = appendUnique(pet.Skills, evolvedSkillName(pet.Affinity))
	service.state.Player.Power += 120
	service.refreshActivePetSnapshot()

	return MutationResult{
		State: cloneSessionState(service.state),
		Log: []string{
			fmt.Sprintf("%s evolves into %s.", pet.Name, pet.EvolutionName),
			"Evolution stabilizes new attack patterns and raises companion pressure immediately.",
		},
	}, nil
}

func (service *SessionService) InteractNPC(request NPCInteractRequest) (NPCInteractionResult, error) {
	service.mu.Lock()
	defer service.mu.Unlock()

	npc := service.findNPC(request.NPCID)
	if npc == nil {
		return NPCInteractionResult{}, errors.New("npc not found")
	}

	log := append([]string{}, npc.Dialogue...)
	activePet := service.activePet()

	if npc.Role == "beastmaster" && activePet != nil && activePet.EvolutionReady {
		log = append(log, fmt.Sprintf("%s can evolve %s right now.", npc.Name, activePet.Name))
	}

	if npc.Role == "pathkeeper" {
		log = append(log, fmt.Sprintf("%s marks a safe path toward %s.", npc.Name, service.state.Encounters[0].Name))
	}

	return NPCInteractionResult{
		State: cloneSessionState(service.state),
		NPC:   cloneNPCState(*npc),
		Log:   log,
	}, nil
}

func (service *SessionService) reset() {
	bootstrap := service.worldService.Bootstrap()
	service.spawnIndex = 0
	service.turnIndex = 0
	service.state = SessionState{
		Player: PlayerState{
			Name:      "Frontier Warden",
			Class:     "Riftblade",
			Level:     34,
			Power:     1896,
			Health:    164,
			MaxHealth: 164,
			Mana:      108,
			MaxMana:   108,
			Exp:       642,
			ExpToNext: 1000,
			PositionX: 0,
			PositionY: 0,
		},
		Skills: buildSkillState(),
		NPCs: []NPCState{
			{
				ID:        "npc-pathkeeper",
				Name:      "Watcher Oren",
				Role:      "pathkeeper",
				Title:     "Route Marshal",
				PositionX: -420,
				PositionY: -180,
				Summary:   "Keeps the crossing lanes open and can mark safe routes around dense packs.",
				Dialogue: []string{
					"Oren: The northern lane is still passable if you keep to the glowing stones.",
					"Oren: Click the field and I will trust your route discipline more than your luck.",
				},
				Services: []string{"Route marks", "Threat brief"},
			},
			{
				ID:        "npc-beastmaster",
				Name:      "Maela Voss",
				Role:      "beastmaster",
				Title:     "Bond Warden",
				PositionX: 340,
				PositionY: 260,
				Summary:   "Oversees pet bond drills, evolution rites, and companion loadouts.",
				Dialogue: []string{
					"Maela: A pet that fights beside you should grow beside you too.",
					"Maela: Bond, pressure, and repetition matter more than decoration.",
				},
				Services: []string{"Pet bond", "Evolution rite"},
			},
			{
				ID:        "npc-quartermaster",
				Name:      "Archivist Sen",
				Role:      "quartermaster",
				Title:     "Relic Quartermaster",
				PositionX: 520,
				PositionY: -240,
				Summary:   "Tracks relic fragments, potion routes, and battle salvage.",
				Dialogue: []string{
					"Sen: Pickups in the lane are not just flavor. They are pace control.",
					"Sen: You keep fighting, I keep the salvage sorted.",
				},
				Services: []string{"Supplies", "Relic salvage"},
			},
		},
	}

	for _, profile := range bootstrap.StarterPets {
		service.state.Pets = append(service.state.Pets, PetState{
			ID:             profile.ID,
			Name:           profile.Name,
			Role:           profile.Role,
			Affinity:       profile.Affinity,
			Stage:          "Bonded",
			Level:          12,
			Health:         96,
			MaxHealth:      96,
			Bond:           82,
			Drive:          72,
			Exp:            126,
			ExpToNext:      220,
			Skills:         append([]string{}, profile.Skills...),
			Blurb:          profile.Blurb,
			EvolutionHint:  profile.EvolutionHint,
			EvolutionName:  evolvedFormName(profile.Affinity),
			EvolutionReady: false,
			Active:         false,
		})
	}

	if len(service.state.Pets) > 0 {
		service.state.Pets[0].Active = true
		service.state.Player.BondedPetID = service.state.Pets[0].ID
	}

	for slot := 0; slot < 8; slot++ {
		service.state.Encounters = append(service.state.Encounters, service.spawnEncounter(slot))
	}

	service.refreshActivePetSnapshot()
}

func (service *SessionService) spawnEncounter(slot int) EncounterState {
	positions := [][2]int{
		{-520, -300},
		{-360, 220},
		{-120, -460},
		{280, -260},
		{420, 180},
		{640, -80},
		{120, 480},
		{-640, 80},
	}

	templates := []encounterTemplate{
		{Name: "Rift Hound", Family: "hound", Level: 27, MaxHealth: 62, ExpReward: 34},
		{Name: "Lantern Mite", Family: "mite", Level: 26, MaxHealth: 48, ExpReward: 28},
		{Name: "Marsh Bulwark", Family: "bulwark", Level: 29, MaxHealth: 74, ExpReward: 42},
	}

	template := templates[(service.spawnIndex+slot)%len(templates)]
	position := positions[slot%len(positions)]
	service.spawnIndex += 1

	return EncounterState{
		ID:        fmt.Sprintf("enc-%d-%d", slot, service.spawnIndex),
		Name:      template.Name,
		Family:    template.Family,
		Level:     template.Level + (service.spawnIndex % 2),
		Health:    template.MaxHealth,
		MaxHealth: template.MaxHealth,
		PositionX: position[0] + ((service.spawnIndex % 3) * 18),
		PositionY: position[1] + ((service.spawnIndex % 4) * 12),
		ExpReward: template.ExpReward,
	}
}

func (service *SessionService) fallbackTargetID(current string) string {
	if current != "" {
		for _, encounter := range service.state.Encounters {
			if encounter.ID == current {
				return current
			}
		}
	}

	if len(service.state.Encounters) == 0 {
		return ""
	}

	return service.state.Encounters[0].ID
}

func (service *SessionService) lootForFamily(family string) string {
	switch family {
	case "hound":
		return "Ash Fang"
	case "bulwark":
		return "Ward Core"
	default:
		return "Glow Dust"
	}
}

func (service *SessionService) activePet() *PetState {
	for index := range service.state.Pets {
		if service.state.Pets[index].Active {
			return &service.state.Pets[index]
		}
	}

	return nil
}

func (service *SessionService) findPet(id string) *PetState {
	for index := range service.state.Pets {
		if service.state.Pets[index].ID == id {
			return &service.state.Pets[index]
		}
	}

	return nil
}

func (service *SessionService) findNPC(id string) *NPCState {
	for index := range service.state.NPCs {
		if service.state.NPCs[index].ID == id {
			return &service.state.NPCs[index]
		}
	}

	return nil
}

func (service *SessionService) findSkill(id string) *SkillState {
	for index := range service.state.Skills {
		if service.state.Skills[index].ID == id {
			return &service.state.Skills[index]
		}
	}

	return nil
}

func (service *SessionService) gainPetExp(pet *PetState, amount int) {
	if pet == nil || amount <= 0 {
		return
	}

	pet.Exp += amount

	for pet.Exp >= pet.ExpToNext {
		pet.Exp -= pet.ExpToNext
		pet.Level += 1
		pet.ExpToNext += 36
		pet.MaxHealth += 8
		pet.Health = pet.MaxHealth
		pet.Drive = minInt(100, pet.Drive+2)
	}

	if pet.Level >= 16 && pet.Bond >= 90 {
		pet.EvolutionReady = true
	}
}

func (service *SessionService) raiseActivePetBond(bondGain int, driveGain int) {
	pet := service.activePet()
	if pet == nil {
		return
	}

	pet.Bond = minInt(100, pet.Bond+bondGain)
	pet.Drive = minInt(100, pet.Drive+driveGain)
	if pet.Level >= 16 && pet.Bond >= 90 {
		pet.EvolutionReady = true
	}
}

func (service *SessionService) refreshActivePetSnapshot() {
	activePet := service.activePet()
	if activePet == nil {
		return
	}

	service.state.Player.BondedPetID = activePet.ID
	service.state.Player.BondedPetLevel = activePet.Level
	service.state.Player.Bond = activePet.Bond
	service.state.Player.Drive = activePet.Drive
}

func (service *SessionService) advanceCooldowns(usedActionID string) {
	for index := range service.state.Skills {
		if service.state.Skills[index].Cooldown > 0 {
			service.state.Skills[index].Cooldown -= 1
		}
	}

	if usedActionID == "" {
		return
	}

	for index := range service.state.Skills {
		if service.state.Skills[index].ID == usedActionID {
			service.state.Skills[index].Cooldown = service.state.Skills[index].MaxCooldown
			return
		}
	}
}

func actionProfiles() map[string]actionProfile {
	return map[string]actionProfile{
		"potion": {
			ID:       "potion",
			Label:    "Potion",
			Keybind:  "1",
			Tone:     "gold",
			Category: "utility",
		},
		"slash": {
			ID:          "slash",
			Label:       "Slash",
			Keybind:     "F1",
			Tone:        "ruby",
			Category:    "melee",
			DamageMin:   18,
			DamageMax:   28,
			ManaCost:    8,
			Retaliation: 1,
			MaxCooldown: 1,
			PetExpGain:  10,
			BondGain:    1,
			DriveGain:   1,
		},
		"blink": {
			ID:          "blink",
			Label:       "Blink",
			Keybind:     "F2",
			Tone:        "blue",
			Category:    "mobility",
			DamageMin:   14,
			DamageMax:   22,
			ManaCost:    12,
			Retaliation: 0.55,
			MaxCooldown: 2,
			PetExpGain:  8,
			BondGain:    1,
			DriveGain:   1,
		},
		"burst": {
			ID:          "burst",
			Label:       "Burst",
			Keybind:     "F3",
			Tone:        "green",
			Category:    "strike",
			DamageMin:   24,
			DamageMax:   34,
			ManaCost:    18,
			Retaliation: 1.15,
			MaxCooldown: 3,
			PetExpGain:  14,
			BondGain:    2,
			DriveGain:   2,
		},
		"veil": {
			ID:          "veil",
			Label:       "Veil",
			Keybind:     "F4",
			Tone:        "gold",
			Category:    "guard",
			DamageMin:   16,
			DamageMax:   24,
			ManaCost:    14,
			Retaliation: 0.6,
			MaxCooldown: 2,
			PetExpGain:  8,
			BondGain:    2,
			DriveGain:   1,
		},
		"dash": {
			ID:          "dash",
			Label:       "Dash",
			Keybind:     "F5",
			Tone:        "blue",
			Category:    "mobility",
			DamageMin:   12,
			DamageMax:   18,
			ManaCost:    10,
			Retaliation: 0.75,
			MaxCooldown: 2,
			PetExpGain:  6,
			BondGain:    1,
			DriveGain:   1,
		},
		"call": {
			ID:          "call",
			Label:       "Call",
			Keybind:     "F6",
			Tone:        "green",
			Category:    "pet",
			DamageMin:   20,
			DamageMax:   30,
			ManaCost:    16,
			Retaliation: 1,
			MaxCooldown: 3,
			PetExpGain:  18,
			BondGain:    3,
			DriveGain:   2,
		},
		"awaken": {
			ID:          "awaken",
			Label:       "Awaken",
			Keybind:     "F7",
			Tone:        "gold",
			Category:    "ultimate",
			DamageMin:   28,
			DamageMax:   42,
			ManaCost:    22,
			Retaliation: 1.2,
			MaxCooldown: 4,
			PetExpGain:  22,
			BondGain:    4,
			DriveGain:   3,
		},
		"forge": {
			ID:          "forge",
			Label:       "Forge",
			Keybind:     "F8",
			Tone:        "ruby",
			Category:    "channel",
			DamageMin:   22,
			DamageMax:   32,
			ManaCost:    20,
			Retaliation: 0.9,
			MaxCooldown: 3,
			PetExpGain:  12,
			BondGain:    2,
			DriveGain:   2,
		},
	}
}

func buildSkillState() []SkillState {
	skills := []SkillState{}

	for _, actionID := range []string{"slash", "blink", "burst", "veil", "dash", "call", "awaken", "forge"} {
		action := actionProfiles()[actionID]
		skills = append(skills, SkillState{
			ID:          action.ID,
			Label:       action.Label,
			Keybind:     action.Keybind,
			Tone:        action.Tone,
			Category:    action.Category,
			ManaCost:    action.ManaCost,
			Cooldown:    0,
			MaxCooldown: action.MaxCooldown,
		})
	}

	return skills
}

func evolvedFormName(affinity string) string {
	switch affinity {
	case "tide":
		return "Moonwake Seraph"
	case "verdant":
		return "Thorn Regent"
	default:
		return "Cinder Mirage"
	}
}

func evolvedSkillName(affinity string) string {
	switch affinity {
	case "tide":
		return "Abyss Hymn"
	case "verdant":
		return "Rootquake"
	default:
		return "Ash Rift"
	}
}

func cloneSessionState(state SessionState) SessionState {
	cloned := state
	cloned.Skills = append([]SkillState(nil), state.Skills...)
	cloned.Encounters = append([]EncounterState(nil), state.Encounters...)
	cloned.Pets = make([]PetState, len(state.Pets))
	for index, pet := range state.Pets {
		cloned.Pets[index] = pet
		cloned.Pets[index].Skills = append([]string(nil), pet.Skills...)
	}
	cloned.NPCs = make([]NPCState, len(state.NPCs))
	for index, npc := range state.NPCs {
		cloned.NPCs[index] = cloneNPCState(npc)
	}
	return cloned
}

func cloneNPCState(npc NPCState) NPCState {
	cloned := npc
	cloned.Dialogue = append([]string(nil), npc.Dialogue...)
	cloned.Services = append([]string(nil), npc.Services...)
	return cloned
}

func appendUnique(items []string, value string) []string {
	for _, item := range items {
		if item == value {
			return items
		}
	}

	return append(items, value)
}

func minInt(left int, right int) int {
	if left < right {
		return left
	}
	return right
}

func maxInt(left int, right int) int {
	if left > right {
		return left
	}
	return right
}
