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

	log.Fatal(http.ListenAndServe("127.0.0.1:8080", nil))
}

func setupApp() {
	// http.Handle("/", http.FileServer(http.Dir("./web/views")))

	// output := http.FileServer(http.Dir("./web/static"))
	// http.Handle("/web/static/", http.StripPrefix("/web/static/", output))

	ctx := context.Background()

	video.AllRooms.Init()

	//create new manager for websocket traffic
	manager := chat.NewManager(ctx)
	http.HandleFunc("/ws", manager.ServeWebSocket)
	http.HandleFunc("/code", code.HandleConnection)
	http.HandleFunc("/create-room", video.CreateRoomRequestHandler)
	http.HandleFunc("/join-room", video.JoinRoomRequestHandler)
	code.StartServer()
}
