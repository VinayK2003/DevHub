package video

import (
	"sync"

	"github.com/google/uuid"
	"github.com/gorilla/websocket"
)

type Participant struct {
	Host bool
	ID   string
	Conn *websocket.Conn
}

type RoomMap struct {
	mu  sync.RWMutex
	Map map[string][]Participant
}

func (r *RoomMap) Init() {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.Map = make(map[string][]Participant)
}

func (r *RoomMap) Get(roomID string) []Participant {
	r.mu.RLock()
	defer r.mu.RUnlock()
	return r.Map[roomID]
}

// CreateRoom generates a unique room ID using UUID and registers the room.
func (r *RoomMap) CreateRoom() string {
	r.mu.Lock()
	defer r.mu.Unlock()

	roomID := uuid.New().String()
	r.Map[roomID] = []Participant{}
	return roomID
}

func (r *RoomMap) InsertIntoRoom(roomID string, host bool, conn *websocket.Conn) {
	r.mu.Lock()
	defer r.mu.Unlock()

	participant := Participant{
		Host: host,
		ID:   uuid.New().String(),
		Conn: conn,
	}
	r.Map[roomID] = append(r.Map[roomID], participant)
}

func (r *RoomMap) DeleteRoom(roomID string) {
	r.mu.Lock()
	defer r.mu.Unlock()
	delete(r.Map, roomID)
}

func (r *RoomMap) RemoveParticipant(roomID string, conn *websocket.Conn) {
	r.mu.Lock()
	defer r.mu.Unlock()

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
