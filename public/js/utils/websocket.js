export class WebSocketService {
    constructor(store, router) {
        this.store = store;
        this.router = router;
        this.ws = new WebSocket(`ws://localhost:8080/ws`);
        this.setupEventHandlers();
    }
    
Waiting_Join(clients) {
    clients.forEach(client => {
        client.this.router.navigate("/lobby"); 
    });
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
                this.router.navigate("/wait");
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
                case "BOMB":
                    break;
                case "MOVE":
                    break;
                case "Waiting_Join":
                    this.Waiting_Join(data.data, this.router);
                    break;
                case "MAP":
                    this.handelMap(data.data);
                    break;
                case 'TIMER_UPDATE':
                    this.handleTimerUpdate(data.data);
                    break;
                case 'GAME_STATE':
                    this.handleGameState(data.data);
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
    handelMap(map) {
        console.log("Updating map:", map);
        this.store.setState({
            ...this.store.getState(),
            map: map
        });
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
    handleGameStart(data) {
        console.log("Game start received");
        this.store.setState({
            ...this.store.getState(),
            gameStartTimer: 0,
            timerActive: false
        });
        this.router.navigate('/game');
    }
    handleTimerUpdate(data) {
        console.log("Timer update received:", data);
        const state = this.store.getState();
        
        // Check if timer has completed
        if (data.timeLeft === 0 && !data.isActive) {
            this.store.setState({
                ...state,
                gameStartTimer: 0,
                timerActive: false
            });
            return;
        }

        this.store.setState({
            ...state,
            gameStartTimer: data.timeLeft,
            timerActive: data.isActive
        });
    }
    handleGameState(data) {
        console.log("Game state received:", data);
        this.store.setState({
            ...this.store.getState(),
            gameStartTimer: data.timeLeft,
            timerActive: data.isActive,
            players: data.players
        });
    }
}