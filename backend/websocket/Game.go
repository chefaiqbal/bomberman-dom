package bomber

import (
	"encoding/json"
	"log"

	"github.com/gorilla/websocket"
	"bomber/websocket/timer"
)

var gameStarted = false
var (
	gameTimer = timer.NewGameTimer(broadcastMessage)
)

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
	// No need to send another GAME_START message here as timer already sends it
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
	response := GameMessage{
		Status:   "wait",
		Redirect: "/wait",
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

	// Start timer if needed
	if len(*clients) >= 2 && !gameTimer.GetState()["isActive"].(bool) && !gameStarted {
		go gameTimer.Start()
	}

	// Send current game state to new player
	gameState := GameState{
		Players:  clientList,
		TimeLeft: gameTimer.GetState()["timeLeft"].(int),
		IsActive: gameTimer.GetState()["isActive"].(bool),
	}

	conn.WriteJSON(map[string]interface{}{
		"type": "GAME_STATE",
		"data": gameState,
	})
}