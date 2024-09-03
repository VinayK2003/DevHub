package code

import (
    "github.com/gorilla/websocket"
    "net/http"
    "sync"
)

var upgrader = websocket.Upgrader{
    CheckOrigin: func(r *http.Request) bool { return true },
}

var clients = make(map[*websocket.Conn]bool)
var broadcast = make(chan string)
var mutex = &sync.Mutex{}

func HandleConnection(w http.ResponseWriter, r *http.Request) {
    conn, err := upgrader.Upgrade(w, r, nil)
    if err != nil {
        return
    }
    defer conn.Close()
    clients[conn] = true

    for {
        _, msg, err := conn.ReadMessage()
        if err != nil {
            delete(clients, conn)
            break
        }
        broadcast <- string(msg)
    }
}

func handleMessages() {
    for {
        msg := <-broadcast
        mutex.Lock()
        for client := range clients {
            err := client.WriteMessage(websocket.TextMessage, []byte(msg))
            if err != nil {
                client.Close()
                delete(clients, client)
            }
        }
        mutex.Unlock()
    }
}
func StartServer() {
    go handleMessages() // Start handling messages in a goroutine
}
