package main

import (
	"context"
	"log"
	"net/http"
	"os"

	"project-streamify/Internals/auth"
	"project-streamify/Internals/chat"
	"project-streamify/Internals/code"
	"project-streamify/Internals/video"

	"github.com/joho/godotenv"
)

func main() {
	if err := godotenv.Load(); err != nil {
		log.Fatal("error loading .env file")
	}

	mux := setupApp()

	addr := ":" + getEnv("PORT", "8080")
	log.Printf("server listening on %s", addr)
	log.Fatal(http.ListenAndServe(addr, mux))
}

// corsMiddleware applies CORS headers and handles preflight OPTIONS requests.
// Adjust allowedOrigin to match your deployment environment.
func corsMiddleware(allowedOrigin string, next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", allowedOrigin)
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		w.Header().Set("Access-Control-Allow-Credentials", "true")

		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next(w, r)
	}
}

func setupApp() http.Handler {
	ctx := context.Background()
	mux := http.NewServeMux()

	origin := getEnv("ALLOWED_ORIGIN", "http://localhost:3000")

	video.AllRooms.Init()
	manager := chat.NewManager(ctx)

	mux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("backend is running"))
	})

	// WebSocket endpoints — CORS is handled at the upgrader level via CheckOrigin.
	mux.HandleFunc("/ws", manager.ServeWebSocket)
	mux.HandleFunc("/code", code.HandleConnection)
	mux.HandleFunc("/join-room", video.JoinRoomRequestHandler)

	// HTTP endpoints — wrapped with CORS middleware.
	mux.HandleFunc("/run-code", corsMiddleware(origin, code.ExecuteCode))
	mux.HandleFunc("/create-room", corsMiddleware(origin, video.CreateRoomRequestHandler))
	mux.HandleFunc("/api/login", corsMiddleware(origin, auth.Login))
	mux.HandleFunc("/api/generate-code", corsMiddleware(origin, code.GenerateCode))

	code.StartBroadcaster()

	return mux
}

// getEnv returns the value of the environment variable key,
// falling back to fallback if the variable is not set.
func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
