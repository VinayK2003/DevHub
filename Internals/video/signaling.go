package video

import (
    "encoding/json"
    "log"
    "net/http"
    "sync"
    "github.com/gorilla/websocket"
)

var AllRooms RoomMap

type response struct {
    RoomID string `json:"room_id"`
}

type BroadcastMessage struct {
    Message map[string]interface{}
    RoomID  string
    Client  *websocket.Conn
}

var (
    broadcast = make(chan BroadcastMessage)
    broadcastingStarted sync.Once
    broadcastMutex      sync.Mutex
)

func broadcaster() {
    for {
        msg := <-broadcast
        broadcastMutex.Lock()
        for _, client := range AllRooms.Map[msg.RoomID] {
            if client.Conn != msg.Client {
                err := client.Conn.WriteJSON(msg.Message)
                if err != nil {
                    log.Printf("Error broadcasting message: %v", err)
                    client.Conn.Close()
                }
            }
        }
        broadcastMutex.Unlock()
    }
}

var upgrader = websocket.Upgrader{
    CheckOrigin: func(r *http.Request) bool {
        return true
    },
}

func CreateRoomRequestHandler(w http.ResponseWriter, r *http.Request) {
    w.Header().Set("Access-Control-Allow-Origin", "*")
    roomID := AllRooms.CreateRoom()
    json.NewEncoder(w).Encode(response{RoomID: roomID})
}

func JoinRoomRequestHandler(w http.ResponseWriter, r *http.Request) {
    query := r.URL.Query()
    roomID := query.Get("roomID")
    if roomID == "" {
        log.Println("roomID is missing, unable to join the call")
        http.Error(w, "Room ID is required", http.StatusBadRequest)
        return
    }

    ws, err := upgrader.Upgrade(w, r, nil)
    if err != nil {
        log.Printf("Unable to upgrade http to websocket: %v", err)
        return
    }

    defer func() {
        ws.Close()
    }()

    AllRooms.InsertIntoRoom(roomID, false, ws)

    broadcastingStarted.Do(func() {
        go broadcaster()
    })
    
    for {
        var msg BroadcastMessage
        err := ws.ReadJSON(&msg.Message)
        if err != nil {
            if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
                log.Printf("Error reading message: %v", err)
            }
            break
        }
        msg.Client = ws
        msg.RoomID = roomID
        broadcast <- msg
    }
}

