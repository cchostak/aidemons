package handlers

import (
	"context"
	nethttp "net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
)

type HealthHandler struct {
	db *pgxpool.Pool
}

func NewHealthHandler(db *pgxpool.Pool) *HealthHandler {
	return &HealthHandler{db: db}
}

func (handler *HealthHandler) Get(ctx *gin.Context) {
	databaseStatus := "disabled"

	if handler.db != nil {
		pingContext, cancel := context.WithTimeout(ctx.Request.Context(), 2*time.Second)
		defer cancel()

		if err := handler.db.Ping(pingContext); err != nil {
			ctx.JSON(nethttp.StatusServiceUnavailable, gin.H{
				"status":   "degraded",
				"database": "unreachable",
				"error":    err.Error(),
			})
			return
		}

		databaseStatus = "ok"
	}

	ctx.JSON(nethttp.StatusOK, gin.H{
		"status":   "ok",
		"database": databaseStatus,
	})
}
