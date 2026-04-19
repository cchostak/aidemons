package handlers

import (
	nethttp "net/http"

	"aidemons/api/internal/service"

	"github.com/gin-gonic/gin"
)

type PetHandler struct {
	sessionService *service.SessionService
}

func NewPetHandler(sessionService *service.SessionService) *PetHandler {
	return &PetHandler{sessionService: sessionService}
}

func (handler *PetHandler) Select(context *gin.Context) {
	var request service.PetSelectRequest
	if err := context.ShouldBindJSON(&request); err != nil {
		context.JSON(nethttp.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	result, err := handler.sessionService.SelectPet(request)
	if err != nil {
		context.JSON(nethttp.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	context.JSON(nethttp.StatusOK, result)
}

func (handler *PetHandler) Evolve(context *gin.Context) {
	var request service.PetEvolveRequest
	if err := context.ShouldBindJSON(&request); err != nil {
		context.JSON(nethttp.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	result, err := handler.sessionService.EvolvePet(request)
	if err != nil {
		context.JSON(nethttp.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	context.JSON(nethttp.StatusOK, result)
}
