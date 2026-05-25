package auth

import (
	"encoding/json"
	"net/http"
)

type loginRequest struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

type loginResponse struct {
	Message  string `json:"message"`
	Username string `json:"username"`
}

// Login handles POST /api/login.
// NOTE: This is a stub — replace credential validation with a real DB lookup + bcrypt.
func Login(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var creds loginRequest
	if err := json.NewDecoder(r.Body).Decode(&creds); err != nil {
		http.Error(w, "invalid JSON body", http.StatusBadRequest)
		return
	}

	if creds.Username == "" || creds.Password == "" {
		http.Error(w, "username and password are required", http.StatusBadRequest)
		return
	}

	// TODO: validate credentials against a database with bcrypt comparison.
	// For now this is a placeholder that accepts any non-empty credentials.

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(loginResponse{
		Message:  "login successful",
		Username: creds.Username,
		// Password is intentionally omitted from the response.
	})
}
