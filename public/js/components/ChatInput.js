import { createElement } from '../core/dom.js';

export function ChatInput({ onSend }) {
    function handleSubmit(e) {
        e.preventDefault();
        const message = e.target.elements.message.value.trim();
        if (message) {
            onSend(message);
            e.target.reset();
            e.target.elements.message.focus();
        }
    }

    return createElement('form', { 
        class: 'chat-input mt-4 flex gap-2', 
        onSubmit: handleSubmit 
    },
        createElement('input', {
            type: 'text',
            name: 'message',
            placeholder: 'Type a message...',
            class: 'flex-grow px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500'
        }),
        createElement('button', {
            type: 'submit',
            class: 'px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500'
        }, 'Send')
    );
}
