package bomber

import (
	"encoding/json"
	"log"
	"time"
	
	"github.com/gorilla/websocket"
)

func GameStart(currentClients map[string]*Client) {
	if len(clients) > 1{
		time.Sleep(20 * time.Second)
		log.Println("Game Start")

	}
}

func HandelJoin(msg json.RawMessage, clients *map[string]*Client, conn *websocket.Conn) {
    var player Player
    if err := json.Unmarshal(msg, &player); err != nil {
        log.Printf("Failed to unmarshal player: %v", err)
        return
    }

    log.Printf("Player joined with name: %s", player.ID)

    client := &Client{
        conn: conn, 
        ID:   player.ID,  
    }

    mu.Lock()
    (*clients)[client.ID] = client
    mu.Unlock()

    var clientList []Client
    mu.Lock()
    for _, c := range *clients {
        clientList = append(clientList, *c)
    }
    mu.Unlock()

    broadcastMessage("PLAYER_JOIN", clientList)
}

func HandleChat(msg json.RawMessage) {
	var chat Chat
	if err := json.Unmarshal(msg, &chat); err != nil {
		log.Printf("Failed to unmarshal chat: %v", err)
		return
	}

	log.Printf("Chat: %s", chat.Message)
	broadcastMessage("chat", chat.Message)
}

func HandleMove(msg json.RawMessage) {
	var move Move
	if err := json.Unmarshal(msg, &move); err != nil {
		log.Printf("Failed to unmarshal move: %v", err)
		return
	}

	log.Printf("Move: %s", move.Direction)
	broadcastMessage("move", move)
}

func HandleBomb(msg json.RawMessage) {
	var bomb Bomb
	if err := json.Unmarshal(msg, &bomb); err != nil {
		log.Printf("Failed to unmarshal bomb: %v", err)
		return
	}

	log.Printf("Bomb placed at (%d, %d)", bomb.X, bomb.Y)
	broadcastMessage("bomb", bomb)
}

