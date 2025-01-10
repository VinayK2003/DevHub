package auth

import (
	"encoding/json"
	"fmt"
	"net/http"
)

// type User struct{
// 	username string
// 	password string
// }

func Login(w http.ResponseWriter,r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "http://localhost:3000")
	w.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS")       
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")        
	w.Header().Set("Access-Control-Allow-Credentials", "true")  
	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusOK) 
		return
	}
	if r.Method!=http.MethodPost{
		http.Error(w, "Invalid request method", http.StatusMethodNotAllowed)
		return
	}
	var credentials map[string]string
	err:=json.NewDecoder(r.Body).Decode(&credentials)
	if err!=nil{
		http.Error(w, "Invalid JSON body", http.StatusBadRequest)
		return
	}

	username:=credentials["username"]
	password:=credentials["password"]
	fmt.Println(username,password)
	respone:=map[string]string{
		"message":"Login Successful",
		"username":username,
		"password":password,
	}
	w.WriteHeader(http.StatusAccepted)
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(respone)
}