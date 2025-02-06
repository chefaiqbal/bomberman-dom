import { createRouter, createStore, render, createElement } from './core/index.js';
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
                    'Wait until game Done...'
                )
            )
        ), appElement);
    }
});

const ws = new WebSocketService(store, router);
const appElement = document.getElementById('app');

let gameTimer = null;
// Timer logic for game start
function startGameTimer() {
     if (gameTimer) return;
    let timeLeft = 10; // 10 second countdown
    store.setState({ ...store.getState(), gameStartTimer: timeLeft });
    const timer = setInterval(() => {
        timeLeft--;
        store.setState({ ...store.getState(), gameStartTimer: timeLeft });     
        if (timeLeft <= 0) {
            clearInterval(timer);
            // Navigate to game when timer ends
            gameTimer = null;
            ws.sendMessage('GAME_STARTED', {});
            router.navigate('/game');
        }
    }, 1000);
}

// Watch for player count changes
store.subscribe((state) => {
    if (state.players.length >= 2 && state.gameStartTimer===null) {
        startGameTimer();
    }
});

export const Waiting_Join = (clients) => {
    clients.forEach(client => {
        client.router.navigate("/wait"); 
    });}

router.navigate('/');
