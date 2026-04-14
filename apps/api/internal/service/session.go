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
	Encounters []EncounterState `json:"encounters"`
}

type CombatActionRequest struct {
	ActionID string `json:"actionId"`
	TargetID string `json:"targetId"`
}

type CombatActionResult struct {
	State          SessionState `json:"state"`
	Log            []string     `json:"log"`
	AwardedExp     int          `json:"awardedExp"`
	LevelUp        bool         `json:"levelUp"`
	Loot           string       `json:"loot,omitempty"`
	ActiveTargetID string       `json:"activeTargetId"`
}

type actionProfile struct {
	Label       string
	DamageMin   int
	DamageMax   int
	ManaCost    int
	Retaliation float64
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

	if action.Label == "Potion" {
		heal := minInt(34, service.state.Player.MaxHealth-service.state.Player.Health)
		mana := minInt(20, service.state.Player.MaxMana-service.state.Player.Mana)
		service.state.Player.Health += heal
		service.state.Player.Mana += mana
		log = append(log, fmt.Sprintf("Potion used: +%d HP, +%d MP.", heal, mana))
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
	damageRange := action.DamageMax - action.DamageMin + 1
	damage := action.DamageMin + ((service.turnIndex + target.Level + service.state.Player.Level) % damageRange)

	if strings.Contains(service.state.Player.BondedPetID, "ember") && (action.Label == "Slash" || action.Label == "Burst") {
		damage += 8
	}
	if strings.Contains(service.state.Player.BondedPetID, "verdant") && action.Label == "Veil" {
		service.state.Player.Health = minInt(service.state.Player.MaxHealth, service.state.Player.Health+10)
		log = append(log, "Verdant link restores 10 HP.")
	}
	if strings.Contains(service.state.Player.BondedPetID, "tide") && action.Label == "Call" {
		service.state.Player.Mana = minInt(service.state.Player.MaxMana, service.state.Player.Mana+8)
		log = append(log, "Tide link restores 8 MP.")
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
			service.state.Player.BondedPetLevel += 1
			levelUp = true
		}

		service.state.Encounters[targetIndex] = service.spawnEncounter(targetIndex)
		activeTargetID = service.state.Encounters[targetIndex].ID
		log = append(log, fmt.Sprintf("%s emerges near the lane.", service.state.Encounters[targetIndex].Name))
	} else {
		retaliation := int(float64(target.Level*3+8) * action.Retaliation)
		if action.Label == "Blink" {
			retaliation = retaliation / 2
		}
		service.state.Player.Health = maxInt(1, service.state.Player.Health-retaliation)
		service.state.Encounters[targetIndex] = target
		log = append(log, fmt.Sprintf("%s counters for %d.", target.Name, retaliation))
	}

	return CombatActionResult{
		State:          cloneSessionState(service.state),
		Log:            log,
		AwardedExp:     awardedExp,
		LevelUp:        levelUp,
		Loot:           loot,
		ActiveTargetID: service.fallbackTargetID(activeTargetID),
	}, nil
}

func (service *SessionService) reset() {
	bootstrap := service.worldService.Bootstrap()
	service.spawnIndex = 0
	service.turnIndex = 0
	service.state = SessionState{
		Player: PlayerState{
			Name:           "Frontier Warden",
			Class:          "Riftblade",
			Level:          34,
			Power:          1896,
			Health:         164,
			MaxHealth:      164,
			Mana:           108,
			MaxMana:        108,
			Exp:            642,
			ExpToNext:      1000,
			Bond:           88,
			Drive:          77,
			BondedPetID:    bootstrap.StarterPets[0].ID,
			BondedPetLevel: 12,
		},
	}

	for slot := 0; slot < 8; slot++ {
		service.state.Encounters = append(service.state.Encounters, service.spawnEncounter(slot))
	}
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

func actionProfiles() map[string]actionProfile {
	return map[string]actionProfile{
		"potion": {Label: "Potion"},
		"slash":  {Label: "Slash", DamageMin: 18, DamageMax: 28, ManaCost: 8, Retaliation: 1},
		"blink":  {Label: "Blink", DamageMin: 14, DamageMax: 22, ManaCost: 12, Retaliation: 0.55},
		"burst":  {Label: "Burst", DamageMin: 24, DamageMax: 34, ManaCost: 18, Retaliation: 1.15},
		"veil":   {Label: "Veil", DamageMin: 16, DamageMax: 24, ManaCost: 14, Retaliation: 0.6},
		"dash":   {Label: "Dash", DamageMin: 12, DamageMax: 18, ManaCost: 10, Retaliation: 0.75},
		"call":   {Label: "Call", DamageMin: 20, DamageMax: 30, ManaCost: 16, Retaliation: 1},
		"awaken": {Label: "Awaken", DamageMin: 28, DamageMax: 42, ManaCost: 22, Retaliation: 1.2},
		"forge":  {Label: "Forge", DamageMin: 22, DamageMax: 32, ManaCost: 20, Retaliation: 0.9},
	}
}

func cloneSessionState(state SessionState) SessionState {
	cloned := state
	cloned.Encounters = append([]EncounterState(nil), state.Encounters...)
	return cloned
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
