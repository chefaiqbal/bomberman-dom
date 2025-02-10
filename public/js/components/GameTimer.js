import { createElement, render } from '../core/index.js';

export function GameTimer({ store, router, ws }) {
    const renderTimerDisplay = () => {
        const state = store.getState();
        if (state.players.length < 2) {
            return createElement('div', { 
                class: 'text-xl text-center text-gray-600 mt-4 p-4 bg-gray-100 rounded-lg' 
            }, 'Waiting for more players to join...');
        }
        return createElement('div', { 
            class: 'text-2xl text-center font-bold text-blue-600 mt-4 p-4 bg-blue-50 rounded-lg' 
        }, `Game starting in ${state.gameStartTimer || 10} seconds!`);
    };

    // Create a container element that will be updated
    const timerContainer = createElement('div', { 
        id: 'game-timer-container',
        class: 'w-full'
    }, renderTimerDisplay());

    // Subscribe to state changes
    store.subscribe((newState) => {
        const container = document.getElementById('game-timer-container');
        if (container) {
            container.innerHTML = '';
            render(renderTimerDisplay(), container);
        }
    });

    return timerContainer;
}
