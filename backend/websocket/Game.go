package bomber

import (
	"encoding/json"
	"log"
	"time"
)

func GameStart(currentClients map[string]*Client) {
	if len(clients) > 1{
		time.Sleep(20 * time.Second)
		log.Println("Game Start")

	}
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

