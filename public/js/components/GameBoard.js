import { createElement, render } from "../core/dom.js";
import { renderMap, generateMap } from "../game/Map.js";

function createPlayerList(players) {
    return createElement(
        'div',
        {
            class: 'player-list',
            style: 'position: absolute; left: 20px; top: 20px;'
        },
        players.map(player =>
            createElement('div',
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
                        Array(3).fill().map(() =>
                            createElement('div',
                                {
                                    class: 'heart',
                                    style: 'width: 20px; height: 20px; border: 1px solid red; background: url(/static/img/livesheart.webp) no-repeat center; background-size: contain;'
                                }
                            )
                        )
                    )
                ]
            )
        )
    );
}

function createTimer() {
    return createElement(
        'div',
        {
            class: 'timer',
            style: 'position: absolute; right: 60px; top: 20px; color: white; font-size: 24px;'
        },
        '01:00'
    );
}

function createPlayerLives() {
    return createElement(
        'div',
        {
            class: 'player-lives',
            style: 'position: absolute; right: 20px; top: 60px; display: flex; gap: 10px;'
        },
        Array(3).fill().map(() =>
            createElement('div',
                {
                    class: 'heart-large',
                    style: 'width: 40px; height: 40px; border: 1px solid red; background: url(/static/img/livesheart.webp) no-repeat center; background-size: contain;'
                } 
            )
        )
    );
}

export function GameBoard( { store, router, ws }) {
    const players = [
        { name: 'Player 1' },
        { name: 'Player 2' },
        { name: 'Player 3' },
        { name: 'Player 4' }
    ];

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
                [renderMap(generateMap())]
            ),
            createPlayerList(players),
            createTimer(),
            createPlayerLives()
        ]
    );
}

// const gameBoard = GameBoard();
// const container = document.getElementById('app');
// render(gameBoard, container);
