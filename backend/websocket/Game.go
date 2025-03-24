package bomber

import (
	"encoding/json"
	"fmt"
	"log"
	"math/rand"
	"sync"
	"time"

	"bomber/websocket/game"
	"bomber/websocket/timer"

	// Add this import

	"github.com/gorilla/websocket"
)

var (
	GameStarted    bool // Export the variable
	CurrentPhase   = game.PhaseWaiting
	gameTimer      = timer.NewGameTimer(broadcastMessage, handlePhaseChange)
	activePowerUps = make(map[string]*PowerUp) // key is "x,y"
	powerUpMu      sync.RWMutex
)

func handlePhaseChange(newPhase string) {
	CurrentPhase = newPhase
	if newPhase == game.PhaseGame {
		GameStarted = true
	}
}

func init() {
	GameStarted = false
	CurrentPhase = game.PhaseWaiting
	gameTimer = timer.NewGameTimer(broadcastMessage, handlePhaseChange)
	log.Printf("Game initialized with phase: %s", CurrentPhase)
	GameDone() // Ensure clean state on startup
}

func Mapping(msg json.RawMessage) {
	var data struct {
		Mapp [][]int `json:"mapp"`
	}
	if err := json.Unmarshal(msg, &data); err != nil {
		log.Printf("error in unmarshalling map: %s", err)
		return
	}

	mapMu.Lock()
	currentMap = data.Mapp
	mapMu.Unlock()

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

	clients = make(map[string]*Client)
	WaitedClient = make(map[string]*Client)

	sessionMu.Lock()
	sessions = make(map[string]*Session)
	sessionMu.Unlock()

	chatHistory.mu.Lock()
	chatHistory.Messages = make([]ChatMessage, 0)
	chatHistory.mu.Unlock()

	mapMu.Lock()
	currentMap = nil
	mapMu.Unlock()

	powerUpMu.Lock()
	activePowerUps = make(map[string]*PowerUp)
	powerUpMu.Unlock()

	bombMu.Lock()
	activeBombs = make([]Bomb, 0)
	bombMu.Unlock()

	mu.Unlock()

	lastDamageTime = make(map[string]time.Time)

	log.Printf("Game fully reset, new phase: %s", CurrentPhase)

	broadcastMessage("GAME_RESET", map[string]interface{}{
		"status": "reset",
		"phase":  game.PhaseWaiting,
	})
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

		conn.WriteJSON(map[string]interface{}{
			"type": "GAME_STATUS",
			"data": map[string]interface{}{
				"inProgress": true,
				"phase":      CurrentPhase,
				"message":    "Cannot join: Game is in pregame or active phase",
			},
		})
		return
	}

	(*clients)[player.ID] = &Client{
		conn:       conn,
		ID:         player.ID,
		MaxBombs:   1,
		BombRadius: 2,
		Speed:      5,
	}

	var clientList []Client
	for _, c := range *clients {
		clientList = append(clientList, *c)
	}

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


	if len(*clients) == 4 && CurrentPhase == game.PhaseWaiting && gameTimer.GetState()["isActive"].(bool) {

		go gameTimer.TransitionToPregame()
		log.Printf("4 players joined, immediately transitioning to pregame phase")
	} else if len(*clients) >= 2 && !gameTimer.GetState()["isActive"].(bool) && !GameStarted {
		go gameTimer.Start()
	}

	mu.Unlock()

	broadcastMessage("PLAYER_JOIN", clientList)
}

func spawnPowerUp(x, y int) {
	if rand.Float32() > 0.45 {
		return
	}

	powerUpTypes := []PowerUpType{BombPowerUp, FlamePowerUp, SpeedPowerUp}
	powerUp := &PowerUp{
		X:    x,
		Y:    y,
		Type: powerUpTypes[rand.Intn(len(powerUpTypes))],
	}

	powerUpMu.Lock()
	activePowerUps[fmt.Sprintf("%d,%d", x, y)] = powerUp
	powerUpMu.Unlock()

	broadcastMessage("POWER_UP", powerUp)
}

func calculateDestroyedBlocks(x, y, radius int) []struct{ X, Y int } {
	var destroyed []struct{ X, Y int }
	directions := [][2]int{{0, 0}, {1, 0}, {-1, 0}, {0, 1}, {0, -1}}

	mapMu.RLock()
	defer mapMu.RUnlock()

	mapCopy := make([][]int, len(currentMap))
	for i := range currentMap {
		mapCopy[i] = make([]int, len(currentMap[i]))
		copy(mapCopy[i], currentMap[i])
	}

	for _, dir := range directions {
		for i := 0; i <= radius; i++ {
			newX := x/50 + (dir[0] * i)
			newY := y/50 + (dir[1] * i)

			if newX < 0 || newY < 0 || newX >= len(mapCopy[0]) || newY >= len(mapCopy) {
				break
			}

			if mapCopy[newY][newX] == 1 {
				break
			}

			if mapCopy[newY][newX] == 2 {
				destroyed = append(destroyed, struct{ X, Y int }{newX, newY})
				mapCopy[newY][newX] = 0 // Update the copy
				go spawnPowerUp(newX*50+20, newY*50+20)
				break // Stop explosion in this direction after destroying the wall
			}
		}
	}

	for _, d := range destroyed {
		currentMap[d.Y][d.X] = 0
	}

	return destroyed
}
