package character

type Profile struct {
	ID          string `json:"id"`
	AccountID   string `json:"accountId"`
	Name        string `json:"name"`
	Class       string `json:"class"`
	Level       int    `json:"level"`
	Power       int    `json:"power"`
	MapName     string `json:"mapName"`
	PositionX   int    `json:"positionX"`
	PositionY   int    `json:"positionY"`
	BondedPetID string `json:"bondedPetId"`
}
