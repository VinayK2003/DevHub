package chat

import (
	"encoding/json"
	"fmt"
	"log"

	"github.com/gorilla/websocket"
)

type ClientList map[*Client]bool

type Client struct {
	connection *websocket.Conn
	egress     chan Event
	manager    *Manager
}

func NewClient(connection *websocket.Conn, manager *Manager) *Client {
	client := &Client{
		connection: connection,
		manager:    manager,
		egress:     make(chan Event),
	}

	return client
}

func (client *Client) writeMessage() {
	defer func() {
		client.manager.removeClient(client)
	}()

	for {
		select {
		case message, ok := <-client.egress:
			if !ok {
				err := client.connection.WriteMessage(websocket.CloseMessage, nil)
				if err != nil {
					log.Println("connection closed: ", err)
				}
				return
			}

			data, err := json.Marshal(message)

			if err != nil {
				log.Println(err)
				return
			}

			if err := client.connection.WriteMessage(websocket.TextMessage, data); err != nil {
				log.Printf("failed to send message: %v", err)
			}

			log.Println("message dispatched")
		}
	}
}

func (client *Client) readMessages() {
	defer func() {
		client.manager.removeClient(client)
	}()

	for {
		_, payload, err := client.connection.ReadMessage()

		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("error reading messages %v", err)
			}
			break
		}

		var request Event
		fmt.Println(payload)

		if err := json.Unmarshal(payload, &request); err != nil {
			log.Printf("error marshalling event :%v", err)
		}
		
		routeError := client.manager.routeEvent(request, client)

		if routeError != nil {
			log.Printf("error handling message:%v", routeError)
		}
	}
}
