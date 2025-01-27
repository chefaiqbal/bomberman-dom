package bomber

import (
	"fmt"
	"log"
	"net/http"

	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
}

func WsEndpoint(w http.ResponseWriter, r *http.Request) {
  
	conn , err := upgrader.Upgrade(w, r, nil) // upgrade the connection
	if err != nil {
		http.Error(w, "Could not open websocket connection", http.StatusBadRequest)
		return
	}
	
	reader(conn) // listen constantly for new messages

}

func reader(conn *websocket.Conn) { // listen for new messages
    for {

        messageType, p, err := conn.ReadMessage() 
        if err != nil {
            log.Println(err)
            return
        }

        fmt.Println(string(p))

        if err := conn.WriteMessage(messageType, p); err != nil {
            log.Println(err)
            return
        }

    }
}