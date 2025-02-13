import { createElement, render, createStore } from "../core/index.js";
import { ws, store } from "../app.js"; 

const tileSize = 50;
const frameWidth = 50;
const frameHeight = 50;
const speed = 5; 
const directions = {
    "ArrowDown": 0,
    "ArrowUp": 1,
    "ArrowLeft": 2,
    "ArrowRight": 3
};
const startX = (1.5 * tileSize) - 5;  
const startY = (1.5 * tileSize) - 5;  
const playerStore = createStore({
    x: startX, y: startY,  
    targetX: startX, targetY: startY,  
    direction: 0, frameIndex: 0,
    moving: false, movingDirection: null
});
function updateCharacter() {
    const characterEl = document.querySelector(".player");
    if (!characterEl) return;
    
    const { x, y, direction, frameIndex } = playerStore.getState();
    characterEl.style.left = `${x}px`;
    characterEl.style.top = `${y}px`;
    characterEl.style.backgroundPosition = `-${frameIndex * frameWidth}px -${direction * frameHeight}px`;
}

export function renderPlayer() {
    const states = store.getState();
    const players = [...states.players];

    players.sort((a, b) => a.ID.localeCompare(b.ID)); 

    console.log('Sorted Players:', players);

    const startPositions = [
        { x:  tileSize +20,  y:  tileSize +20, color:"red" },  // top-left
        { x: 13 * tileSize +20, y:  tileSize +20, color:"blue" },  // top-right
        { x: tileSize +20,  y: 9 * tileSize + 20,color:"white"  },  // bottom-left
        { x: 13 * tileSize +20, y: 9* tileSize + 20 ,color:"black"  },  // bottom-right
    ];

    return players.map((player, index) => {
        const posIndex = index % startPositions.length; 
        const { x, y,color } = startPositions[posIndex];

        console.log(`Player ${player.ID} assigned position: ${x}, ${y}`); 

        return createElement("div", {
            class: "player",
            "data-name": player.ID,
            style: `
                position: absolute;
                width: ${frameWidth}px;
                height: ${frameHeight}px;
                left: ${x}px;
                top: ${y}px;
                background-image: url('/static/img/${color}.png');
                background-size: 150px 200px;
                background-repeat: no-repeat;
            `,
        });
    });
}


function gameLoop() {
    const state = playerStore.getState();
    
    if (state.moving) {
        let { x, y, targetX, targetY } = state;
        let dx = targetX - x, dy = targetY - y;
        if (Math.abs(dx) > speed) x += Math.sign(dx) * speed;
        else x = targetX;
        if (Math.abs(dy) > speed) y += Math.sign(dy) * speed;
        else y = targetY;
        playerStore.setState({ ...state, x, y });
        if (x === targetX && y === targetY) {
            playerStore.setState({ ...playerStore.getState(), moving: false });
        }
        updateCharacter();
    }
    requestAnimationFrame(gameLoop);
}
document.onkeydown = function (e) {
    const states = store.getState();
    const state = playerStore.getState();
    if (state.moving) return;
    let newX = state.x, newY = state.y;
    
    if (e.key === "ArrowLeft") {newX -= tileSize;
        ws.sendMessage("MOVE", {direction: "LEFT", playerName: states.playerName });
    };
    if (e.key === "ArrowRight") {newX += tileSize;
        ws.sendMessage("MOVE", {direction: "Right", playerName: states.playerName  });
    };
    if (e.key === "ArrowUp") {newY -= tileSize;
        ws.sendMessage("MOVE", {direction: "UP" , playerName: states.playerName });
    };
    if (e.key === "ArrowDown") {newY += tileSize;
        ws.sendMessage("MOVE", {direction: "DOWN" , playerName: states.playerName });
    };
    if (!detectCollision(newX,newY)){
    playerStore.setState({
        ...state,
        targetX: newX, targetY: newY,
        moving: true, direction: directions[e.key],
        frameIndex: (state.frameIndex + 1) % 3  
    });
}
};
function detectCollision(x, y) {
    const state = store.getState();
    const map = state.map;
    // Guard against null/undefined map
    if (!map) return true; // Block movement if map isn't loaded
    const row = Math.floor((x - 20) / tileSize);
    const col = Math.floor((y - 20) / tileSize);
    // Check if row/col are within valid bounds
    if (col < 0 || col >= map.length || row < 0 || row >= map[0].length) {
        return true;
    }
    return map[col][row] === 1 || map[col][row] === 2;
}
gameLoop();