package ws

import (
	"encoding/json"
	"log"

	"github.com/gorilla/websocket"
)

type Hub struct {
	Register   chan *Client
	Unregister chan *Client
	Broadcast  chan []byte
	clients    map[*Client]bool
}

type Client struct {
	hub  *Hub
	conn *websocket.Conn
	send chan []byte
}

func NewHub() *Hub {
	return &Hub{
		Register:   make(chan *Client),
		Unregister: make(chan *Client),
		Broadcast:  make(chan []byte),
		clients:    make(map[*Client]bool),
	}
}

func NewClient(hub *Hub, connection *websocket.Conn) *Client {
	return &Client{
		hub:  hub,
		conn: connection,
		send: make(chan []byte, 16),
	}
}

func (hub *Hub) Run() {
	for {
		select {
		case client := <-hub.Register:
			hub.clients[client] = true
			welcome, err := json.Marshal(map[string]any{
				"type":   "world:welcome",
				"online": len(hub.clients),
			})
			if err == nil {
				client.send <- welcome
			}
		case client := <-hub.Unregister:
			if _, exists := hub.clients[client]; exists {
				delete(hub.clients, client)
				close(client.send)
			}
		case message := <-hub.Broadcast:
			for client := range hub.clients {
				select {
				case client.send <- message:
				default:
					close(client.send)
					delete(hub.clients, client)
				}
			}
		}
	}
}

func (client *Client) ReadPump() {
	defer func() {
		client.hub.Unregister <- client
		_ = client.conn.Close()
	}()

	for {
		_, message, err := client.conn.ReadMessage()
		if err != nil {
			return
		}

		envelope, marshalErr := json.Marshal(map[string]any{
			"type":    "world:echo",
			"message": string(message),
		})
		if marshalErr != nil {
			log.Printf("marshal websocket payload: %v", marshalErr)
			continue
		}

		client.hub.Broadcast <- envelope
	}
}

func (client *Client) WritePump() {
	defer func() {
		_ = client.conn.Close()
	}()

	for message := range client.send {
		if err := client.conn.WriteMessage(websocket.TextMessage, message); err != nil {
			return
		}
	}
}
