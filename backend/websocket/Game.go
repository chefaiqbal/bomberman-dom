package bomber

import (
	"encoding/json"
	"log"

	"github.com/gorilla/websocket"
)

var gameStarted = false

func Mapping(msg json.RawMessage) {
    var data struct {
        Mapp [][]int `json:"mapp"`
    }
    if err := json.Unmarshal(msg, &data); err != nil {
        log.Printf("error in unmarshalling map: %s", err)
        return
    }
    log.Printf("map: %v", data.Mapp)
    broadcastMessage("MAP", data.Mapp)
}


func GameStart() {
	gameStarted = true
}

func GameDone() {
	gameStarted = false

	mu.Lock()

		for id := range clients {
        	delete(clients, id)
    	}

		counter := 0
		for id, w := range WaitedClient {
			if  counter <= 4 {
				clients[id] = w
				delete(WaitedClient, id)
				counter++
			}else {
				break;
			}
		}
	mu.Unlock()

	broadcastMessage("Waiting_Join", clients);
}

func sendWaitResponse(conn *websocket.Conn) {
	response := map[string]string{
		"status":   "wait",
		"redirect": "/wait",
	}
	if err := conn.WriteJSON(response); err != nil {
		log.Printf("Failed to send wait response: %v", err)
	}
}


func HandelJoin(msg json.RawMessage, clients *map[string]*Client, conn *websocket.Conn, WaitedClient *map[string]*Client) {
    var player Player
	
    if err := json.Unmarshal(msg, &player); err != nil {
        log.Printf("Failed to unmarshal player: %v", err)
        return
    }

	mu.Lock()
	if gameStarted {
		mu.Unlock()

		(*WaitedClient)[player.ID] = &Client{
			conn: conn,
			ID:   player.ID,
		}


		log.Printf("Player %s tried to join, but game already started. Redirecting to /wait", player.ID)

		sendWaitResponse(conn)
		return
	}

	mu.Unlock()

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

type ChatMessage struct {
    Message    string `json:"message"`
    PlayerName string `json:"playerName"`
}

func HandleChat(msg json.RawMessage) {
    var chat ChatMessage
    if err := json.Unmarshal(msg, &chat); err != nil {
        log.Printf("Failed to unmarshal chat: %v", err)
        return
    }

    log.Printf("Chat from %s: %s", chat.PlayerName, chat.Message)
    broadcastMessage("chat", chat)
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

