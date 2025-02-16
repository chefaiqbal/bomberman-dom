import { createElement, render, createStore } from "../core/index.js";
import { ws, store } from "../app.js"; 
import { placeBomb, createExplosion } from "./Bomb.js";

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

const startPositions = [
    { x: tileSize + 20, y: tileSize + 20, color: "red" },  // Top-left
    { x: 13 * tileSize + 20, y: tileSize + 20, color: "blue" },  // Top-right
    { x: tileSize + 20, y: 9 * tileSize + 20, color: "white" },  // Bottom-left
    { x: 13 * tileSize + 20, y: 9 * tileSize + 20, color: "black" }  // Bottom-right
];

const playerStores = {}; 

function createPlayerStore(playerID, x, y) {
    playerStores[playerID] = createStore({
        x, y,  
        targetX: x, targetY: y,  
        direction: 0, frameIndex: 0,
        moving: false, movingDirection: null
    });
}

function updateCharacter(playerID) {
    const characterEl = document.querySelector(`.player[data-name="${playerID}"]`);
    if (!characterEl || !playerStores[playerID]) return;

    const { x, y, direction, frameIndex } = playerStores[playerID].getState();
    characterEl.style.left = `${x}px`;
    characterEl.style.top = `${y}px`;
    characterEl.style.backgroundPosition = `-${frameIndex * frameWidth}px -${direction * frameHeight}px`;
}

export function renderPlayer() {
    const states = store.getState();
    const players = [...states.players];

    players.sort((a, b) => a.ID.localeCompare(b.ID)); 

    console.log('Sorted Players:', players);

    return players.map((player, index) => {
        const posIndex = index % startPositions.length; 
        const { x, y, color } = startPositions[posIndex];

        if (!playerStores[player.ID]) {
            createPlayerStore(player.ID, x, y);
        }

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
    Object.keys(playerStores).forEach(playerID => {
        const state = playerStores[playerID].getState();
        
        if (state.moving) {
            let { x, y, targetX, targetY } = state;
            let dx = targetX - x, dy = targetY - y;
            if (Math.abs(dx) > speed) x += Math.sign(dx) * speed;
            else x = targetX;
            if (Math.abs(dy) > speed) y += Math.sign(dy) * speed;
            else y = targetY;
            
            playerStores[playerID].setState({ ...state, x, y });

            if (x === targetX && y === targetY) {
                playerStores[playerID].setState({ ...playerStores[playerID].getState(), moving: false });
            }
            updateCharacter(playerID);
        }
    });
    requestAnimationFrame(gameLoop);
}

// Handle keyboard inputs for movement
document.onkeydown = function (e) {
    const states = store.getState();
    const playerID = states.playerName; 
    if (!playerStores[playerID]) return;

    const state = playerStores[playerID].getState();
    if (state.moving) return;
    
    let newX = state.x, newY = state.y;
    
    if (e.key === "ArrowLeft") {
        newX -= tileSize;
        ws.sendMessage("MOVE", { direction: "LEFT", playerName: playerID, x: newX, y: newY });
    }
    if (e.key === "ArrowRight") {
        newX += tileSize;
        ws.sendMessage("MOVE", { direction: "RIGHT", playerName: playerID, x: newX, y: newY });
    }
    if (e.key === "ArrowUp") {
        newY -= tileSize;
        ws.sendMessage("MOVE", { direction: "UP", playerName: playerID, x: newX, y: newY });
    }
    if (e.key === "ArrowDown") {
        newY += tileSize;
        ws.sendMessage("MOVE", { direction: "DOWN", playerName: playerID, x: newX, y: newY });
    }

    if (!detectCollision(newX, newY)) {
        playerStores[playerID].setState({
            ...state,
            targetX: newX, targetY: newY,
            moving: true, direction: directions[e.key],
            frameIndex: (state.frameIndex + 1) % 3  
        });
    }

    // Add bomb placement on spacebar
    if (e.key === " ") {
        const bombElement = placeBomb(state.x, state.y, playerID);
        const mapElement = document.querySelector(".map");
        if (mapElement) {
            render(bombElement, mapElement);
        }
    }
};

// Collision detection function
function detectCollision(x, y) {
    const state = store.getState();
    const map = state.map;
    if (!map) return true; // Block movement if map isn't loaded

    const row = Math.floor((x - 20) / tileSize);
    const col = Math.floor((y - 20) / tileSize);
    
    if (col < 0 || col >= map.length || row < 0 || row >= map[0].length) {
        return true;
    }
    return map[col][row] === 1 || map[col][row] === 2;
}


export function handleBombExplosion(x, y, radius) {
    const explosions = createExplosion(x, y, radius);
    const mapElement = document.querySelector(".map");
    
    explosions.forEach(explosion => {
        render(explosion, mapElement);
    });

    // Remove explosions after animation
    setTimeout(() => {
        document.querySelectorAll(".explosion").forEach(el => {
            el.remove();
        });
    }, 1000);
}

gameLoop();

