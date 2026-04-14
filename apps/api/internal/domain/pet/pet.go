package pet

type Profile struct {
	ID            string   `json:"id"`
	Name          string   `json:"name"`
	Role          string   `json:"role"`
	Affinity      string   `json:"affinity"`
	Blurb         string   `json:"blurb"`
	Skills        []string `json:"skills"`
	EvolutionHint string   `json:"evolutionHint"`
}
