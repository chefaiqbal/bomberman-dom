import { createRouter, createStore, render } from './core/index.js';
import { Lobby } from './components/Lobby.js';
import { NicknameScreen } from './components/NicknameScreen.js';
import { WebSocketService } from './utils/websocket.js';

const initialState = {
    playerId: Math.random().toString(36).substring(7),
    playerName: '',
    isAuthenticated: false,
    players: [],
    messages: [],
    gameStartTimer: null,
    currentGame: null,
    wsConnected: false
};

const store = createStore(initialState);
const ws = new WebSocketService(store);
const appElement = document.getElementById('app');

// Timer logic for game start
function startGameTimer() {
    let timeLeft = 10; // 10 second countdown
    store.setState({ ...store.getState(), gameStartTimer: timeLeft });
    
    const timer = setInterval(() => {
        timeLeft--;
        store.setState({ ...store.getState(), gameStartTimer: timeLeft });
        
        if (timeLeft <= 0) {
            clearInterval(timer);
            // Navigate to game when timer ends
            router.navigate('/game');
        }
    }, 1000);
}

// Watch for player count changes
store.subscribe((state) => {
    if (state.players.length >= 2 && !state.gameStartTimer) {
        startGameTimer();
    }
});

const router = createRouter({
    '/': () => {
        const state = store.getState();
        if (state.isAuthenticated) {
            router.navigate('/lobby');
        } else {
            render(NicknameScreen({ store, router, ws }), appElement);
        }
    },
    '/lobby': () => {
        const state = store.getState();
        if (!state.isAuthenticated) {
            router.navigate('/');
            return;
        }
        render(Lobby({ store, router, ws }), appElement);
    },
    '/game': () => {
        const state = store.getState();
        if (!state.isAuthenticated) {
            router.navigate('/');
            return;
        }
        console.log('Starting game...');
    }
});

router.navigate('/');
