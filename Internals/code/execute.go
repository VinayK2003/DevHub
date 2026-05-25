package code

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"os"
	"os/exec"
	"time"
)

// ExecuteRequest is the payload for POST /run-code.
type ExecuteRequest struct {
	Language string `json:"language"`
	Code     string `json:"code"`
}

// ExecuteResponse is the response for POST /run-code.
type ExecuteResponse struct {
	Output string `json:"output"`
	Error  string `json:"error,omitempty"`
}

// GenerateCodeRequest is the payload for POST /api/generate-code.
type GenerateCodeRequest struct {
	Prompt string `json:"prompt"`
}

// GenerateCodeResponse is the response for POST /api/generate-code.
type GenerateCodeResponse struct {
	GeneratedCode string `json:"generatedCode,omitempty"`
	Error         string `json:"error,omitempty"`
}

// --- Gemini API response shape ---

type geminiPart struct {
	Text string `json:"text"`
}

type geminiContent struct {
	Parts []geminiPart `json:"parts"`
}

type geminiCandidate struct {
	Content geminiContent `json:"content"`
}

type geminiResponse struct {
	Candidates []geminiCandidate `json:"candidates"`
}

// writeJSON is a helper that sets Content-Type and encodes v as JSON.
func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(v)
}

// ExecuteCode handles POST /run-code.
// CORS headers are applied by the middleware in main.go.
func ExecuteCode(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, ExecuteResponse{Error: "method not allowed"})
		return
	}

	var req ExecuteRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, ExecuteResponse{Error: "invalid request body"})
		return
	}

	switch req.Language {
	case "python":
		runPython(w, req.Code)
	default:
		writeJSON(w, http.StatusBadRequest, ExecuteResponse{Error: fmt.Sprintf("language %q is not supported", req.Language)})
	}
}

func runPython(w http.ResponseWriter, code string) {
	tmp, err := os.CreateTemp("", "snippet-*.py")
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, ExecuteResponse{Error: "failed to create temp file"})
		return
	}
	defer os.Remove(tmp.Name())

	if _, err = io.WriteString(tmp, code); err != nil {
		writeJSON(w, http.StatusInternalServerError, ExecuteResponse{Error: "failed to write temp file"})
		return
	}
	tmp.Close()

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	cmdPath, err := exec.LookPath("python3")
	if err != nil {
		cmdPath, err = exec.LookPath("python")
		if err != nil {
			writeJSON(w, http.StatusInternalServerError, ExecuteResponse{Error: "python interpreter not found"})
			return
		}
	}

	cmd := exec.CommandContext(ctx, cmdPath, tmp.Name())
	out, err := cmd.CombinedOutput()

	if ctx.Err() == context.DeadlineExceeded {
		writeJSON(w, http.StatusGatewayTimeout, ExecuteResponse{Error: "execution timed out"})
		return
	}

	if err != nil {
		writeJSON(w, http.StatusOK, ExecuteResponse{Output: string(out), Error: err.Error()})
		return
	}
	writeJSON(w, http.StatusOK, ExecuteResponse{Output: string(out)})
}

// GenerateCode handles POST /api/generate-code.
// CORS headers are applied by the middleware in main.go.
func GenerateCode(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, GenerateCodeResponse{Error: "method not allowed"})
		return
	}

	var req GenerateCodeRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, GenerateCodeResponse{Error: "invalid request body"})
		return
	}

	if req.Prompt == "" {
		writeJSON(w, http.StatusBadRequest, GenerateCodeResponse{Error: "prompt is required"})
		return
	}

	generatedCode, err := generateWithGemini(req.Prompt)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, GenerateCodeResponse{Error: err.Error()})
		return
	}

	writeJSON(w, http.StatusOK, GenerateCodeResponse{GeneratedCode: generatedCode})
}

func generateWithGemini(prompt string) (string, error) {
	apiKey := os.Getenv("GEMINI_API_KEY")
	if apiKey == "" {
		return "", errors.New("GEMINI_API_KEY environment variable is not set")
	}

	url := "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=" + apiKey

	payload := map[string]interface{}{
		"contents": []map[string]interface{}{
			{
				"parts": []map[string]string{
					{"text": prompt},
				},
			},
		},
	}

	jsonData, err := json.Marshal(payload)
	if err != nil {
		return "", fmt.Errorf("failed to marshal request: %w", err)
	}

	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewBuffer(jsonData))
	if err != nil {
		return "", fmt.Errorf("failed to create request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return "", fmt.Errorf("gemini request failed: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", fmt.Errorf("failed to read response body: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("gemini API error (status %d): %s", resp.StatusCode, string(body))
	}

	// Use a typed struct — no unchecked type assertions.
	var result geminiResponse
	if err = json.Unmarshal(body, &result); err != nil {
		return "", fmt.Errorf("failed to parse gemini response: %w", err)
	}

	if len(result.Candidates) == 0 {
		return "", errors.New("gemini returned no candidates")
	}
	if len(result.Candidates[0].Content.Parts) == 0 {
		return "", errors.New("gemini candidate has no parts")
	}

	return result.Candidates[0].Content.Parts[0].Text, nil
}
