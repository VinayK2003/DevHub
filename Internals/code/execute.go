package code

import (
	"context"
	"encoding/json"
	"io"
	"net/http"
	"os"
	"os/exec"
	"bytes"
	"fmt"
	"errors"
	"time"
)

type ExecuteRequest struct {
	Language string `json:"language"`
	Code     string `json:"code"`
}

type ExecuteResponse struct {
	Output string `json:"output"`
	Error  string `json:"error,omitempty"`
}

type GenerateCodeRequest struct {
	Prompt string `json:"prompt"`
}

type GenerateCodeResponse struct {
	GeneratedCode  string `json:"generatedCode,omitempty"`
	Error string `json:"error,omitempty"`
}

func ExecuteCode(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusNoContent)
		return
	}
	if r.Method != http.MethodPost {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}

	var req ExecuteRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(ExecuteResponse{Error: "invalid request"})
		return
	}

	switch req.Language {
	case "python":
		runPython(w, req.Code)
	default:
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(ExecuteResponse{Error: "language not supported"})
	}
}

func runPython(w http.ResponseWriter, code string) {
	tmp, err := os.CreateTemp("", "snippet-*.py")
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(ExecuteResponse{Error: "failed to create temp file"})
		return
	}
	defer os.Remove(tmp.Name())
	_, _ = io.WriteString(tmp, code)
	_ = tmp.Close()

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	cmdPath, err := exec.LookPath("python")
	if err != nil {
		cmdPath, err = exec.LookPath("py")
		if err != nil {
			w.WriteHeader(http.StatusInternalServerError)
			json.NewEncoder(w).Encode(ExecuteResponse{Error: "python interpreter not found"})
			return
		}
	}

	cmd := exec.CommandContext(ctx, cmdPath, tmp.Name())
	out, err := cmd.CombinedOutput()
	if ctx.Err() == context.DeadlineExceeded {
		w.WriteHeader(http.StatusGatewayTimeout)
		json.NewEncoder(w).Encode(ExecuteResponse{Error: "execution timed out"})
		return
	}

	if err != nil {
		json.NewEncoder(w).Encode(ExecuteResponse{Output: string(out), Error: err.Error()})
		return
	}
	json.NewEncoder(w).Encode(ExecuteResponse{Output: string(out)})
}


func GenerateCode(w http.ResponseWriter, r *http.Request){
	 
	w.Header().Set("Access-Control-Allow-Origin","*");
	w.Header().Set("Access-Control-Allow-Methods","POST,OPTIONS");
	w.Header().Set("Access-Control-Allow-Headers","Content-Type");

	if r.Method==http.MethodOptions{
		w.WriteHeader(http.StatusNoContent)
		return
	} 
	if r.Method!= http.MethodPost{
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}

	var req GenerateCodeRequest

	if err := json.NewDecoder(r.Body).Decode(&req); err!=nil{
		w.WriteHeader(http.StatusBadRequest)

		json.NewEncoder(w).Encode(
			GenerateCodeResponse{
				Error:"invalid Request Body",
			},
		)
		return
	}

	if req.Prompt==""{
		w.WriteHeader(http.StatusBadRequest)

		json.NewEncoder(w).Encode(
			GenerateCodeResponse{
				Error: "Prompt is Required",
			},
		)
		return
	}

	generatedCode,err:= generateWithGemini(req.Prompt)

	if err!=nil{
		w.WriteHeader(http.StatusInternalServerError)
		
		json.NewEncoder(w).Encode(
			GenerateCodeResponse{
				Error:err.Error(),
			},
		)
		return
	}

	json.NewEncoder(w).Encode(
		GenerateCodeResponse{
			GeneratedCode:generatedCode,
		},
	)
}


func generateWithGemini(prompt string)(string,error){
	apiKey := os.Getenv("GEMINI_API_KEY")
	url:= "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=" + apiKey

	fmt.Println("url",url)

	payload:= map[string]interface{}{
		"contents":[]map[string]interface{}{
			{
				"parts":[]map[string]string{
					{
						"text":prompt,
					},
				},
			},
		},
	}

	jsonData,err := json.Marshal(payload)

	if err!=nil{
		return "",err
	}
	ctx, cancel := context.WithTimeout(
		context.Background(),
		15*time.Second,
	)

	defer cancel()

	req,err:= http.NewRequestWithContext(
		ctx,
		http.MethodPost,
		url,
		bytes.NewBuffer(jsonData),
	)

	if err!= nil{
		return "",err
	}

	req.Header.Set("Content-Type","application/json")

	client:= &http.Client{}

	resp,err:=client.Do(req)

	if err!=nil{
		return "",err;
	}

	defer resp.Body.Close();

	body,err:= io.ReadAll(resp.Body)
	if err!=nil{
		return "",err
	}

	if resp.StatusCode!=http.StatusOK{
		return "", errors.New(string(body))
	}

	var result map[string]interface{}

	err=json.Unmarshal(body,&result)

	if err!=nil{
		return "",err
	}

	candidates:= result["candidates"].([]interface{})

	candidate := candidates[0].(map[string]interface{})
	content := candidate["content"].(map[string]interface{})
	parts := content["parts"].([]interface{})
	part := parts[0].(map[string]interface{})
	text := part["text"].(string)

	return text,nil
}