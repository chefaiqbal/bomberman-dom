import { createElement, render, createStore } from "../core/index.js";

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
            background-image: url('/static/img/whiteman1.png');
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
    
    if (e.key === "ArrowLeft") newX -= tileSize;
    if (e.key === "ArrowRight") newX += tileSize;
    if (e.key === "ArrowUp") newY -= tileSize;
    if (e.key === "ArrowDown") newY += tileSize;
    
    playerStore.setState({
        ...state,
        targetX: newX, targetY: newY,
        moving: true, direction: directions[e.key],
        frameIndex: (state.frameIndex + 1) % 3  
    });
};

gameLoop();
