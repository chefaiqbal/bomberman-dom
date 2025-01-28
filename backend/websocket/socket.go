package bomber

import (
    "encoding/json"
	"fmt"
	"log"
	"net/http"
	"sync"
	"time"

	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
}

type Client struct{
	conn *websocket.Conn
	ID string
}

var (
    clients = make(map[string]*Client) 
    mu      sync.Mutex                
)

func WsEndpoint(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		http.Error(w, "Could not open websocket connection", http.StatusBadRequest)
		return
	}
	defer conn.Close()

	clientID := fmt.Sprintf("%d", time.Now().UnixNano())

	client := &Client{
		conn: conn,
		ID:   clientID,
	}

	mu.Lock()

	if len(clients) >= 4 {
		mu.Unlock() 
		conn.WriteMessage(websocket.TextMessage, []byte("max number of players reached."))
		return
	}

	clients[clientID] = client
	numClients := len(clients)
	mu.Unlock()

	conn.WriteMessage(websocket.TextMessage, []byte("Connected successfully."))

	for {
		mu.Lock()
		numClients = len(clients)
		mu.Unlock()

		if numClients >= 2 {
			break 
		}

		time.Sleep(1 * time.Second)
	}

	go reader(conn) 
}



func reader(conn *websocket.Conn) { // listen for new messages
    for {

        messageType, p, err := conn.ReadMessage() 
        if err != nil {
            log.Println(err)
            return
        }

		HandelMsg(p)


        fmt.Println(string(p))

        if err := conn.WriteMessage(messageType, p); err != nil {
            log.Println(err)
            return
        }

    }
}

func HandelMsg(p []byte) {

	var Msg Msg
	if err := json.Unmarshal(p, &Msg); err != nil {
        log.Printf("Failed to unmarshal base message: %v", err)
        return
    }

	switch Msg.MsgType {
		case "chat":
			HandelChat(Msg.Msg)
			break;
		case "move":
			HandelMove(Msg.Msg)
			break;
		case "bomb":
			HandelBomb(Msg.Msg)
			break;
		default:
			log.Printf("Unknown message type: %v", Msg.MsgType)
			break;
		}
}

func HandelChat(msg json.RawMessage){ // for chhattting
	var chat Chat

	if err := json.Unmarshal(msg, &chat); err != nil {
		log.Printf("Failed to unmarshal chat message: %v", err)
		return
	}

	log.Printf("Chat message: %v", chat.Message)

	broadcast([]byte(chat.Message)) // send it to all users 

}


func HandelMove(msg json.RawMessage){ // for moving 
	var move Move

	if err := json.Unmarshal(msg, &move); err != nil {
		log.Printf("Failed to unmarshal move message: %v", err)
		return
	}

	log.Printf("Move message: %v", move)

}

func HandelBomb(msg json.RawMessage){ // for bombing
	var bomb Bomb

	if err := json.Unmarshal(msg, &bomb); err != nil {
		log.Printf("Failed to unmarshal bomb message: %v", err)
		return
	}

	log.Printf("Bomb message: %v", bomb)
	
}

func broadcast(msg []byte) {
	mu.Lock()
	defer mu.Unlock()

	for _, c := range clients {
		if err := c.conn.WriteMessage(websocket.TextMessage, msg); err != nil {
			log.Printf("Failed to send message to client: %v", err)
			return
		}
	}
}