import { createElement } from '../core/dom.js';

export function ChatDisplay({ messages = [] }) {    

    function scrollToBottom(element) {
        if (element) {
            setTimeout(() => {
                element.scrollTop = element.scrollHeight;
            }, 0);
        }
    }

    return createElement('div', { 
        class: 'chat-display overflow-y-auto h-64 bg-gray-100 p-4 rounded-lg',
        ref: scrollToBottom
    },
        Array.isArray(messages) && messages.length > 0 ? 
            messages.map((msg, index) =>
                createElement('div', { 
                    key: index, 
                    class: 'chat-message mb-2 break-words'
                },
                    createElement('span', { 
                        class: 'font-bold text-gray-800'
                    }, `${msg.playerName || 'Anonymous'}: `),
                    createElement('span', { 
                        class: 'text-gray-700'
                    }, msg.message)
                )
            )
            : createElement('div', { class: 'text-gray-500 text-center' }, 'No messages yet')
    );
}
