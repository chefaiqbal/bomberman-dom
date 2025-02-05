export class WebSocketService {
    constructor(store) {
        this.store = store;
        this.ws = new WebSocket(`ws://localhost:8080/ws`);
        this.setupEventHandlers();
    }

    setupEventHandlers() {
        this.ws.onopen = () => {
            console.log("WebSocket connection established.");
        };

        this.ws.onerror = (error) => {
            console.error("WebSocket error:", error);
        };

        this.ws.onclose = (event) => {
            console.log("WebSocket connection closed:", event);
        };

        this.ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            console.log("Received WebSocket message:", data);

            if (data.status === "wait" && data.redirect) {
                console.log("Redirecting player to", data.redirect);
                return;
            }

            switch (data.type) {
                case 'chat':
                    this.handleChatMessage(data.data);
                    break;
                case 'PLAYER_JOIN':
                    this.handlePlayerUpdate(data.data);
                    break;
                case 'GAME_START':
                    this.handleGameStart(data.data);
                    break;
                case "bomb":
                    break;
                case "move":
                    break;
                default:
                    console.warn("Unknown message type:", data.type);
            }
        };
    }

    sendMessage(type, payload) {
        if (this.ws.readyState === WebSocket.OPEN) {
            const message = {
                msgType: type.toUpperCase(),
                msg: payload
            };
            this.ws.send(JSON.stringify(message));
        }
    }

    handleChatMessage(msg) {
        const state = this.store.getState();
        this.store.setState({
            ...state,
            messages: [...state.messages, msg]
        });
    }

    handlePlayerUpdate(players) {
        console.log("Updating players list", players);
        this.store.setState({
            ...this.store.getState(),
            players: players
        });
    }

    handleGameStart(gameData) {
        this.store.setState({
            ...this.store.getState(),
            currentGame: gameData
        });
    }
}
