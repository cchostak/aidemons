package pvp

type Queue struct {
	ID               string `json:"id"`
	Name             string `json:"name"`
	Ruleset          string `json:"ruleset"`
	RecommendedPower int    `json:"recommendedPower"`
	RewardFocus      string `json:"rewardFocus"`
}

type MatchSummary struct {
	ID         string `json:"id"`
	QueueID    string `json:"queueId"`
	WinnerID   string `json:"winnerId"`
	DurationMS int    `json:"durationMs"`
}
