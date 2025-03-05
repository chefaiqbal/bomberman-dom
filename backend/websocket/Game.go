package bomber

import (
	"encoding/json"
	//"fmt"
	"log"
	"math/rand"
	"sync"
	//"time"

	"bomber/websocket/timer"
	"bomber/websocket/game"

	"github.com/gorilla/websocket"
)


var (
	GameStarted bool // Export the variable
	CurrentPhase = game.PhaseWaiting
	gameTimer = timer.NewGameTimer(broadcastMessage, handlePhaseChange)
	activePowerUps = make(map[string]*PowerUp) // key is "x,y"
	powerUpMu      sync.RWMutex
)

// Add phase change handler
func handlePhaseChange(newPhase string) {
    CurrentPhase = newPhase
    if newPhase == game.PhaseGame {
        GameStarted = true
    }
}

func init() {
    // Initialize the timer with phase change handler
    gameTimer = timer.NewGameTimer(broadcastMessage, handlePhaseChange)
}

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
	GameStarted = true
	CurrentPhase = game.PhaseGame

}

func GameDone() {
	GameStarted = false
	CurrentPhase = game.PhaseWaiting

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
	if CurrentPhase != game.PhaseWaiting {
		mu.Unlock()
		// Send game status to client
		conn.WriteJSON(map[string]interface{}{
			"type": "GAME_STATUS",
			"data": map[string]interface{}{
				"inProgress": true,
				"phase": CurrentPhase,
				"message": "Cannot join: Game is in pregame or active phase",
			},
		})
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
	if len(*clients) >= 2 && !gameTimer.GetState()["isActive"].(bool) && !GameStarted {
		go gameTimer.Start()
	}
}

func spawnPowerUp(x, y int) {
	// 30% chance to spawn a power-up
	if rand.Float32() > 0.3 {
		return
	}

	powerUpTypes := []PowerUpType{BombPowerUp, FlamePowerUp, SpeedPowerUp}
	powerUp := &PowerUp{
		X:    x,
		Y:    y,
		Type: powerUpTypes[rand.Intn(len(powerUpTypes))],
	}

	// Broadcast power-up spawn
	broadcastMessage("POWER_UP", powerUp)
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

			if newX < 0 || newY < 0 || newX >= len(currentMap[0]) || newY >= len(currentMap) {
				break
			}

			if currentMap[newY][newX] == 1 {
				break
			}

			if currentMap[newY][newX] == 2 {
				destroyed = append(destroyed, struct{ X, Y int }{newX, newY})
				currentMap[newY][newX] = 0
				// Spawn power-up when block is destroyed
				go spawnPowerUp(newX*50+20, newY*50+20)
				break
			}
		}
	}

	return destroyed
}
