const eventRegistry = new Map();

console.log('eventRegistry', eventRegistry);

export function addEvent(element, event, handler) {
    
    const handlerId = Symbol();
    
    if (!eventRegistry.has(event)) {
        eventRegistry.set(event, []);
    }

    eventRegistry.get(event).push({ element, handlerId, handler });
    
    return handlerId;
}

export function removeEvent(element, event, handlerId) {
    if (!eventRegistry.has(event)) return;
    
    const handlers = eventRegistry.get(event);
    const index = handlers.findIndex(h => h.element === element && h.handlerId === handlerId);
    
    if (index !== -1) {
        handlers.splice(index, 1);
    }
}

export function triggerEvent(event, e) {
    if (eventRegistry.has(event)) {
        eventRegistry.get(event).forEach(({ element, handler }) => {
            if (element === e.target) {
                handler.call(element, e);
            }
        });
    }
}

