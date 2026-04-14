package handlers

import (
	nethttp "net/http"

	"aidemons/api/internal/service"

	"github.com/gin-gonic/gin"
)

type SessionHandler struct {
	sessionService *service.SessionService
}

func NewSessionHandler(sessionService *service.SessionService) *SessionHandler {
	return &SessionHandler{sessionService: sessionService}
}

func (handler *SessionHandler) GetState(context *gin.Context) {
	context.JSON(nethttp.StatusOK, handler.sessionService.State())
}
