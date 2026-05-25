package main

import (
	"context"
	"log"
	"net/http"
	"project-streamify/Internals/auth"
	"project-streamify/Internals/chat"
	"project-streamify/Internals/code"
	"project-streamify/Internals/video"
	"github.com/joho/godotenv"
)

func main() {
	err := godotenv.Load()

	if err != nil {
		log.Fatal("Error loading .env")
	}

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
	http.HandleFunc("/run-code", code.ExecuteCode)
	http.HandleFunc("/create-room", video.CreateRoomRequestHandler)
	http.HandleFunc("/join-room", video.JoinRoomRequestHandler)
	http.HandleFunc("/api/login", auth.Login)
	http.HandleFunc("/api/generate-code", code.GenerateCode)
	code.StartServer()
}
