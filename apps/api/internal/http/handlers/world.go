package handlers

import (
	nethttp "net/http"

	"aidemons/api/internal/service"

	"github.com/gin-gonic/gin"
)

type WorldHandler struct {
	worldService *service.WorldService
}

func NewWorldHandler(worldService *service.WorldService) *WorldHandler {
	return &WorldHandler{worldService: worldService}
}

func (handler *WorldHandler) GetBootstrap(context *gin.Context) {
	context.JSON(nethttp.StatusOK, handler.worldService.Bootstrap())
}
