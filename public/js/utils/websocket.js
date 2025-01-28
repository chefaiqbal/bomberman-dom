export class WebSocketService {
    constructor(store) {
        this.store = store;
        const state = store.getState();
        this.ws = new WebSocket(`ws://${window.location.host}/ws?id=${state.playerId}`);
        this.setupEventHandlers();
    }

    setupEventHandlers() {
        this.ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            switch (data.msgType) {
                case 'CHAT':
                    this.handleChatMessage(data.msg);
                    break;
                case 'PLAYER_JOIN':
                    this.handlePlayerUpdate(data.msg);
                    break;
                case 'GAME_START':
                    this.handleGameStart(data.msg);
                    break;
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
