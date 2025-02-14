import { createElement, render } from '../core/index.js';
import { Chat } from './Chat.js';
import { GameTimer } from './GameTimer.js';

export function Lobby({ store, router, ws }) {
    let state = store.getState();

    if (!state.isAuthenticated) {
        router.navigate('/');
        return null;
    }

    if (!state.wsConnected) {
        setTimeout(() => {
            ws.sendMessage('PLAYER_JOIN', {
                id: state.playerName,
                x: 0,
                y: 0,
                lives: 3
            });
            store.setState({ ...state, wsConnected: true });
        }, 100);
    }

    function renderPlayersList() {
        console.log("Current players:", state.players);
        const uniquePlayers = state.players.reduce((acc, current) => {
            const x = acc.find(item => item.ID === current.ID);
            if (!x) {
                return acc.concat([current]);
            } else {
                return acc;
            }
        }, []);

        return createElement('div', { id: 'players-list', class: 'space-y-3' },
            ...uniquePlayers.map(player =>
                createElement('div', { class: 'flex items-center p-4 border rounded-lg bg-gray-50' },
                    createElement('div', { class: 'w-3 h-3 rounded-full bg-green-500 mr-3' }),
                    createElement('span', { class: 'text-lg text-gray-700' }, player.ID),
                    player.ID === state.playerName && 
                        createElement('span', { class: 'ml-2 text-sm text-gray-500' }, '(You)')
                )
            )
        );
    }

    function updatePlayersList() {
        const playersListContainer = document.getElementById('players-list');
        if (playersListContainer) {
            render(renderPlayersList(), playersListContainer);
        }
    }

    store.subscribe((newState) => {
        const oldPlayerIds = new Set(state.players.map(p => p.ID));
        const newPlayerIds = new Set(newState.players.map(p => p.ID));
        
        if (oldPlayerIds.size !== newPlayerIds.size || 
            [...oldPlayerIds].some(id => !newPlayerIds.has(id)) ||
            [...newPlayerIds].some(id => !oldPlayerIds.has(id))) {
            state = newState;
            updatePlayersList();
        }
    });

    return createElement('div', { class: 'container mx-auto px-4 py-8' },
        createElement('div', { class: 'flex justify-between items-center mb-8' },
            createElement('h1', { class: 'text-4xl font-bold text-gray-900' }, 'Bomberman Lobby'),
            createElement('div', { class: 'flex items-center gap-4' },
                createElement('span', { class: 'text-lg text-gray-600' }, `Playing as: ${state.playerName}`)
            )
        ),
        GameTimer({ store, router, ws }),
        createElement('div', { class: 'grid grid-cols-1 lg:grid-cols-3 gap-8 mt-4' },
            createElement('div', { class: 'lg:col-span-2' }, renderPlayersList()),  
            createElement('div', { class: 'lg:col-span-1' }, Chat({ store, ws }))
        )
    );
}
