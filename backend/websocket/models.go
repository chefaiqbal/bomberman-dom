package bomber

import "encoding/json"

type Msg struct {
	MsgType string `json:"msgType"`
	Msg     json.RawMessage `json:"msg"`
}