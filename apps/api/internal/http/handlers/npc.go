package handlers

import (
	nethttp "net/http"

	"aidemons/api/internal/service"

	"github.com/gin-gonic/gin"
)

type NPCHandler struct {
	sessionService *service.SessionService
}

func NewNPCHandler(sessionService *service.SessionService) *NPCHandler {
	return &NPCHandler{sessionService: sessionService}
}

func (handler *NPCHandler) Interact(context *gin.Context) {
	var request service.NPCInteractRequest
	if err := context.ShouldBindJSON(&request); err != nil {
		context.JSON(nethttp.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	result, err := handler.sessionService.InteractNPC(request)
	if err != nil {
		context.JSON(nethttp.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	context.JSON(nethttp.StatusOK, result)
}
