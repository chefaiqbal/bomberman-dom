package main

import (
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	ws "bomber/websocket"

)

func main() {
	if len(os.Args) != 1 {
		fmt.Println("Usage: go run . || go run main.go")
		return
	}

	fmt.Println("Starting the server...")

	publicDir := filepath.Join("..", "..", "public")

	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		http.ServeFile(w, r, filepath.Join(publicDir, "index.html"))
	})

	http.HandleFunc("/ws", ws.WsEndpoint)


	// Start the server
	err := http.ListenAndServe(":8080", nil)
	if err != nil {
		fmt.Println("Error starting server:", err)
	}
}
