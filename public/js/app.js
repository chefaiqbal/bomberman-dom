import { createRouter, createStore, render } from './core/index.js';
import { Lobby } from './components/Lobby.js';

const initialState = {
    playerId: Math.random().toString(36).substring(7),
    playerName: 'Player ' + Math.floor(Math.random() * 1000),
    players: [],
    messages: [],
    gameStartTimer: null,
    currentGame: null
};

const store = createStore(initialState);
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
    '/': () => render(Lobby({ store }), appElement),
    '/lobby': () => render(Lobby({ store }), appElement),
    '/game': () => {
        // Game component will be handled here
        console.log('Starting game...');
    }
});

router.navigate('/lobby');
