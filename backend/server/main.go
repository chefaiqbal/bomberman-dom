package main

import (
	"context"
	"fmt"
	"log"
	"mime"
	"net/http"
	"os"
	"os/signal"
	"path/filepath"
	"strings"
	"syscall"
	"time"

	ws "bomber/websocket"
)

func init() {
	mime.AddExtensionType(".js", "application/javascript")
	mime.AddExtensionType(".mjs", "application/javascript")
	mime.AddExtensionType(".css", "text/css")
	mime.AddExtensionType(".html", "text/html")
	mime.AddExtensionType(".ico", "image/x-icon")
}

func serveFileWithMimeType(w http.ResponseWriter, r *http.Request, path string) {
	ext := strings.ToLower(filepath.Ext(path))
	switch ext {
	case ".js":
		w.Header().Set("Content-Type", "application/javascript")
	case ".html":
		w.Header().Set("Content-Type", "text/html")
	case ".css":
		w.Header().Set("Content-Type", "text/css")
	}
	http.ServeFile(w, r, path)
}

type spaHandler struct {
	staticPath string
	indexPath  string
}

func (h *spaHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	path := filepath.Join(h.staticPath, r.URL.Path)

	_, err := os.Stat(path)
	if os.IsNotExist(err) {
		if filepath.HasPrefix(r.URL.Path, "/core/") {
			corePath := filepath.Join(h.staticPath, "..", "..", "core", filepath.Base(r.URL.Path))
			if _, err := os.Stat(corePath); err == nil {
				serveFileWithMimeType(w, r, corePath)
				return
			}
		}
		serveFileWithMimeType(w, r, filepath.Join(h.staticPath, h.indexPath))
		return
	} else if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	serveFileWithMimeType(w, r, path)
}

func main() {
	publicDir := filepath.Join("..", "..", "public")
	absPublicDir, err := filepath.Abs(publicDir)
	if err != nil {
		log.Fatal(err)
	}

	staticDir := filepath.Join(absPublicDir, "static")
	fs := http.FileServer(http.Dir(staticDir))
	http.Handle("/static/", http.StripPrefix("/static/", fs))

	spa := &spaHandler{staticPath: absPublicDir, indexPath: "index.html"}

	http.HandleFunc("/ws", ws.WsEndpoint)

	http.Handle("/", spa)

	port := ":8081"

	stop := make(chan os.Signal, 1)
	signal.Notify(stop, os.Interrupt, syscall.SIGTERM)

	server := &http.Server{
		Addr:    port,
		Handler: nil,
	}

	go func() {
		fmt.Printf("Server starting on http://10.1.200.40%s\n", port)
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatal("Server failed to start:", err)
		}
	}()

	<-stop
	fmt.Println("\nShutting down server...")

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	ws.CleanupOldSessions()

	if err := server.Shutdown(ctx); err != nil {
		log.Fatal("Server forced to shutdown:", err)
	}

	fmt.Println("Server exited properly")
}
