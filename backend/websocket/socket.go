package bomber

import (
	"encoding/json"
	"log"
	"net/http"
	"time"

	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
}

var lastDamageTime = make(map[string]time.Time)

// Add an init function to clear all state when server starts
func init() {
	// Clear all maps and states
	mu.Lock()
	clients = make(map[string]*Client)
	WaitedClient = make(map[string]*Client)
	mu.Unlock()

	// Clear sessions
	sessionMu.Lock()
	sessions = make(map[string]*Session)
	sessionMu.Unlock()

	// Clear chat history
	chatHistory.mu.Lock()
	chatHistory.Messages = make([]ChatMessage, 0)
	chatHistory.mu.Unlock()

	// Clear map
	mapMu.Lock()
	currentMap = nil
	mapMu.Unlock()

	// Reset game state
	gameStarted = false

	log.Println("Server state initialized")
}

func WsEndpoint(w http.ResponseWriter, r *http.Request) {
	upgrader.CheckOrigin = func(r *http.Request) bool {
		return true
	}

	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		http.Error(w, "Could not open websocket connection", http.StatusBadRequest)
		return
	}

	// Create initial client
	client := &Client{
		conn:       conn,
		MaxBombs:   1, // Initial value
		BombRadius: 1, // Initial value
		Speed:      5, // Initial value
	}

	mu.Lock()
	// Check if this is a reconnecting client
	var isReconnect bool
	var oldClientID string
	for id, c := range clients {
		if c.conn != conn && c.ID != "" {
			// Check if this is the same player trying to reconnect
			session := ValidateSession(id)
			if session != nil && session.PlayerID == id {
				isReconnect = true
				oldClientID = id
				break
			}
		}
	}

	// If it's a reconnection, remove the old client first
	if isReconnect {
		delete(clients, oldClientID)
	}

	activePlayerCount := len(clients)
	if !isReconnect && activePlayerCount >= 4 {
		mu.Unlock()
		conn.WriteControl(
			websocket.CloseMessage,
			websocket.FormatCloseMessage(4000, "max players reached"),
			time.Now().Add(time.Second),
		)
		conn.Close()
		return
	}
	mu.Unlock()

	// Send initial connection success
	if err := conn.WriteJSON(map[string]interface{}{
		"type": "CONNECTION_SUCCESS",
		"data": map[string]interface{}{
			"message":       "Connected successfully",
			"activeClients": len(clients),
		},
	}); err != nil {
		log.Printf("Initial write error: %v", err)
		return
	}

	// Handle cleanup on disconnect
	defer func() {
		mu.Lock()
		if client.ID != "" {
			delete(clients, client.ID)
			// Remove the session when client disconnects
			RemovePlayerSession(client.ID)

			// Only broadcast if there was an ID (player was actually in game)
			var clientList []Client
			for _, c := range clients {
				clientList = append(clientList, *c)
			}
			if len(clientList) > 0 {
				broadcastMessage("PLAYER_JOIN", clientList)
			}
		}
		mu.Unlock()
		conn.Close()
	}()

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
	case "AUTH":
		if response := HandleAuth(msg.Msg); response != nil {
			conn.WriteJSON(map[string]interface{}{
				"type": "AUTH_RESPONSE",
				"data": response,
			})
		}
	case "CHAT":
		HandleChat(msg.Msg)
	case "MOVE":
		HandleMove(msg.Msg)
	case "BOMB_PLACE":
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
		Mapping(msg.Msg)
	case "POWER_UP":
		HandlePowerUp(msg.Msg)
	case "POWER_UP_COLLECTED":
		HandlePowerUpCollected(msg.Msg)
	case "TAKE_DMG":
		handelTakeDmg(msg.Msg);
	case "PLAYER_LOST": 
		handlePlayerLost(msg.Msg);
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

	for _, client := range clients {
		if err := client.conn.WriteJSON(message); err != nil {
			log.Printf("Broadcast error: %v", err)
		}
	}
}

