import { createElement } from '../core/dom.js';

export function GameInProgress({ store }) {
    const state = store.getState();
    const message = state.gamePhase === 'PREGAME' 
        ? 'Game is about to start. Please wait for the next round.'
        : state.gameMessage || 'Game is in progress. Please wait for the current game to finish.';

    return createElement('div', { class: 'min-h-screen flex items-center justify-center bg-gray-100' },
        createElement('div', { class: 'max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center' },
            createElement('h1', { class: 'text-3xl font-bold mb-4 text-gray-800' }, 
                'Game in Progress'
            ),
            createElement('p', { class: 'text-gray-600 mb-6' }, message),
            createElement('div', { class: 'animate-pulse flex justify-center' },
                createElement('div', { class: 'h-4 w-4 bg-blue-600 rounded-full mx-1' }),
                createElement('div', { class: 'h-4 w-4 bg-blue-600 rounded-full mx-1 animation-delay-200' }),
                createElement('div', { class: 'h-4 w-4 bg-blue-600 rounded-full mx-1 animation-delay-400' })
            )
        )
    );
}
