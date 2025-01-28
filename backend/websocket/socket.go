package bomber

import (
    "encoding/json"
	"fmt"
	"log"
	"net/http"
	"sync"
	"time"

	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
}

type Client struct{
	conn *websocket.Conn
	ID string
}

var (
    clients = make(map[string]*Client) 
    mu      sync.Mutex                
)
func WsEndpoint(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		http.Error(w, "Could not open websocket connection", http.StatusBadRequest)
		return
	}

	mu.Lock()
	if len(clients) >= 4 {
		mu.Unlock()
		conn.WriteControl(
			websocket.CloseMessage,
			websocket.FormatCloseMessage(4000, "max players reached"),
			time.Now().Add(time.Second),
		)
		conn.Close()
		return
	}

	client := &Client{
		conn: conn,
		ID:   fmt.Sprintf("%d", time.Now().UnixNano()),
	}
	clients[client.ID] = client
	mu.Unlock()

	defer func() {
		mu.Lock()
		delete(clients, client.ID)
		mu.Unlock()
		conn.Close()
	}()

	if err := conn.WriteJSON(map[string]string{
		"type":    "connection",
		"message": "Connected successfully",
	}); err != nil {
		log.Printf("Initial write error: %v", err)
		return
	}

	reader(conn)
}

func reader(conn *websocket.Conn) {
	for {
		_, p, err := conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway) {
				log.Printf("Connection closed unexpectedly: %v", err)
			}
			break
		}

		HandelMsg(p)
	}
}

func HandelMsg(p []byte) {
	var msg Msg
	if err := json.Unmarshal(p, &msg); err != nil {
		log.Printf("Failed to unmarshal base message: %v", err)
		return
	}

	switch msg.MsgType {
	case "chat":
		handleChat(msg.Msg)
		break
	case "move":
		handleMove(msg.Msg)
		break
	case "bomb":
		handleBomb(msg.Msg)
		break
	default:
		log.Printf("Unknown message type: %v", msg.MsgType)
		break
	}
}

func handleChat(msg json.RawMessage) {
	var chat Chat
	if err := json.Unmarshal(msg, &chat); err != nil {
		log.Printf("Failed to unmarshal chat: %v", err)
		return
	}

	log.Printf("Chat: %s", chat.Message)
	broadcastMessage("chat", chat.Message)
}

func handleMove(msg json.RawMessage) {
	var move Move
	if err := json.Unmarshal(msg, &move); err != nil {
		log.Printf("Failed to unmarshal move: %v", err)
		return
	}

	log.Printf("Move: %s", move.Direction)
	broadcastMessage("move", move)
}

func handleBomb(msg json.RawMessage) {
	var bomb Bomb
	if err := json.Unmarshal(msg, &bomb); err != nil {
		log.Printf("Failed to unmarshal bomb: %v", err)
		return
	}

	log.Printf("Bomb placed at (%d, %d)", bomb.X, bomb.Y)
	broadcastMessage("bomb", bomb)
}

func broadcastMessage(msgType string, payload interface{}) {
	mu.Lock()
	defer mu.Unlock()

	if len(clients) == 0 {
		return
	}

	message := struct {
		Type string      `json:"type"`
		Data interface{} `json:"data"`
	}{
		Type: msgType,
		Data: payload,
	}

	for _, client := range clients {
		if err := client.conn.WriteJSON(message); err != nil {
			log.Printf("Broadcast error: %v", err)
		}
	}
}
