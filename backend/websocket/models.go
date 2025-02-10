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
	Direction string `json:"direction"`
	PlayerID  string `json:"playerID"`

}

type Bomb struct {
    X      int     `json:"x"`
    Y      int     `json:"y"`
    Timer  int     `json:"timer"`
    Owner  string  `json:"owner"`
}

type Player struct {
    ID      string  `json:"id"`
    X       int     `json:"x"`
    Y       int     `json:"y"`
    Lives   int     `json:"lives"`
}
type Map struct {
    Grid [][]int `json:"grid"`
}