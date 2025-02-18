package bomber

import (
	"encoding/json"
	"sync"
	"time"

	"github.com/gorilla/websocket"
)

type Msg struct {
	MsgType string          `json:"msgType"`
	Msg     json.RawMessage `json:"msg"`
}

type Chat struct {
	Message string `json:"message"`
}

type Move struct {
	Direction  string `json:"direction"`
	PlayerName string `json:"playerName"`
	X          int    `json:"x"`
	Y          int    `json:"y"`
}

type Bomb struct {
	X        int    `json:"x"`
	Y        int    `json:"y"`
	Timer    int    `json:"timer"` // Time left in milliseconds
	Owner    string `json:"owner"`
	Radius   int    `json:"radius"`
	Exploded bool   `json:"exploded"` // Whether bomb has exploded
	PlacedAt int64  `json:"placedAt"` // Unix timestamp when bomb was placed
}

type Player struct {
	ID    string `json:"id"`
	X     int    `json:"x"`
	Y     int    `json:"y"`
	Lives int    `json:"lives"`
}

type ChatMessage struct {
	Message    string `json:"message"`
	PlayerName string `json:"playerName"`
}

// Add game state related types
type GameMessage struct {
	Status   string `json:"status"`
	Redirect string `json:"redirect"`
}

type GameState struct {
	Players     []Client      `json:"players"`
	TimeLeft    int           `json:"timeLeft"`
	IsActive    bool          `json:"isActive"`
	ChatHistory []ChatMessage `json:"chatHistory"`
	Map         [][]int       `json:"map"`
	Bombs       []Bomb        `json:"bombs"`
}

// Add these new types
type Session struct {
	ID        string    `json:"id"`
	PlayerID  string    `json:"playerId"`
	CreatedAt time.Time `json:"createdAt"`
}

type AuthResponse struct {
	SessionID string `json:"sessionId"`
	PlayerID  string `json:"playerId"`
}

// Add this to the models
type ChatHistory struct {
	Messages []ChatMessage
	mu       sync.RWMutex
}

// Add this with the other structs
type Client struct {
	conn *websocket.Conn
	ID   string
}

// Package variables
var (
	clients      = make(map[string]*Client)
	mu           sync.Mutex
	WaitedClient = make(map[string]*Client)
	chatHistory  = &ChatHistory{
		Messages: make([]ChatMessage, 0),
	}
	currentMap  [][]int
	mapMu       sync.RWMutex
	activeBombs = make([]Bomb, 0)
	bombMu      sync.RWMutex
)
