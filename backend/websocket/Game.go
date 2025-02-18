package bomber

import (
	"encoding/json"
	"log"
	//"time"

	"bomber/websocket/timer"

	"github.com/gorilla/websocket"
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

	// Store the map
	mapMu.Lock()
	currentMap = data.Mapp
	mapMu.Unlock()

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
		if counter <= 4 {
			clients[id] = w
			delete(WaitedClient, id)
			counter++
		} else {
			break
		}
	}
	mu.Unlock()

	broadcastMessage("Waiting_Join", clients)
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

	// Validate session
	sessionMu.RLock()
	var validSession bool
	for _, session := range sessions {
		if session.PlayerID == player.ID {
			validSession = true
			break
		}
	}
	sessionMu.RUnlock()

	if !validSession {
		log.Printf("Invalid session for player: %s", player.ID)
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

	// Update client connection
	(*clients)[player.ID] = &Client{
		conn: conn,
		ID:   player.ID,
	}

	// Send current game state to the reconnected player
	var clientList []Client
	for _, c := range *clients {
		clientList = append(clientList, *c)
	}

	// Send game state to the reconnected player
	mapMu.RLock()
	gameMap := currentMap
	mapMu.RUnlock()

	conn.WriteJSON(map[string]interface{}{
		"type": "GAME_STATE",
		"data": GameState{
			Players:     clientList,
			TimeLeft:    gameTimer.GetState()["timeLeft"].(int),
			IsActive:    gameTimer.GetState()["isActive"].(bool),
			ChatHistory: GetChatHistory(),
			Map:         gameMap,
		},
	})

	mu.Unlock()

	// Broadcast updated player list to all clients
	broadcastMessage("PLAYER_JOIN", clientList)

	// Start timer if needed
	if len(*clients) >= 2 && !gameTimer.GetState()["isActive"].(bool) && !gameStarted {
		go gameTimer.Start()
	}
}

func calculateDestroyedBlocks(x, y, radius int) []struct{ X, Y int } {
	var destroyed []struct{ X, Y int }
	directions := [][2]int{{0, 0}, {1, 0}, {-1, 0}, {0, 1}, {0, -1}}

	mapMu.RLock()
	defer mapMu.RUnlock()

	for _, dir := range directions {
		for i := 0; i <= radius; i++ {
			newX := x/50 + (dir[0] * i)
			newY := y/50 + (dir[1] * i)

			// Check map bounds
			if newX < 0 || newY < 0 || newX >= len(currentMap[0]) || newY >= len(currentMap) {
				break
			}

			// If we hit a wall, stop in this direction
			if currentMap[newY][newX] == 1 {
				break
			}

			// If we hit a destructible block, add it to destroyed list
			if currentMap[newY][newX] == 2 {
				destroyed = append(destroyed, struct{ X, Y int }{newX, newY})
				currentMap[newY][newX] = 0 // Update the map
				break
			}
		}
	}

	return destroyed
}
