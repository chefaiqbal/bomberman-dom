import { createElement, render } from '../core/index.js';
import { ChatInput } from './ChatInput.js';

export function Chat({ store, ws }) {
    let state = store.getState();
    
    function handleSendMessage(message) {
        const chatMessage = {
            message: message,
            playerName: state.playerName
        };
        console.log("Sending chat message:", chatMessage);
        ws.sendMessage('CHAT', chatMessage);
    }

    function renderMessages() {
        const messages = state.messages || [];
        return messages.map(msg => 
            createElement('div', { 
                class: 'chat-message mb-2 break-words'
            },
                createElement('span', { 
                    class: 'font-bold text-gray-800'
                }, `${msg.playerName || 'Anonymous'}: `),
                createElement('span', { 
                    class: 'text-gray-700'
                }, msg.message)
            )
        );
    }

    // Subscribe to state changes
    store.subscribe((newState) => {
        state = newState;
        console.log('Chat state updated:', newState.messages);
        const chatContainer = document.querySelector('.chat-messages');
        if (chatContainer) {
            chatContainer.innerHTML = '';
            render(createElement('div', {}, ...renderMessages()), chatContainer);
            chatContainer.scrollTop = chatContainer.scrollHeight;
        }
    });

    return createElement('div', { class: 'bg-white rounded-lg shadow h-[600px] flex flex-col' },
        createElement('div', { class: 'p-4 border-b' },
            createElement('h2', { class: 'text-xl font-semibold text-gray-800' }, 'Chat')
        ),
        createElement('div', { 
            class: 'chat-messages flex-1 overflow-y-auto p-4 space-y-2'
        }, ...renderMessages()),
        createElement('div', { class: 'border-t' },
            ChatInput({ onSend: handleSendMessage })
        )
    );
}
