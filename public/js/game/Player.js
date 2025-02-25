import { createElement, render, createStore } from "../core/index.js";
import { ws, store } from "../app.js"; 
import { placeBomb, createExplosion } from "./Bomb.js";

const tileSize = 50;
const frameWidth = 50;
const frameHeight = 50;
const speed = 5;
const MOVEMENT_COOLDOWN = 200; // Add cooldown between movements (milliseconds)
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

const BOMB_COOLDOWN = 3000; // 3 seconds cooldown

// Add movement cooldown tracking
let lastMoveTime = 0;
let keyStates = {
    "ArrowLeft": false,
    "ArrowRight": false,
    "ArrowUp": false,
    "ArrowDown": false
};

// Track if we're in the initial keypress
let isInitialKeypress = true;

function createPlayerStore(playerID, x, y) {
    playerStores[playerID] = createStore({
        x, y,  
        targetX: x, targetY: y,  
        direction: 0, frameIndex: 0,
        moving: false, movingDirection: null,
        canPlaceBomb: true // Add bomb placement flag
    });
}

function updateCharacter(playerID) {
    const characterEl = document.querySelector(`.player[data-name="${playerID}"]`);
    if (!characterEl || !playerStores[playerID]) return;

    const { x, y, direction, frameIndex } = playerStores[playerID].getState();
    console.log("x:", x, "y:", y, "direction:", direction, "frameIndex:", frameIndex);
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
            // updateCharacter(playerID);
        }
    });
    requestAnimationFrame(gameLoop);
}

// Handle key down
document.onkeydown = function(e) {
    const states = store.getState();
    const playerID = states.playerName;
    if (!playerStores[playerID]) return;

    // Update key state
    if (e.key in keyStates) {
        // If this key wasn't already pressed, it's an initial keypress
        if (!keyStates[e.key]) {
            isInitialKeypress = true;
        }
        keyStates[e.key] = true;
        e.preventDefault();
    }

    const state = playerStores[playerID].getState();
    if (state.moving) return;

    const currentTime = Date.now();
    // Allow movement if it's initial keypress or enough time has passed
    if (!isInitialKeypress && currentTime - lastMoveTime < MOVEMENT_COOLDOWN) return;

    let newX = state.x, newY = state.y, frameIndex = state.frameIndex;

    if (keyStates["ArrowLeft"]) {
        newX -= tileSize;
        ws.sendMessage("MOVE", { direction: "ArrowLeft", playerName: playerID, x: newX, y: newY, frameIndex: frameIndex });
    }
    if (keyStates["ArrowRight"]) {
        newX += tileSize;
        ws.sendMessage("MOVE", { direction: "ArrowRight", playerName: playerID, x: newX, y: newY, frameIndex: frameIndex });
    }
    if (keyStates["ArrowUp"]) {
        newY -= tileSize;
        ws.sendMessage("MOVE", { direction: "ArrowUp", playerName: playerID, x: newX, y: newY, frameIndex: frameIndex });
    }
    if (keyStates["ArrowDown"]) {
        newY += tileSize;
        ws.sendMessage("MOVE", { direction: "ArrowDown", playerName: playerID, x: newX, y: newY, frameIndex: frameIndex });
    }

    if (!detectCollision(newX, newY, playerID)) {
        playerStores[playerID].setState({
            ...state,
            targetX: newX,
            targetY: newY,
            moving: true,
            direction: directions[e.key],
            frameIndex: (state.frameIndex + 1) % 3
        });
        lastMoveTime = currentTime;
        isInitialKeypress = false;  // Reset the initial keypress flag
    }

    // Add bomb placement on spacebar
    if (e.key === " ") {
        const state = store.getState();
        const playerID = state.playerName;
        const playerState = playerStores[playerID].getState();

        if (playerState.canPlaceBomb) {
            const bombElement = placeBomb(playerState.x, playerState.y, playerID);
            const mapElement = document.querySelector(".map");
            if (mapElement) {
                render(bombElement, mapElement);
                
                // Set cooldown
                playerStores[playerID].setState({
                    ...playerState,
                    canPlaceBomb: false
                });

                // Reset after explosion
                setTimeout(() => {
                    playerStores[playerID].setState({
                        ...playerStores[playerID].getState(),
                        canPlaceBomb: true
                    });
                }, BOMB_COOLDOWN);
            }
        }
    }
};

// Update keyup handler to reset initial keypress state
document.onkeyup = function(e) {
    if (e.key in keyStates) {
        keyStates[e.key] = false;
        isInitialKeypress = true;  // Reset for next keypress
    }
};

// Collision detection function
function detectCollision(x, y,playerID) {
    const state = store.getState();
    const map = state.map;
    if (!map) return true; // Block movement if map isn't loaded

    const row = Math.floor((x - 20) / tileSize);
    const col = Math.floor((y - 20) / tileSize);
    const powerUpElement = detectPowerUpCollision(x, y);
    if (powerUpElement) {
        collectPowerUp(playerID, powerUpElement);
        console.log(`Player ${playerID} collected power-up. ${powerUpElement}`);
        return false;
    }
    if (col < 0 || col >= map.length || row < 0 || row >= map[0].length) {
        return true;
    }
    return map[col][row] === 1 || map[col][row] === 2;
}


function updatePlayerPose() {
    try {
        if (!store) {
            throw new Error('Store is not initialized.');
        }

        store.subscribe((state) => {
            const players = state.players;
            players.forEach(player => {
                if (playerStores[player.ID]) {
                    const playerState = playerStores[player.ID].getState();

                    if (player.x !== playerState.x || player.y !== playerState.y) {
                        if (!detectCollision(player.x, player.y,player.ID)) {
                            playerStores[player.ID].setState({
                                ...playerState,
                                x: player.x,        
                                y: player.y,
                                moving: false,     
                                direction: directions[player.direction],
                                frameIndex: (player.frameIndex + 1) % 3
                            });
                            updateCharacter(player.ID);  
                        } else {
                            console.log(`Collision detected for player ${player.ID} at (${player.x}, ${player.y})`);
                        }
                    }
                }
            });
        });

    } catch (error) {
        console.error('Error in updatePlayerPose:', error.message);
    }
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
setTimeout(() => {
    updatePlayerPose(); 
}, 50);


function detectPowerUpCollision(playerX, playerY) {
    console.log('detectPowerUpCollision called');
    console.log('playerX:', playerX, 'playerY:', playerY);
    const powerUpElements = document.querySelectorAll('.power-up');
    for (const powerUpElement of powerUpElements) {
        const powerUpX = parseInt(powerUpElement.style.left);
        const powerUpY = parseInt(powerUpElement.style.top);
console.log('powerUpX:', powerUpX, 'powerUpY:', powerUpY);
        // Check if player is on the same tile as the power-up
        if (Math.abs(playerX - powerUpX) < tileSize && Math.abs(playerY - powerUpY) < tileSize) {
            return powerUpElement;
        }
    }
    return null;
}


function collectPowerUp(playerID, powerUpElement) {
    const powerUpType = powerUpElement.classList[1]; 
    const playerState = playerStores[playerID].getState();
    
    //here
    playerStores[playerID].setState({ ...playerState });

    powerUpElement.remove();
    spawnedPowerUps.delete(`${powerUpElement.dataset.x},${powerUpElement.dataset.y}`);
    console.log(`Player ${playerID} collected ${powerUpType} power-up.`);
}