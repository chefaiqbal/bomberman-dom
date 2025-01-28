import { createElement } from '../core/dom.js';
import { Chat } from './Chat.js';

export function Lobby({ store, router, ws }) {
    const state = store.getState();
    
    if (!state.isAuthenticated) {
        router.navigate('/');
        return null;
    }

    // Send player join message when entering lobby
    if (!state.wsConnected) {
        ws.sendMessage('PLAYER_JOIN', {
            id: state.playerId,
            x: 0,
            y: 0,
            lives: 3
        });
        store.setState({ ...state, wsConnected: true });
    }

    function renderPlayersList() {
        return createElement('div', { class: 'bg-white rounded-lg shadow p-6 space-y-4' },
            createElement('div', { class: 'flex justify-between items-center mb-4' },
                createElement('h2', { class: 'text-2xl font-bold text-gray-800' }, 'Connected Players'),
                createElement('span', { class: 'text-lg text-gray-600' }, 
                    `${state.players?.length || 1}/4 Players`
                )
            ),
            state.gameStartTimer && createElement('div', { 
                class: 'text-center p-4 bg-blue-100 rounded-lg mb-4' 
            }, `Game starting in ${state.gameStartTimer} seconds`),
            createElement('div', { class: 'space-y-3' },
                ...(state.players || [{ id: state.playerId, name: state.playerName }]).map(player =>
                    createElement('div', { 
                        class: 'flex items-center p-4 border rounded-lg bg-gray-50'
                    },
                        createElement('div', { class: 'w-3 h-3 rounded-full bg-green-500 mr-3' }),
                        createElement('span', { class: 'text-lg text-gray-700' }, player.name),
                        player.id === state.playerId && 
                            createElement('span', { class: 'ml-2 text-sm text-gray-500' }, '(You)')
                    )
                )
            )
        );
    }

    return createElement('div', { class: 'container mx-auto px-4 py-8' },
        createElement('div', { class: 'flex justify-between items-center mb-8' },
            createElement('h1', { class: 'text-4xl font-bold text-gray-900' }, 'Bomberman Lobby'),
            createElement('div', { class: 'flex items-center gap-4' },
                createElement('span', { class: 'text-lg text-gray-600' }, 
                    `Playing as: ${state.playerName}`
                )
            )
        ),
        createElement('div', { class: 'grid grid-cols-1 lg:grid-cols-3 gap-8' },
            createElement('div', { class: 'lg:col-span-2' }, renderPlayersList()),
            createElement('div', { class: 'lg:col-span-1' }, Chat({ store, ws }))
        )
    );
}
