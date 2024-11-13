
package video

import (
    "math/rand"
    "sync"
    "time"
    "github.com/google/uuid"
    "github.com/gorilla/websocket"
)

type Participant struct {
    Host bool
    ID   string
    Conn *websocket.Conn
}

type RoomMap struct {
    Mutex sync.RWMutex
    Map   map[string][]Participant
}

func (r *RoomMap) Init() {
    r.Mutex.Lock()
    defer r.Mutex.Unlock()
    r.Map = make(map[string][]Participant)
}

func (r *RoomMap) Get(roomID string) []Participant {
    r.Mutex.RLock()
    defer r.Mutex.RUnlock()
    return r.Map[roomID]
}

func (r *RoomMap) CreateRoom() string {
    r.Mutex.Lock()
    defer r.Mutex.Unlock()

    rand.Seed(time.Now().UnixNano())
    letters := []rune("abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ123456789")
    b := make([]rune, 8)
    for i := range b {
        b[i] = letters[rand.Intn(len(letters))]
    }
    roomID := string(b)
    r.Map[roomID] = []Participant{}
    return roomID
}

func (r *RoomMap) InsertIntoRoom(roomID string, host bool, conn *websocket.Conn) {
    r.Mutex.Lock()
    defer r.Mutex.Unlock()
    
    clientID := uuid.New().String()
    participant := Participant{
        Host: host,
        ID:   clientID,
        Conn: conn,
    }
    r.Map[roomID] = append(r.Map[roomID], participant)
}

func (r *RoomMap) DeleteRoom(roomID string) {
    r.Mutex.Lock()
    defer r.Mutex.Unlock()
    delete(r.Map, roomID)
}

func (r *RoomMap) RemoveParticipant(roomID string, conn *websocket.Conn) {
    r.Mutex.Lock()
    defer r.Mutex.Unlock()

    participants := r.Map[roomID]
    for i, p := range participants {
        if p.Conn == conn {
            r.Map[roomID] = append(participants[:i], participants[i+1:]...)
            break
        }
    }
    if len(r.Map[roomID]) == 0 {
        delete(r.Map, roomID)
    }
}
