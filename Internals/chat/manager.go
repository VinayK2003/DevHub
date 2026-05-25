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

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		origin := r.Header.Get("Origin")
		return origin == "http://localhost:3000"
	},
}

type Manager struct {
	sync.RWMutex
	clients  ClientList
	handlers map[string]EventHandler
	ctx      context.Context
	cancel   context.CancelFunc
}

func NewManager(ctx context.Context) *Manager {
	ctx, cancel := context.WithCancel(ctx)
	manager := &Manager{
		clients:  make(ClientList),
		handlers: make(map[string]EventHandler),
		ctx:      ctx,
		cancel:   cancel,
	}
	manager.setUpEventHandlers()
	return manager
}

// Shutdown gracefully stops the manager and all client goroutines.
func (manager *Manager) Shutdown() {
	manager.cancel()
}

func (manager *Manager) setUpEventHandlers() {
	manager.handlers[EventSendMessage] = SendMessage
}

func SendMessage(event Event, client *Client) error {
	var chatEvent SendMessageEvent

	if err := json.Unmarshal(event.Payload, &chatEvent); err != nil {
		return fmt.Errorf("bad payload in request: %v", err)
	}

	broadcastMessage := NewMessageEvent{
		TimeSent: time.Now(),
		Message:  chatEvent.Message,
		From:     chatEvent.From,
	}

	data, err := json.Marshal(broadcastMessage)
	if err != nil {
		return fmt.Errorf("failed to marshal broadcast message: %v", err)
	}

	broadcastMsgEvent := Event{
		Payload: data,
		Type:    EventIncomingMessage,
	}

	client.manager.RLock()
	defer client.manager.RUnlock()
	for c := range client.manager.clients {
		c.egress <- broadcastMsgEvent
	}

	return nil
}

func (manager *Manager) ServeWebSocket(writer http.ResponseWriter, request *http.Request) {
	connection, err := upgrader.Upgrade(writer, request, nil)
	if err != nil {
		log.Printf("Unable to upgrade http connection: %v", err)
		return
	}

	log.Println("new client connected")
	newClient := NewClient(connection, manager)
	manager.addClient(newClient)

	// Single reader goroutine — gorilla/websocket forbids concurrent readers.
	go newClient.readMessages()
	go newClient.writeMessage()
}

func (manager *Manager) addClient(client *Client) {
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
	if event.Type == "" {
		return errors.New("event type is empty")
	}
	handler, ok := manager.handlers[event.Type]
	if !ok {
		return fmt.Errorf("unsupported event type: %s", event.Type)
	}
	return handler(event, client)
}
