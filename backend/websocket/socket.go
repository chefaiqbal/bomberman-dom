package bomber

import (
	"encoding/json"
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

type Client struct {
	conn *websocket.Conn
	ID   string
}

var (
	clients = make(map[string]*Client)
	mu      sync.Mutex
	WaitedClient = make(map[string]*Client)
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
    }

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

		HandelMsg(p, conn)
	}
}

func HandelMsg(p []byte, conn *websocket.Conn) {
	var msg Msg
	if err := json.Unmarshal(p, &msg); err != nil {
		log.Printf("Failed to unmarshal base message: %v", err)
		return
	}

	switch msg.MsgType {
	case "CHAT":
		HandleChat(msg.Msg)
	case "MOVE":
		HandleMove(msg.Msg)
	case "BOMB":
		HandleBomb(msg.Msg)
	case "PLAYER_JOIN":
		log.Printf("Player joined: %s", msg.MsgType)
		HandelJoin(msg.Msg, &clients, conn, &WaitedClient)  
	case "GAME_STARTED":
		log.Printf("Game started: %s", msg.MsgType)
		GameStart()
	case "GAME_Done":
		log.Printf("Game done: %s", msg.MsgType)
		GameDone()
	case "MAP":
		log.Printf("map: %s", msg.MsgType)
		Mapping(msg.Msg)
	default:
		log.Printf("Unknown message type: %v", msg.MsgType)
	}
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

    for id, client := range clients {
        if err := client.conn.WriteJSON(message); err != nil {
            log.Printf("Broadcast error to %s: %v", id, err)
            client.conn.Close()
            delete(clients, id) 
        }
    }
    
    log.Printf("l brodcast it: %s", msgType)
}
