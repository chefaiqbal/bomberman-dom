package bomber

import (
	"encoding/json"
	"log"
	"net/http"
	//"sync"
	"time"

	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
}

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
		conn: conn,
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
			"message": "Connected successfully",
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

	for _, client := range clients {
		if err := client.conn.WriteJSON(message); err != nil {
			log.Printf("Broadcast error: %v", err)
		}
	}
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

	// Add bomb to active bombs
	bombMu.Lock()
	activeBombs = append(activeBombs, bomb)
	bombMu.Unlock()

	// Broadcast bomb placement
	broadcastMessage("BOMB_PLACE", bomb)

	// Start bomb timer
	go func() {
		time.Sleep(time.Duration(bomb.Timer) * time.Millisecond)
		
		// Handle explosion
		bombMu.Lock()
		// Find and remove the bomb
		for i, b := range activeBombs {
			if b.X == bomb.X && b.Y == bomb.Y && b.Owner == bomb.Owner {
				activeBombs = append(activeBombs[:i], activeBombs[i+1:]...)
				break
			}
		}
		bombMu.Unlock()

		// Update map for explosion
		mapMu.Lock()
		// Check each direction
		directions := [][2]int{{0,0}, {1,0}, {-1,0}, {0,1}, {0,-1}}
		destroyedTiles := make([]struct{X,Y int}, 0)
		
		for _, dir := range directions {
			for i := 0; i <= bomb.Radius; i++ {
				newX := bomb.X + (dir[0] * i * 50)
				newY := bomb.Y + (dir[1] * i * 50)
				
				// Convert to grid coordinates
				gridX := newX / 50
				gridY := newY / 50
				
				// Check bounds
				if gridY >= 0 && gridY < len(currentMap) && gridX >= 0 && gridX < len(currentMap[0]) {
					// If destructible wall
					if currentMap[gridY][gridX] == 2 {
						currentMap[gridY][gridX] = 0
						destroyedTiles = append(destroyedTiles, struct{X,Y int}{X: gridX, Y: gridY})
					}
					// If indestructible wall, stop explosion in this direction
					if currentMap[gridY][gridX] == 1 {
						break
					}
				}
			}
		}
		mapMu.Unlock()

		// Broadcast explosion
		explosion := struct {
			BombX, BombY int
			Radius       int
			Destroyed   []struct{X,Y int}
		}{
			BombX: bomb.X,
			BombY: bomb.Y,
			Radius: bomb.Radius,
			Destroyed: destroyedTiles,
		}
		
		broadcastMessage("BOMB_EXPLODE", explosion)
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
			PlayerID: player.ID,
		}
	}

	// Create new session for new player
	session := CreateSession(player.ID)
	return &AuthResponse{
		SessionID: session.ID,
		PlayerID: player.ID,
	}
}
