import { createElement } from '../core/dom.js';

export function NicknameForm({ store, onSubmit }) {
    function handleSubmit(e) {
        e.preventDefault();
        const nickname = e.target.elements.nickname.value.trim();
        if (nickname.length >= 3 && nickname.length <= 15) {
            store.setState({
                ...store.getState(),
                playerName: nickname,
                hasSetNickname: true
            });
            onSubmit();
        }
    }

    return createElement('div', { class: 'min-h-screen flex items-center justify-center' },
        createElement('div', { class: 'bg-white p-8 rounded-lg shadow-lg max-w-md w-full' },
            createElement('h1', { class: 'text-2xl font-bold text-gray-900 mb-6 text-center' }, 
                'Enter Your Nickname'
            ),
            createElement('form', { 
                class: 'space-y-4',
                onSubmit: handleSubmit 
            },
                createElement('div', { class: 'space-y-2' },
                    createElement('input', {
                        type: 'text',
                        name: 'nickname',
                        placeholder: 'Nickname (3-15 characters)',
                        minLength: 3,
                        maxLength: 15,
                        required: true,
                        class: 'w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500'
                    })
                ),
                createElement('button', {
                    type: 'submit',
                    class: 'w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors'
                }, 'Join Lobby')
            )
        )
    );
}
