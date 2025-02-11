import { createElement } from '../core/dom.js';

export function NicknameScreen({ store, router }) {
    function handleSubmit(e) {
        e.preventDefault();
        const nickname = e.target.elements.nickname.value.trim();
        
        if (nickname.length >= 3 && nickname.length <= 15) {
            store.setState({
                ...store.getState(),
                playerName: nickname,
                isAuthenticated: true
            });
            router.navigate('/lobby');
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