func handelTakeDmg(msg json.RawMessage) {
    var playerID struct {
        ID string `json:"ID"`
    }

    if err := json.Unmarshal(msg, &playerID); err != nil {
        log.Printf("Failed to unmarshal player ID: %v", err)
        return
    }

    // Check if player was recently damaged
    if lastHit, exists := lastDamageTime[playerID.ID]; exists {
        if time.Since(lastHit) < time.Second {
            return 
        }
    }
    
    // Update last damage time
    lastDamageTime[playerID.ID] = time.Now()

    broadcastMessage("TAKE_DMG", playerID)
}


func handlePlayerLost(msg json.RawMessage) {
    // Log the raw message for debugging
    log.Printf("Raw message: %s", string(msg))

    // Define a struct that matches the expected JSON structure
    var playerID struct {
        ID string `json:"playerID"` // Ensure this matches the JSON field name
    }

    // Unmarshal the JSON into the struct
    if err := json.Unmarshal(msg, &playerID); err != nil {
        log.Printf("Failed to unmarshal player ID: %v", err)
        return
    }

    // Log the populated struct
    log.Printf("Player lost: %+v", playerID)

    // Broadcast the message
    broadcastMessage("PLAYER_LOST", playerID)
}


func HandleChat(msg json.RawMessage) {
	var chat ChatMessage
	if err := json.Unmarshal(msg, &chat); err != nil {
		log.Printf("Failed to unmarshal chat: %v", err)
		return
	}

	// Store the message in history
	chatHistory.mu.Lock()
	chatHistory.Messages = append(chatHistory.Messages, chat)
	chatHistory.mu.Unlock()

	broadcastMessage("chat", chat)
}

func GetChatHistory() []ChatMessage {
	chatHistory.mu.RLock()
	defer chatHistory.mu.RUnlock()

	// Create a copy of the messages
	messages := make([]ChatMessage, len(chatHistory.Messages))
	copy(messages, chatHistory.Messages)
	return messages
}

func HandleMove(msg json.RawMessage) {
	var move Move
	if err := json.Unmarshal(msg, &move); err != nil {
		log.Printf("Failed to unmarshal move: %v", err)
		return
	}
	broadcastMessage("MOVE", move)
}

func HandleBomb(msg json.RawMessage) {
    var bomb Bomb
    if err := json.Unmarshal(msg, &bomb); err != nil {
        log.Printf("Failed to unmarshal bomb: %v", err)
        return
    }

    // Check for unexploded bombs from same owner
    bombMu.Lock()
    hasUnexplodedBomb := false
    for _, b := range activeBombs {
        if b.Owner == bomb.Owner && !b.Exploded {
            hasUnexplodedBomb = true
            break
        }
    }

    if hasUnexplodedBomb {
        bombMu.Unlock()
        return
    }

    bomb.Timer = 3000 // 3 seconds
    bomb.PlacedAt = time.Now().UnixNano() / int64(time.Millisecond)
    bomb.Exploded = false
    activeBombs = append(activeBombs, bomb)
    bombMu.Unlock()

    // Broadcast bomb placement
    broadcastMessage("BOMB_PLACE", bomb)

    // Start bomb timer
    go func() {
        time.Sleep(3 * time.Second)

        // Remove bomb from active bombs
        bombMu.Lock()
        for i, b := range activeBombs {
            if b.X == bomb.X && b.Y == bomb.Y {
                activeBombs = append(activeBombs[:i], activeBombs[i+1:]...)
                break
            }
        }
        bombMu.Unlock()

        // Calculate explosion area and destroyed blocks
        mapMu.Lock()
        // Check each direction for explosion spread
        directions := [][2]int{{0, 0}, {1, 0}, {-1, 0}, {0, 1}, {0, -1}}
        destroyedTiles := make([]struct{ X, Y int }, 0)

        for _, dir := range directions {
            for i := 0; i <= bomb.Radius; i++ {
                newX := bomb.X/50 + (dir[0] * i)
                newY := bomb.Y/50 + (dir[1] * i)

                // Check bounds
                if newY >= 0 && newY < len(currentMap) && newX >= 0 && newX < len(currentMap[0]) {
                    // If destructible wall
                    if currentMap[newY][newX] == 2 {
                        currentMap[newY][newX] = 0 // Mark as destroyed
                        destroyedTiles = append(destroyedTiles, struct{ X, Y int }{X: newX, Y: newY})
                        break // Stop explosion in this direction after hitting destructible wall
                    }
                    // If indestructible wall, stop explosion in this direction
                    if currentMap[newY][newX] == 1 {
                        break
                    }
                }
            }
        }
        mapMu.Unlock()

        // Mark bomb as exploded
        bombMu.Lock()
        for i := range activeBombs {
            if activeBombs[i].X == bomb.X && activeBombs[i].Y == bomb.Y {
                activeBombs[i].Exploded = true
                break
            }
        }
        bombMu.Unlock()

        // Broadcast explosion
        explosionData := map[string]interface{}{
            "BombX":     bomb.X,
            "BombY":     bomb.Y,
            "Radius":    bomb.Radius,
            "Destroyed": destroyedTiles,
        }

        // Broadcast updated map and explosion
        broadcastMessage("MAP", currentMap)
        broadcastMessage("BOMB_EXPLODE", explosionData)
    }()
}


