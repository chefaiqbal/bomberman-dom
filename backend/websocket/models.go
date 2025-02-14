package bomber

import "encoding/json"

type Msg struct {
	MsgType string `json:"msgType"`
	Msg     json.RawMessage `json:"msg"`
}

type Chat struct {
	Message string `json:"message"`
}

type Move struct {
	Direction  string `json:"direction"`
	PlayerName string `json:"playerName"`
}

type Bomb struct {
	X      int    `json:"x"`
	Y      int    `json:"y"`
	Timer  int    `json:"timer"`
	Owner  string `json:"owner"`
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
	Players  []Client    `json:"players"`
	TimeLeft int         `json:"timeLeft"`
	IsActive bool        `json:"isActive"`
}