import { createElement } from '../core/dom.js';

export function NicknameScreen({ store, router, ws }) {
    const state = store.getState();
    
    // Redirect if game in progress
    if (state.gameInProgress) {
        router.navigate('/game-in-progress');
        return null;
    }
    
    // If we have an active session and we're reconnecting, go to lobby
    if (state.sessionId && state.isAuthenticated) {
        router.navigate('/lobby');
        return null;
    }

    // Only clear session if we don't have one
    if (!state.sessionId) {
        localStorage.removeItem('gameSession');
        store.setState({
            ...state,
            isAuthenticated: false,
            sessionId: null,
            playerName: '',
            players: [],
            messages: [],
            reconnecting: false
        });
    }

    function handleSubmit(e) {
        e.preventDefault();
        const nicknameInput = e.target.querySelector('input[name="nickname"]');
        if (!nicknameInput) {
            console.error('Nickname input not found');
            return;
        }
        
        const nickname = nicknameInput.value.trim();
        
        if (nickname.length >= 3 && nickname.length <= 15) {
            store.setState({
                ...store.getState(),
                playerName: nickname
            });
            ws.authenticate(nickname);
        }
    }

    return createElement('div', { class: 'min-h-screen flex items-center justify-center bg-gray-100' },
        createElement('div', { class: 'max-w-md w-full bg-white rounded-lg shadow-lg p-8' },
            createElement('h1', { class: 'text-3xl font-bold text-center mb-8 text-gray-800' }, 
                'Welcome to Bomberman'
            ),
            createElement('form', { 
                class: 'space-y-6',
                onSubmit: handleSubmit 
            },
                createElement('div', { class: 'space-y-2' },
                    createElement('label', { 
                        for: 'nickname',
                        class: 'block text-sm font-medium text-gray-700'
                    }, 'Choose your nickname'),
                    createElement('input', {
                        id: 'nickname',
                        name: 'nickname',
                        type: 'text',
                        required: true,
                        minLength: 3,
                        maxLength: 15,
                        placeholder: '3-15 characters',
                        class: 'w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
                    })
                ),
                createElement('button', {
                    type: 'submit',
                    class: 'w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md transition-colors'
                }, 'Enter Lobby')
            )
        )
    );
}
