import { createElement } from '../core/dom.js';

export function Chat({ store, ws }) {
    const state = store.getState();

    function sendMessage(e) {
        e.preventDefault();
        const input = e.target.elements.message;
        const message = input.value.trim();
        
        if (message) {
            ws.sendMessage('CHAT', {
                message: message
            });
            input.value = '';
        }
    }

    return createElement('div', { class: 'bg-white rounded-lg shadow h-[600px] flex flex-col' },
        createElement('div', { class: 'p-4 border-b' },
            createElement('h2', { class: 'text-xl font-semibold text-gray-800' }, 'Chat')
        ),
        createElement('div', { class: 'flex-1 overflow-y-auto p-4 space-y-2' },
            ...(state.messages || []).map(msg => 
                createElement('div', { class: 'message' },
                    createElement('span', { class: 'font-semibold text-blue-600' }, `${msg.player}: `),
                    createElement('span', { class: 'text-gray-700' }, msg.text)
                )
            )
        ),
        createElement('form', { 
            class: 'border-t p-4 flex gap-2',
            onSubmit: sendMessage 
        },
            createElement('input', { 
                type: 'text',
                name: 'message',
                placeholder: 'Type a message...',
                class: 'flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500'
            }),
            createElement('button', { 
                type: 'submit',
                class: 'px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors'
            }, 'Send')
        )
    );
}
