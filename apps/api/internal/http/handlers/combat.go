package handlers

import (
	nethttp "net/http"

	"aidemons/api/internal/service"

	"github.com/gin-gonic/gin"
)

type CombatHandler struct {
	sessionService *service.SessionService
}

func NewCombatHandler(sessionService *service.SessionService) *CombatHandler {
	return &CombatHandler{sessionService: sessionService}
}

func (handler *CombatHandler) ResolveAction(context *gin.Context) {
	var request service.CombatActionRequest
	if err := context.ShouldBindJSON(&request); err != nil {
		context.JSON(nethttp.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	result, err := handler.sessionService.ResolveAction(request)
	if err != nil {
		context.JSON(nethttp.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	context.JSON(nethttp.StatusOK, result)
}
