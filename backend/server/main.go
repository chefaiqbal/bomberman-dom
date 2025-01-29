package main

import (
    "fmt"
    "log"
    "mime"
    "net/http"
    "os"
    "path/filepath"
    "strings"
    ws "bomber/websocket"
)

func init() {
    // Register common MIME types
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
    // Get the absolute path to prevent directory traversal
    path := filepath.Join(h.staticPath, r.URL.Path)

    // Check if file exists
    _, err := os.Stat(path)
    if os.IsNotExist(err) {
        // If core files are requested but not found in public, check the core directory
        if filepath.HasPrefix(r.URL.Path, "/core/") {
            corePath := filepath.Join(h.staticPath, "..", "..", "core", filepath.Base(r.URL.Path))
            if _, err := os.Stat(corePath); err == nil {
                serveFileWithMimeType(w, r, corePath)
                return
            }
        }
        // Serve index.html for all non-existent files (SPA routing)
        serveFileWithMimeType(w, r, filepath.Join(h.staticPath, h.indexPath))
        return
    } else if err != nil {
        http.Error(w, err.Error(), http.StatusInternalServerError)
        return
    }

    // Serve the static file with correct MIME type
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

    // Create spa handler
    spa := &spaHandler{staticPath: absPublicDir, indexPath: "index.html"}

    // WebSocket endpoint
    http.HandleFunc("/ws", ws.WsEndpoint)

    // Handle all other routes
    http.Handle("/", spa)

    port := ":8080"
    fmt.Printf("Server starting on http://localhost%s\n", port)
    if err := http.ListenAndServe(port, nil); err != nil {
        log.Fatal("Server failed to start:", err)
    }
}
