import { createElement } from '../core/index.js';
import { Chat } from './Chat.js';
import { GameTimer } from './GameTimer.js';

export function PreGameLobby({ store, router, ws }) {
    let state = store.getState();

    function renderPlayersList() {
        const uniquePlayers = state.players.reduce((acc, current) => {
            const x = acc.find(item => item.ID === current.ID);
            if (!x) {
                return acc.concat([current]);
            } else {
                return acc;
            }
        }, []);

        return createElement('div', { class: 'space-y-4' },
            createElement('div', { 
                class: 'flex justify-between items-center mb-4 p-3 bg-red-50 rounded-lg'
            },
                createElement('span', { class: 'text-lg font-semibold text-red-800' }, 
                    'Game Starting Soon!'
                ),
                createElement('span', { 
                    class: 'text-lg font-bold text-red-600'
                }, 
                    `${uniquePlayers.length} Players Ready`
                )
            ),
            createElement('div', { 
                id: 'players-list', 
                class: 'space-y-3' 
            },
                ...uniquePlayers.map(player =>
                    createElement('div', { class: 'flex items-center p-4 border rounded-lg bg-red-50' },
                        createElement('div', { class: 'w-3 h-3 rounded-full bg-red-500 mr-3' }),
                        createElement('span', { class: 'text-lg text-gray-700' }, player.ID),
                        player.ID === state.playerName && 
                            createElement('span', { class: 'ml-2 text-sm text-gray-500' }, '(You)')
                    )
                )
            )
        );
    }

    return createElement('div', { class: 'container mx-auto px-4 py-8' },
        createElement('div', { class: 'flex justify-between items-center mb-8' },
            createElement('h1', { class: 'text-4xl font-bold text-red-900' }, 'Game Starting'),
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