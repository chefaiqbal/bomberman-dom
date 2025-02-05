import { createRouter, createStore, render } from './core/index.js';
import { Lobby } from './components/Lobby.js';
import { NicknameScreen } from './components/NicknameScreen.js';
import { WebSocketService } from './utils/websocket.js';
import { GameBoard } from './components/GameBoard.js';

const initialState = {
    playerId: Math.random().toString(36).substring(7),
    playerName: '',
    isAuthenticated: false,
    players: [],
    messages: [],
    gameStartTimer: null,
    currentGame: null,
    wsConnected: false,
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

            ws.sendMessage('GAME_STARTED', {});

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
        render(GameBoard({ store, router, ws }), appElement);
        console.log('Starting game...');
    },
    '/wait': () => {
        render(createElement('div', { class: 'min-h-screen flex items-center justify-center bg-gray-100' },
            createElement('div', { class: 'max-w-md w-full bg-white rounded-lg shadow-lg p-8' },
                createElement('h1', { class: 'text-3xl font-bold text-center mb-8 text-gray-800' }, 
                    'Waiting for more players...'
                )
            )
        ), appElement);
    }
});

router.navigate('/');
