package code

import (
	"log"
	"net/http"
	"sync"

	"github.com/gorilla/websocket"
)

// editorHub manages all collaborative editor WebSocket connections.
type editorHub struct {
	clients   map[*websocket.Conn]bool
	broadcast chan string
	mu        sync.Mutex
}

var hub = &editorHub{
	clients:   make(map[*websocket.Conn]bool),
	broadcast: make(chan string, 256),
}

var wsUpgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool { return true },
}

func HandleConnection(w http.ResponseWriter, r *http.Request) {
	conn, err := wsUpgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("editor: upgrade error: %v", err)
		return
	}
	defer func() {
		hub.mu.Lock()
		delete(hub.clients, conn)
		hub.mu.Unlock()
		conn.Close()
	}()

	hub.mu.Lock()
	hub.clients[conn] = true
	hub.mu.Unlock()

	for {
		_, msg, err := conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("editor: read error: %v", err)
			}
			break
		}
		hub.broadcast <- string(msg)
	}
}

func handleMessages() {
	for msg := range hub.broadcast {
		hub.mu.Lock()
		for conn := range hub.clients {
			if err := conn.WriteMessage(websocket.TextMessage, []byte(msg)); err != nil {
				log.Printf("editor: write error: %v", err)
				conn.Close()
				delete(hub.clients, conn)
			}
		}
		hub.mu.Unlock()
	}
}

// StartBroadcaster starts the background message relay goroutine.
func StartBroadcaster() {
	go handleMessages()
}