func HandleAuth(msg json.RawMessage) *AuthResponse {
	var player Player
	if err := json.Unmarshal(msg, &player); err != nil {
		return nil
	}

	sessionMu.RLock()
	// Check for existing session
	var existingSession *Session
	for _, session := range sessions {
		if session.PlayerID == player.ID {
			existingSession = session
			break
		}
	}
	sessionMu.RUnlock()

	// If player has existing session, validate and reconnect
	if existingSession != nil {
		mu.Lock()
		// Update client connection if exists
		if oldClient, exists := clients[player.ID]; exists {
			oldClient.conn.Close() // Close old connection
			delete(clients, player.ID)
		}
		mu.Unlock()

		// Return existing session
		return &AuthResponse{
			SessionID: existingSession.ID,
			PlayerID:  player.ID,
		}
	}

	// Create new session for new player
	session := CreateSession(player.ID)
	return &AuthResponse{
		SessionID: session.ID,
		PlayerID:  player.ID,
	}
}

func HandlePowerUp(msg json.RawMessage) {
	var powerUp PowerUp
	if err := json.Unmarshal(msg, &powerUp); err != nil {
		log.Printf("Failed to unmarshal power up: %v", err)
		return
	}
	log.Printf("Power up received: %+v", powerUp)
	broadcastMessage("POWER_UP", powerUp)
	time.AfterFunc(4*time.Second, func() {
        log.Printf("Power up at (%d, %d) removed.", powerUp.X, powerUp.Y)
        broadcastMessage("REMOVE_POWER_UP", powerUp)
    })
}

func HandlePowerUpCollected(msg json.RawMessage) {
	var collected PowerUpCollected
	if err := json.Unmarshal(msg, &collected); err != nil {
		log.Printf("Failed to unmarshal power-up collection: %v", err)
		return
	}

	// Update player stats
	mu.Lock()
	if client, exists := clients[collected.PlayerID]; exists {
		switch collected.Type {
		case BombPowerUp:
			if client.MaxBombs < 5 { // Limit max bombs
				client.MaxBombs++
			}
		case FlamePowerUp:
			if client.BombRadius < 5 { // Limit explosion radius
				client.BombRadius++
			}
		case SpeedPowerUp:
			if client.Speed < 8 { // Limit speed
				client.Speed++
			}
		}
	}
	mu.Unlock()

	// Broadcast power-up collection to all players
	broadcastMessage("POWER_UP_COLLECTED", collected)
}

