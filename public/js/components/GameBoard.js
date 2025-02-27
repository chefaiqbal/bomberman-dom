import { createElement, render } from "../core/dom.js";
import { renderMap } from "../game/Map.js";
import { Chat } from './Chat.js';

function createPlayerList(players, store, ID) {
    let previousState = store.getState();

    const updatePlayerList = () => {
        const state = store.getState();
        if (state !== previousState) {
            previousState = state;

            const playerListElement = createElement(
                'div',
                {
                    class: 'player-list',
                    style: 'position: absolute; left: 20px; top: 20px;'
                },
                players.map(player => {
                    const playerState = state.players.find(p => p.ID === player.name);
                    const lives = playerState ? playerState.lives : 3;
                    return createElement('div',
                        {
                            class: 'player-row',
                            style: 'display: flex; align-items: center; margin-bottom: 15px;'
                        },
                        [
                            createElement('span',
                                {
                                    style: 'margin-right: 15px; color: white; font-size: 18px;'
                                },
                                player.name
                            ),
                            createElement('div',
                                {
                                    class: 'lives',
                                    style: 'display: flex; gap: 5px;'
                                },
                                Array(lives).fill().map(() =>
                                    createElement('div',
                                        {
                                            class: 'heart',
                                            style: 'width: 20px; height: 20px; border: 1px solid red; background: url(/static/img/livesheart.webp) no-repeat center; background-size: contain;'
                                        }
                                    )
                                )
                            )
                        ]
                    );
                })
            );

            const existingElement = document.querySelector('.player-list');
            if (existingElement) {
                existingElement.remove();
            }

            render(playerListElement, document.body);
        }
    };

    updatePlayerList();

    store.subscribe(() => {
        updatePlayerList();
    });
}



function createTimer() {
    return createElement(
        'div',
        {
            class: 'timer',
            style: 'position: absolute; right: 100px; top: 20px; color: white; font-size: 24px;'
        },
        '01:00'
    );
}function createPlayerLives(ID, store) {
    let previousLives = null; 

    const updatePlayerLives = () => {
        const state = store.getState();
        const player = state.players.find(player => player.ID === ID);

        if (player) {
            const playerLives = player.lives;
            console.log("Player Lives: ", playerLives);

            if (previousLives !== playerLives) {
                previousLives = playerLives; 

                const playerLivesElement = createElement(
                    'div',
                    {
                        class: 'player-lives',
                        style: 'position: absolute; right: 60px; top: 60px; display: flex; gap: 10px;'
                    },
                    Array(playerLives).fill().map(() =>
                        createElement('div', {
                            class: 'heart-large',
                            style: 'width: 40px; height: 40px; border: 1px solid red; background: url(/static/img/livesheart.webp) no-repeat center; background-size: contain;'
                        })
                    )
                );

                const existingElement = document.querySelector('.player-lives');
                if (existingElement) {
                    existingElement.remove();
                }

                render(playerLivesElement, document.body);
            }
        }
    };

    updatePlayerLives();

    store.subscribe(() => {
        updatePlayerLives(); 
    });
}





export function GameBoard({ store, router, ws }) {
    const state = store.getState();
    let chatVisible = false;
    
    const players = [
        { name: state.playerName },
        ...(state.players || [])
            .filter(player => player.ID !== state.playerName)
            .map(player => ({ name: player.ID }))
    ].filter(player => player.name);

    function toggleChat() {
        chatVisible = !chatVisible;
        const chatContainer = document.querySelector('.chat-container');
        if (chatContainer) {
            chatContainer.style.display = chatVisible ? 'block' : 'none';
        }
    }
    return createElement(
        'div',
        {
            class: 'game-board',
            style: 'position: relative; width: 100%; height: 100vh; background: #333;'
        },
        [
            createElement('div',
                {
                    class: 'map-container',
                    style: 'position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%);'
                },
                [ state.map ? 
                    renderMap(state.map) :
                    createElement('div', 
                        { 
                            class: 'map-loading', 
                            style: 'color: white; font-size: 24px;' 
                        }, 
                        'Loading game map...'
                    )]
            ),
            createPlayerList(players, store, state.playerName),
            KeyToPlay(),
            createTimer(),
            createElement('img', {
                src: '/static/img/chatlogo.png',
                alt: 'Chat',
                style: 'position: absolute; right: 20px; top: 120px; width: 40px; height: 40px; cursor: pointer;',
                onclick: toggleChat
            }),
            createElement('div', 
                {
                    class: 'chat-container',
                    style: 'display: none; position: absolute; right: 20px; top: 170px; width: 300px; height: 400px;'
                },
                Chat({ store, ws })
            ),
            createPlayerLives(state.playerName, store)
        ]
    );
}


function KeyToPlay() {
    return createElement(
        'div',
        {
            class: 'key-to-play',
            style: 'position: absolute; left: 20px; top: 200px; color: white; font-size: 16px;'
        },
        [
            createElement('h2', { style: 'margin-bottom: 10px;' }, 'Key to Play'),
            createElement('div', { style: 'margin-bottom: 10px;' }, [
                createElement('strong', {}, 'Move: '),
                'Arrow Keys (↑, ↓, ←, →)'
            ]),
            createElement('div', { style: 'margin-bottom: 10px;' }, [
                createElement('strong', {}, 'Place Bomb: '),
                'Spacebar'
            ]),

       ]
    );
}

// const gameBoard = GameBoard();
// const container = document.getElementById('app');
// render(gameBoard, container);
