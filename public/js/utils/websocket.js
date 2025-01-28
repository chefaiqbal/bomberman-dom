export function initializeWebSocket(store) {
    const ws = new WebSocket(`ws://${window.location.host}/ws`);
    
    ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        
        switch(data.type) {
            case 'players_update':
                store.setState({ 
                    ...store.getState(), 
                    players: data.players 
                });
                break;
            
            case 'chat_message':
                const state = store.getState();
                store.setState({
                    ...state,
                    messages: [...state.messages, data.message]
                });
                break;
        }
    };

    ws.onopen = () => {
        // Send initial player info
        ws.send(JSON.stringify({
            type: 'player_join',
            player: {
                id: store.getState().playerId,
                name: store.getState().playerName
            }
        }));
    };

    return ws;
}
