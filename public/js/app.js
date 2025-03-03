import { createRouter, createStore, render, createElement } from './core/index.js';
import { Lobby } from './components/Lobby.js';
import { NicknameScreen } from './components/NicknameScreen.js';
import { WebSocketService } from './utils/websocket.js';
import { GameBoard } from './components/GameBoard.js';
import { generateMap } from './game/Map.js';
import { PreGameLobby } from './components/PreGameLobby.js';
import { createLoseBanner } from './components/Banners.js';

const initialState = {
    playerId: Math.random().toString(36).substring(7),
    playerName: '',
    isAuthenticated: false,
    players: [],
    messages: [],
    gameStartTimer: null,
    currentGame: null,
    wsConnected: false,
    map: null,
    mapGen: false,
    reconnecting: false,
    lobbyPhase: 'WAITING',
};

export const store = createStore(initialState);


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
        
        if (state.lobbyPhase === 'PREGAME') {
            render(PreGameLobby({ store, router, ws }), appElement);
        } else {
            render(Lobby({ store, router, ws }), appElement);
        }
    },
    '/lose': () => {
        render(createLoseBanner(), appElement);
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

export const ws = new WebSocketService(store, router);
const appElement = document.getElementById('app');

let PlayerCount = 0; 

// Watch for player count changes
store.subscribe((state) => {
    const playerCount = state.players.length;

    if (playerCount !== PlayerCount) {
        if (playerCount === 1 && !state.mapGen) {
            const map = generateMap();
            console.log("mapping: ", map);
            store.setState({ 
                ...state, 
                mapGen: true, 
                map: map 
            });
            ws.sendMessage("MAP", { mapp: map });
        } 
        else if (playerCount > 1 && state.mapGen) {
            ws.sendMessage("MAP", { mapp: state.map });
        }

        PlayerCount = playerCount; 
    }
});


router.navigate('/');
