package main

import (
	"context"
	"log"

	"aidemons/api/internal/config"
	transport "aidemons/api/internal/http"
	"aidemons/api/internal/store"
)

func main() {
	cfg := config.Load()

	db, err := store.OpenPostgres(context.Background(), cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("connect postgres: %v", err)
	}
	if db != nil {
		defer db.Close()
	}

	router := transport.NewRouter(cfg, db)

	log.Printf("aidemons api listening on :%s", cfg.Port)
	if err := router.Run(":" + cfg.Port); err != nil {
		log.Fatalf("run router: %v", err)
	}
}
