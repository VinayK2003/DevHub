package chat

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"net/http"
	"sync"
	"time"

	"github.com/gorilla/websocket"
)

//websocket variables

var (
	websocketUpgrader = websocket.Upgrader{
		ReadBufferSize:  1024,
		WriteBufferSize: 1024,
	}
)

type Manager struct {
	sync.RWMutex
	clients  ClientList
	handlers map[string]EventHandler
}

// factory function for creating a Manager
func NewManager(ctx context.Context) *Manager {
	manager := &Manager{
		clients:  make(ClientList),
		handlers: make(map[string]EventHandler),
	}

	manager.setUpEventHandlers()
	return manager
}

func (manager *Manager) setUpEventHandlers() {
	manager.handlers[EventSendMessage] = SendMessage
}

func SendMessage(event Event, client *Client) error {
	var chatEvent SendMessageEvent

	err := json.Unmarshal(event.Payload, &chatEvent)
	if err != nil {
		return fmt.Errorf("bad payload in request: %v", err)
	}

	var broadcastMessage NewMessageEvent

	broadcastMessage.TimeSent = time.Now()
	broadcastMessage.Message = chatEvent.Message
	broadcastMessage.From = chatEvent.From

	data, err := json.Marshal(broadcastMessage)
	if err != nil {
		return fmt.Errorf("failed to marshal broadcast msg %v", err)
	}
	log.Println("data is ",data)

	broadcastMsgEvent := Event{
		Payload: data,
		Type:    EventIncomingMessage,
	}

	//dispatch to all connected client channel
	for client := range client.manager.clients {
		client.egress <- broadcastMsgEvent
	}

	return nil
}

// set up websocket server

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true
	},
}
func (manager *Manager) ServeWebSocket(writer http.ResponseWriter, request *http.Request) {
	// websocketUpgrader.CheckOrigin = func(r *http.Request) bool { return true }
	// upgrade regular http connection into websocket
	connection, err := upgrader.Upgrade(writer, request, nil)

	if err != nil {
		log.Printf("Unable to upgrade http connection %v", err)
		return
	}

	log.Println("new client connected")

	//create a new client
	newClient := NewClient(connection, manager)

	//add new client to manager's list
	manager.addClient(newClient)
	go func() {
        for {
            _, p, err := connection.ReadMessage()
            if err != nil {
                log.Println("Error reading message:", err)
                return
            }
            log.Printf("Received raw message: %s", string(p))

            var event Event
            if err := json.Unmarshal(p, &event); err != nil {
                log.Println("Error unmarshaling event:", err)
                continue
            }

            log.Printf("Parsed event: %+v", event)

            if err := manager.routeEvent(event, newClient); err != nil {
                log.Println("Error handling message:", err)
            }
        }
    }()

	//read all messages in channel
	go newClient.readMessages()

	//set up write message ability
	go newClient.writeMessage()
}

func (manager *Manager) addClient(client *Client) {
	// to make sure there's no race condition or deadlock
	// when adding new clients concurrently
	manager.Lock()
	defer manager.Unlock()
	manager.clients[client] = true
}

func (manager *Manager) removeClient(client *Client) {
	manager.Lock()
	defer manager.Unlock()

	if _, ok := manager.clients[client]; ok {
		client.connection.Close()
		delete(manager.clients, client)
	}
}

func (manager *Manager) routeEvent(event Event, client *Client) error {
	//check if the event type is part of the handlers within
	log.Printf("Received event: %+v", event) // Log the entire event
    
    if event.Type == "" {
        return errors.New("Event type is empty")
    }
	handler, ok := manager.handlers[event.Type]
	if !ok {
		log.Println("unsupported event")
		return errors.New("Unsupported event")
	}
	
	log.Println("Received the event of type ", event.Type)
	

	err := handler(event, client)

	if err != nil {
		return err
	}

	return nil
}
