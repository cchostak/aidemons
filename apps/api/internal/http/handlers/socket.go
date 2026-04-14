package handlers

import (
	nethttp "net/http"

	"aidemons/api/internal/http/ws"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
)

type SocketHandler struct {
	hub      *ws.Hub
	upgrader websocket.Upgrader
}

func NewSocketHandler(hub *ws.Hub) *SocketHandler {
	return &SocketHandler{
		hub: hub,
		upgrader: websocket.Upgrader{
			CheckOrigin: func(request *nethttp.Request) bool {
				return true
			},
		},
	}
}

func (handler *SocketHandler) Handle(context *gin.Context) {
	connection, err := handler.upgrader.Upgrade(context.Writer, context.Request, nil)
	if err != nil {
		context.JSON(nethttp.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	client := ws.NewClient(handler.hub, connection)
	handler.hub.Register <- client

	go client.WritePump()
	go client.ReadPump()
}
