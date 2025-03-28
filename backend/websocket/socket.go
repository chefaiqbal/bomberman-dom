package bomber

import (
	"bomber/websocket/game"
	"encoding/json"
	"fmt"
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


func init() {

	mu.Lock()
	clients = make(map[string]*Client)
	WaitedClient = make(map[string]*Client)
	mu.Unlock()


	sessionMu.Lock()
	sessions = make(map[string]*Session)
	sessionMu.Unlock()


	chatHistory.mu.Lock()
	chatHistory.Messages = make([]ChatMessage, 0)
	chatHistory.mu.Unlock()


	mapMu.Lock()
	currentMap = nil
	mapMu.Unlock()


	GameStarted = false // Update to use GameStarted

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


	if CurrentPhase != game.PhaseWaiting {
		conn.WriteJSON(map[string]interface{}{
			"type": "GAME_STATUS",
			"data": map[string]interface{}{
				"inProgress": true,
				"phase": CurrentPhase,
				"message": "Game is in progress, please wait for the next round",
			},
		})
		return
	}


	client := &Client{
		conn:       conn,
		MaxBombs:   1, 
		BombRadius: 1, 
		Speed:      5, 
	}

	mu.Lock()

	var isReconnect bool
	var oldClientID string
	for id, c := range clients {
		if c.conn != conn && c.ID != "" {

			session := ValidateSession(id)
			if session != nil && session.PlayerID == id {
				isReconnect = true
				oldClientID = id
				break
			}
		}
	}

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


	defer func() {
		mu.Lock()
		if client.ID != "" {
			log.Printf("Client disconnected: %s", client.ID)
			

			if CurrentPhase == game.PhaseGame {
				log.Printf("Player %s disconnected during active game - marking as lost", client.ID)
				

				go handlePlayerDisconnect(client.ID)
			}
			
			delete(clients, client.ID)

			RemovePlayerSession(client.ID)

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

func handlePlayerDisconnect(playerID string) {
    time.Sleep(1 * time.Second)
    

    mu.Lock()
    _, stillConnected := clients[playerID]
    mu.Unlock()
    
    if !stillConnected {
        log.Printf("Player %s confirmed disconnected - handling as loss", playerID)
        
        playerLostData := map[string]string{
            "playerID": playerID,
            "reason": "disconnected",
        }
        

        broadcastMessage("PLAYER_LOST", playerLostData)
        

        mu.Lock()
        remaining := len(clients)
        var lastPlayer string
        if remaining == 1 {
            for id := range clients {
                lastPlayer = id
                break
            }
        }
        mu.Unlock()
        
        if remaining == 1 {
            log.Printf("Only one player remaining: %s - declaring winner", lastPlayer)
            

            broadcastMessage("GAME_WINNER", map[string]interface{}{
                "playerID": lastPlayer,
                "message": "You are the last player standing!",
            })
            

            time.AfterFunc(5*time.Second, GameDone)
        }
    }
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
	case "PLAYER_WON":
		handlePlayerWon(msg.Msg)
	default:
		log.Printf("Unknown message type: %v", msg.MsgType)
	}
}

func handlePlayerWon(msg json.RawMessage) {
    var playerID struct {
        PlayerID string `json:"playerID"`
    }
    if err := json.Unmarshal(msg, &playerID); err != nil {
        log.Printf("Failed to unmarshal winner ID: %v", err)
        return
    }

    log.Printf("Player won: %s", playerID.PlayerID)


    gameTimer.StartEndingPhase()


    broadcastMessage("GAME_WINNER", map[string]interface{}{
        "playerID": playerID.PlayerID,
        "message": "Game Over - Winner!",
    })


    time.AfterFunc(5*time.Second, func() {
        GameDone()
    })
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


    if lastHit, exists := lastDamageTime[playerID.ID]; exists {
        if time.Since(lastHit) < time.Second {
            return 
        }
    }
    

    lastDamageTime[playerID.ID] = time.Now()

    broadcastMessage("TAKE_DMG", playerID)
}


func handlePlayerLost(msg json.RawMessage) {

    var playerID struct {
        ID string `json:"playerID"` // Ensure this matches the JSON field name
    }

    if err := json.Unmarshal(msg, &playerID); err != nil {
        log.Printf("Failed to unmarshal player ID: %v", err)
        return
    }

  


    broadcastMessage("PLAYER_LOST", playerID)


    mu.Lock()
    remainingPlayers := make([]string, 0)
    for id := range clients {
        if id != playerID.ID {
            remainingPlayers = append(remainingPlayers, id)
        }
    }
    mu.Unlock()
    

    if len(remainingPlayers) == 1 {
        log.Printf("Player %s is the last one standing!", remainingPlayers[0])
        

        broadcastMessage("GAME_WINNER", map[string]interface{}{
            "playerID": remainingPlayers[0],
            "message": "You are the last player standing!",
        })
        

        time.AfterFunc(5*time.Second, GameDone)
    }
}


func HandleChat(msg json.RawMessage) {
    var chat ChatMessage
    if err := json.Unmarshal(msg, &chat); err != nil {
        log.Printf("Failed to unmarshal chat: %v", err)
        return
    }


    chatHistory.mu.Lock()
    chatHistory.Messages = append(chatHistory.Messages, chat)
    chatHistory.mu.Unlock()


    mu.Lock()
    message := struct {
        Type string      `json:"type"`
        Data ChatMessage `json:"data"`
    }{
        Type: "chat",
        Data: chat,
    }


    for _, client := range clients {
        client.conn.WriteJSON(message)
    }
    

    for _, client := range WaitedClient {
        client.conn.WriteJSON(message)
    }
    mu.Unlock()
}

func GetChatHistory() []ChatMessage {
	chatHistory.mu.RLock()
	defer chatHistory.mu.RUnlock()


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


    bombMu.Lock()
    activePlayerBombs := 0
    for _, b := range activeBombs {
        if b.Owner == bomb.Owner && !b.Exploded {
            activePlayerBombs++
        }
    }


    mu.Lock()
    maxBombs := 1 // Default value
    if client, exists := clients[bomb.Owner]; exists {
        maxBombs = client.MaxBombs
    }
    mu.Unlock()

    if activePlayerBombs >= maxBombs { // check bomb limit
        bombMu.Unlock()
        return
    }

    bomb.Timer = 3000 // 3 seconds
    bomb.PlacedAt = time.Now().UnixNano() / int64(time.Millisecond)
    bomb.Exploded = false
    activeBombs = append(activeBombs, bomb)
    bombMu.Unlock()

    broadcastMessage("BOMB_PLACE", bomb)


    go func() {
        time.Sleep(3 * time.Second)


        bombMu.Lock()
        for i, b := range activeBombs {
            if b.X == bomb.X && b.Y == bomb.Y && b.Owner == bomb.Owner {
                activeBombs = append(activeBombs[:i], activeBombs[i+1:]...)
                break
            }
        }
        bombMu.Unlock()

        mapMu.Lock()
        directions := [][2]int{{0, 0}, {1, 0}, {-1, 0}, {0, 1}, {0, -1}}
        destroyedTiles := make([]struct{ X, Y int }, 0)

        for _, dir := range directions {
            for i := 0; i <= bomb.Radius; i++ {
                newX := bomb.X/50 + (dir[0] * i)
                newY := bomb.Y/50 + (dir[1] * i)

                if newY >= 0 && newY < len(currentMap) && newX >= 0 && newX < len(currentMap[0]) {
                    if currentMap[newY][newX] == 2 {
                        currentMap[newY][newX] = 0 // Mark as destroyed
                        destroyedTiles = append(destroyedTiles, struct{ X, Y int }{X: newX, Y: newY})
                        break 
                    }

                    if currentMap[newY][newX] == 1 {
                        break
                    }
                }
            }
        }
        mapMu.Unlock()


        bombMu.Lock()
        for i := range activeBombs {
            if activeBombs[i].X == bomb.X && activeBombs[i].Y == bomb.Y {
                activeBombs[i].Exploded = true
                break
            }
        }
        bombMu.Unlock()


        explosionData := map[string]interface{}{
            "BombX":     bomb.X,
            "BombY":     bomb.Y,
            "Radius":    bomb.Radius,
            "Destroyed": destroyedTiles,
        }


        broadcastMessage("MAP", currentMap)
        broadcastMessage("BOMB_EXPLODE", explosionData)
    }()
}

func HandleAuth(msg json.RawMessage) *AuthResponse {

    var player Player
    if err := json.Unmarshal(msg, &player); err != nil {
        return nil
    }


    if CurrentPhase != game.PhaseWaiting {
        log.Printf("Rejecting auth - game phase is: %s", CurrentPhase)
        return &AuthResponse{
            Error:      "Game in progress",
            GameStatus: "in_progress",
            Phase:      CurrentPhase,
        }
    }

    sessionMu.RLock()

    var existingSession *Session
    for _, session := range sessions {
        if session.PlayerID == player.ID {
            existingSession = session
            break
        }
    }
    sessionMu.RUnlock()


    if existingSession != nil {
        mu.Lock()
        if oldClient, exists := clients[player.ID]; exists {
            oldClient.conn.Close()
            delete(clients, player.ID)
        }
        mu.Unlock()
        return &AuthResponse{
            SessionID: existingSession.ID,
            PlayerID:  player.ID,
        }
    }


    session := CreateSession(player.ID)
    if session == nil {
        return &AuthResponse{
            Error: "Cannot create session",
            GameStatus: "error",
        }
    }

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

var collectedPowerUps = make(map[string]bool) // Tracks collected power-ups

func HandlePowerUpCollected(msg json.RawMessage) {
    log.Printf("Received power-up collection event: %s", msg)

    var collected PowerUpCollected
    if err := json.Unmarshal(msg, &collected); err != nil {
        log.Printf("Failed to unmarshal power-up collection: %v", err)
        return
    }

    key := fmt.Sprintf("%s-%d-%d", collected.Type, collected.X, collected.Y) // Unique key for each power-up

    mu.Lock()
    if collectedPowerUps[key] {
        log.Printf("Duplicate power-up collection ignored: %v", collected)
        mu.Unlock()
        return
    }
    collectedPowerUps[key] = true // Mark as collected
    mu.Unlock()

    log.Printf("Processing power-up collection for PlayerID: %s, Type: %s", collected.PlayerID, collected.Type)

    mu.Lock()
    if client, exists := clients[collected.PlayerID]; exists {
        log.Printf("Before update -> PlayerID: %s, MaxBombs: %d, BombRadius: %d, Speed: %d",
            client.ID, client.MaxBombs, client.BombRadius, client.Speed)

        switch collected.Type {
        case BombPowerUp:
            if client.MaxBombs < 3 {
                client.MaxBombs++
            }
        case FlamePowerUp:
            if client.BombRadius < 5 {
                client.BombRadius++
            }
        case SpeedPowerUp:
            if client.Speed < 8 {
                client.Speed++
            }
        }

        log.Printf("Updated player stats -> PlayerID: %s, MaxBombs: %d, BombRadius: %d, Speed: %d",
            client.ID, client.MaxBombs, client.BombRadius, client.Speed)
    }
    mu.Unlock()


    log.Printf("Broadcasting power-up collection: %+v", collected)
    broadcastMessage("POWER_UP_COLLECTED", collected)
}


