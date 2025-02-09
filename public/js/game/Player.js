import { createElement, render, createStore } from "../core/index.js";
import { map } from "../components/GameBoard.js";
import { ws } from "../app.js"; 

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
    return createElement("div", {
        class: "player",
        style: `
            position: absolute;
            width: ${frameWidth}px;
            height: ${frameHeight}px;
            left: ${playerStore.getState().x}px;
            top: ${playerStore.getState().y}px;
            background-image: url('/static/img/blue.png');
            background-size: 150px 200px;
            background-repeat: no-repeat;
        `,
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
    const state = playerStore.getState();
    if (state.moving) return;

    let newX = state.x, newY = state.y;
    
    if (e.key === "ArrowLeft") {newX -= tileSize;
        ws.sendMessage("MOVE", {direction: "LEFT" });
    };
    if (e.key === "ArrowRight") {newX += tileSize;
        ws.sendMessage("MOVE", {direction: "Right" });
    };
    if (e.key === "ArrowUp") {newY -= tileSize;
        ws.sendMessage("MOVE", {direction: "UP" });
    };
    if (e.key === "ArrowDown") {newY += tileSize;
        ws.sendMessage("MOVE", {direction: "DOWN" });
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

function detectCollision(x,y){
    console.log((x-20)/tileSize,(y-20)/tileSize)
    let row=(x-20)/tileSize;
    let col=(y-20)/tileSize;
    console.log(map)
    if( map[col][row]===1 || map[col][row]===2){
        return true}
        return false
    }

gameLoop();
