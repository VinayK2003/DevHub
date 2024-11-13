package main

import (
	"context"
	"log"
	"net/http"
	"project-streamify/Internals/chat"
	"project-streamify/Internals/code"
	"project-streamify/Internals/video"
)

func main() {
	setupApp()
	http.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
        w.WriteHeader(http.StatusOK)
        w.Write([]byte("Backend is running"))
    })

    log.Fatal(http.ListenAndServe(":8080", nil))
}

func setupApp() {
	ctx := context.Background()

	video.AllRooms.Init()
	manager := chat.NewManager(ctx)
	http.HandleFunc("/ws", manager.ServeWebSocket)
	http.HandleFunc("/code", code.HandleConnection)
	http.HandleFunc("/create-room", video.CreateRoomRequestHandler)
	http.HandleFunc("/join-room", video.JoinRoomRequestHandler)
	code.StartServer()
}
