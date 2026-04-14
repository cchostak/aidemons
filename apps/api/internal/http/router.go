package transport

import (
	nethttp "net/http"

	"aidemons/api/internal/config"
	"aidemons/api/internal/http/handlers"
	"aidemons/api/internal/http/ws"
	"aidemons/api/internal/service"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
)

func NewRouter(cfg config.Config, db *pgxpool.Pool) *gin.Engine {
	router := gin.New()
	router.Use(gin.Logger(), gin.Recovery())
	router.Use(func(context *gin.Context) {
		context.Writer.Header().Set("Access-Control-Allow-Origin", cfg.WebOrigin)
		context.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		context.Writer.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")

		if context.Request.Method == nethttp.MethodOptions {
			context.AbortWithStatus(nethttp.StatusNoContent)
			return
		}

		context.Next()
	})

	worldService := service.NewWorldService()
	sessionService := service.NewSessionService(worldService)
	hub := ws.NewHub()
	go hub.Run()

	healthHandler := handlers.NewHealthHandler(db)
	worldHandler := handlers.NewWorldHandler(worldService)
	sessionHandler := handlers.NewSessionHandler(sessionService)
	combatHandler := handlers.NewCombatHandler(sessionService)
	socketHandler := handlers.NewSocketHandler(hub)

	router.GET("/healthz", healthHandler.Get)
	router.GET("/ws", socketHandler.Handle)

	api := router.Group("/api/v1")
	api.GET("/world/bootstrap", worldHandler.GetBootstrap)
	api.GET("/session/state", sessionHandler.GetState)
	api.POST("/combat/action", combatHandler.ResolveAction)

	return router
}
