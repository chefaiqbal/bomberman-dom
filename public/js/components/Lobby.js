import { createElement, render } from '../core/index.js';
import { Chat } from './Chat.js';


export function Lobby({ store, router, ws }) {
    let state = store.getState();

    if (!state.isAuthenticated) {
        router.navigate('/');
        return null;
    }

    if (!state.wsConnected) {
        ws.sendMessage('PLAYER_JOIN', {
            id: state.playerName,
            x: 0,
            y: 0,
            lives: 3
        });
        store.setState({ ...state, wsConnected: true });
    }
    

    function renderPlayersList() {
        console.log("Current players:", state.players);
        const playersList = state.players || [{ ID: state.playerName }];
        return createElement('div', { id: 'players-list', class: 'space-y-3' },
            ...playersList.map(player =>
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
            playersListContainer.innerHTML = '';
            render(renderPlayersList(), playersListContainer); 
        }
    }

    store.subscribe((newState) => {
        if (newState.players.length !== state.players.length) {
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
        createElement('div', { class: 'grid grid-cols-1 lg:grid-cols-3 gap-8' },
            createElement('div', { class: 'lg:col-span-2' }, renderPlayersList()),  
            createElement('div', { class: 'lg:col-span-1' }, Chat({ store, ws }))
        )
    );
}
