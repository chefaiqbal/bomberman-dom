export const initialState = {
    playerId: Math.random().toString(36).substring(7),
    playerName: 'Player ' + Math.floor(Math.random() * 1000),
    games: [],
    currentGame: null
};

export function createStore(initialState) {
    let state = initialState;
    const listeners = [];
  
    function getState() {
      return state;
    }
  
    function setState(newState) {
      state = newState;
      listeners.forEach(listener => listener(state));
    }
  
    function subscribe(listener) {
      listeners.push(listener);
      return () => {
        const index = listeners.indexOf(listener);
        listeners.splice(index, 1);
      };
    }
  
    return { getState, setState, subscribe };
  }
