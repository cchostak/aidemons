package config

import "os"

type Config struct {
	Port        string
	DatabaseURL string
	WebOrigin   string
}

func Load() Config {
	return Config{
		Port:        getEnv("PORT", "8080"),
		DatabaseURL: getEnv("DATABASE_URL", "postgres://aidemons:aidemons@localhost:5433/aidemons?sslmode=disable"),
		WebOrigin:   getEnv("WEB_ORIGIN", "http://localhost:5173"),
	}
}

func getEnv(key string, fallback string) string {
	if value, ok := os.LookupEnv(key); ok {
		return value
	}

	return fallback
}
