import {addEvent, removeEvent, triggerEvent} from './index.js';

export function createElement(tag, attrs = {}, ...children ) {
  const filteredChildren = children.flat().filter(child => child !== null && child !== undefined && child !== false);
  return { tag, attrs, children: filteredChildren };
}

export function render(element, container) {
  if (typeof element === 'string' || typeof element === 'number') {
    container.appendChild(document.createTextNode(element));
    return;
  }

  const domElement = document.createElement(element.tag);

  Object.keys(element.attrs || {}).forEach(attr => {
    if (attr.startsWith('on') && typeof element.attrs[attr] === 'function') {
      const eventName = attr.substring(2).toLowerCase();

      addEvent(domElement, eventName, element.attrs[attr]);

      domElement[`on${eventName}`] = (e) => {
        triggerEvent(eventName, e);
      };

      
    } else if (attr === 'checked' || attr === 'value' || attr === 'selected') {
      domElement[attr] = element.attrs[attr];
    } else {
      domElement.setAttribute(attr, element.attrs[attr]);
    }
  });

  element.children.forEach(child => {
    render(child, domElement);
  });

  container.appendChild(domElement);
}
