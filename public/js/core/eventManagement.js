const eventRegistry = new Map();

export function addEvent(element, event, handler) {
  if (!eventRegistry.has(event)) {
    eventRegistry.set(event, []);
    
    element[`on${event}`] = (e) => {
      triggerEvent(event, e);
    };
  }

  const handlerId = Symbol();
  eventRegistry.get(event).push({ element, handlerId, handler });
  return handlerId;
}

export function triggerEvent(event, e) {
  if (eventRegistry.has(event)) {
    eventRegistry.get(event).forEach(({ handler }) => {
      handler(e); 
    });
  }
}

export function removeEvent(element, event, handlerId) {
  if (!eventRegistry.has(event)) return;
  
  const handlers = eventRegistry.get(event);
  const index = handlers.findIndex(h => 
    h.element === element && h.handlerId === handlerId
  );

  if (index !== -1) {
    handlers.splice(index, 1);
    
    if (handlers.length === 0) {
      element[`on${event}`] = null;
      eventRegistry.delete(event);
    }
  }
}
