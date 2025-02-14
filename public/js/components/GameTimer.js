import { createElement, render } from '../core/index.js';

export function GameTimer({ store, router, ws }) {
    const state = store.getState();

    const renderTimerDisplay = () => {
        const currentState = store.getState();
        
        if (currentState.players.length < 2) {
            return createElement('div', { 
                class: 'text-xl text-center text-gray-600 mt-4 p-4 bg-gray-100 rounded-lg' 
            }, 'Waiting for more players to join...');
        }

        // Show active timer or waiting message
        if (currentState.timerActive && currentState.gameStartTimer !== null) {
            return createElement('div', { 
                class: 'text-2xl text-center font-bold text-blue-600 mt-4 p-4 bg-blue-50 rounded-lg animate-pulse' 
            }, `Game starting in ${currentState.gameStartTimer} seconds!`);
        }

        return createElement('div', { 
            class: 'text-2xl text-center font-bold text-green-600 mt-4 p-4 bg-green-50 rounded-lg' 
        }, 'Waiting for game to start...');
    };

    const timerContainer = createElement('div', { 
        id: 'game-timer-container',
        class: 'w-full'
    }, renderTimerDisplay());

    // Subscribe to state changes that affect the timer
    store.subscribe((newState) => {
        if (newState.gameStartTimer !== state.gameStartTimer || 
            newState.players.length !== state.players.length ||
            newState.timerActive !== state.timerActive) {
            
            const container = document.getElementById('game-timer-container');
            if (container) {
                container.innerHTML = '';
                render(renderTimerDisplay(), container);
            }
        }
    });

    return timerContainer;
}
