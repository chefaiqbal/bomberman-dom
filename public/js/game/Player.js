import { createElement, render, createStore, addEvent} from "../core/index.js";
import { ws, store } from "../app.js"; 
import { createExplosion } from "./Bomb.js";

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


let lastMoveTime = 0;
let keyStates = {
    "ArrowLeft": false,
    "ArrowRight": false,
    "ArrowUp": false,
    "ArrowDown": false
};


let isInitialKeypress = true;


const POWER_UP_EFFECTS = {
    'bomb': {
        maxBombs: 1,
        apply: (playerState) => ({
            ...playerState,
            maxBombs: playerState.maxBombs + 1
        })
    },
    'flame': {
        radius: 1,
        apply: (playerState) => ({
            ...playerState,
            bombRadius: (playerState.bombRadius || 1) + 1
        })
    },
    'speed': {
        speedBoost: 2,
        apply: (playerState) => ({
            ...playerState,
            speed: (playerState.speed || speed) + 2
        })
    }
};

function createPlayerStore(playerID, x, y) {
    playerStores[playerID] = createStore({
        x, y,
        targetX: x, targetY: y,
        direction: 0, frameIndex: 0,
        moving: false, movingDirection: null,
        canPlaceBomb: true,
        maxBombs: 1,
        bombRadius: 1,
        speed: speed
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



    return players.map((player, index) => {
        const posIndex = index % startPositions.length;
        const { x, y, color } = startPositions[posIndex];


        if (!player.x || !player.y) {
            player.x = x;
            player.y = y;
        }


        if (!playerStores[player.ID]) {
            createPlayerStore(player.ID, player.x, player.y);
        }



        return createElement("div", {
            class: "player",
            "data-name": player.ID,
            style: `
                position: absolute;
                width: ${frameWidth}px;
                height: ${frameHeight}px;
                left: ${player.x}px;
                top: ${player.y}px;
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

        }
    });
    requestAnimationFrame(gameLoop);
}
let lastPressedKey = null;


function handleKeyDown(e) {
    const states = store.getState();
    const playerID = states.playerName;
    if (!playerStores[playerID]) return;

    const currentPlayer = states.players.find(p => p.ID === playerID);
    const currentSpeed = currentPlayer?.speed || 5;
  
    if (e.key in directions) {
      if (!keyStates[e.key]) {
        isInitialKeypress = true;
      }
      keyStates[e.key] = true;
      lastPressedKey = e.key; 
      e.preventDefault();
    }
  
    const state = playerStores[playerID].getState();
    if (state.moving) return;
  
    const currentTime = Date.now();
    const player = states.players.find(p => p.ID === playerID);
    const speedMultiplier = (player?.speed || 5) / 5; 
    const effectiveCooldown = MOVEMENT_COOLDOWN / (currentSpeed / 5);
  
    if (!isInitialKeypress && currentTime - lastMoveTime < effectiveCooldown) return;
  
    let newX = state.x, newY = state.y, frameIndex = state.frameIndex;
  
    if (lastPressedKey === "ArrowLeft") {
      newX -= tileSize; 
    } else if (lastPressedKey === "ArrowRight") {
      newX += tileSize; 
    } else if (lastPressedKey === "ArrowUp") {
      newY -= tileSize;
    } else if (lastPressedKey === "ArrowDown") {
      newY += tileSize; 
    }
    
    if (detectCollision(newX, newY, playerID)) {
      return; 
    }

    ws.sendMessage("MOVE", { 
      direction: lastPressedKey, 
      playerName: playerID, 
      x: newX, 
      y: newY, 
      frameIndex 
    });

    if (!detectCollision(newX, newY, playerID)) {
      playerStores[playerID].setState({
        ...state,
        targetX: newX,
        targetY: newY,
        moving: true,
        direction: directions[lastPressedKey],
        frameIndex: (state.frameIndex + 1) % 3
      });
      lastMoveTime = currentTime;
      isInitialKeypress = false;  
    }
  
    if (e.key === " ") {
        const playerState = playerStores[playerID].getState();
        const activeBombs = document.querySelectorAll(`.bomb[data-owner="${playerID}"]`);
        const maxBombs = player?.MaxBombs || 1;
        const bombRadius = player?.bombRadius || 2;
      

      

        if (activeBombs.length < maxBombs) {
          const bombElement = placeBomb(playerState.x, playerState.y, playerID);
          if (bombElement) {
            const mapElement = document.querySelector(".map");
            if (mapElement) {
              render(bombElement, mapElement);
            }
          }
        }
    }
}
  
  addEvent(document, 'keydown', handleKeyDown);
  

  function placeBomb(x, y, playerId) {
    const state = store.getState();
    const player = state.players.find(p => p.ID === playerId);
    
    if (detectCollision(x, y, playerId)) {

      return null;
    }
  

    const bombElement = createElement("div", {
      class: "bomb",
      "data-owner": playerId,
      style: `
        position: absolute;
        width: 40px;
        height: 40px;
        left: ${x + 5}px;
        top: ${y + 5}px;
        background-image: url('/static/img/Bomb.png');
        background-size: contain;
        z-index: 1;
      `
    });
  

    ws.sendMessage("BOMB_PLACE", {
      x: x,
      y: y,
      owner: playerId,
      radius: player?.bombRadius || 1
    });
  

    setTimeout(() => {
      if (bombElement.parentNode) {
        bombElement.classList.add('exploded');
        bombElement.parentNode.removeChild(bombElement);
      }
    }, BOMB_COOLDOWN);
  

  
    return bombElement;
  }
  

function moveAfterBombPlacement(playerId) {
    const state = store.getState();
    const player = state.players.find(p => p.ID === playerId);

    const directions = [
        { dx: tileSize, dy: 0 },   
        { dx: -tileSize, dy: 0 }, 
        { dx: 0, dy: -tileSize }, 
        { dx: 0, dy: tileSize }    
    ];

    for (const dir of directions) {
        const newX = player.x + dir.dx;
        const newY = player.y + dir.dy;

        if (!detectCollision(newX, newY, playerId)) {
            player.x = newX;
            player.y = newY;

            ws.sendMessage("PLAYER_MOVE", {
                playerId: playerId,
                newX: newX,
                newY: newY
            });

            const playerElement = document.querySelector(`[data-player-id="${playerId}"]`);
            if (playerElement) {
                playerElement.style.left = `${newX}px`;
                playerElement.style.top = `${newY}px`;
            }
            return;
        }
    }


}

function detectCollision(x, y, playerID) {
    const state = store.getState();
    const map = state.map;
    const players = state.players;
    if (!map) return true;


    if (isNaN(x) || isNaN(y)) {

        return true;
    }

    const row = Math.floor((x - 20) / tileSize);
    const col = Math.floor((y - 20) / tileSize);

    if (col < 0 || col >= map.length || row < 0 || row >= map[0].length) {
        return true;
    }

    if (map[col][row] === 1 || map[col][row] === 2) {
        return true;
    }

    const powerUpElement = detectPowerUpCollision(x, y);
    if (powerUpElement) {
        collectPowerUp(playerID, powerUpElement);

        return false;
    }

    const bombElements = document.querySelectorAll('.bomb');
    for (const bombElement of bombElements) {
        const bombX = parseInt(bombElement.style.left) || 0;
        const bombY = parseInt(bombElement.style.top) || 0;
        
        const playerTileX = Math.floor(x / tileSize);
        const playerTileY = Math.floor(y / tileSize);
        const bombTileX = Math.floor(bombX / tileSize);
        const bombTileY = Math.floor(bombY / tileSize);

        if (playerTileX === bombTileX && playerTileY === bombTileY) {

            return true;
        }
    }

    for (const player of players) {
        if (player.ID !== playerID && Math.abs(player.x - x) < tileSize && Math.abs(player.y - y) < tileSize) {
            return true;
        }
    }

    return false;
}

document.onkeyup = function(e) {
    if (e.key in keyStates) {
        keyStates[e.key] = false;
        isInitialKeypress = true;
        if (e.key === lastPressedKey) {
            lastPressedKey = null;
        }
    }
};

function updatePlayerPose() {
    try {
        if (!store) {
            throw new Error('Store is not initialized.');
        }


        const wasRefreshing = localStorage.getItem('gameRefreshing');
        if (wasRefreshing === 'true') {
            localStorage.removeItem('gameRefreshing');
            localStorage.setItem('gameDisconnected', 'true');
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
                                frameIndex: (player.frameIndex + 1) % 3,
                            });
                            updateCharacter(player.ID);  
                        } else {

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
    const powerUpElements = document.querySelectorAll('.power-up:not(.collected)'); // Only check uncollected power-ups
    for (const powerUpElement of powerUpElements) {
        const powerUpX = parseInt(powerUpElement.style.left);
        const powerUpY = parseInt(powerUpElement.style.top);

        if (Math.abs(playerX - powerUpX) < tileSize && Math.abs(playerY - powerUpY) < tileSize) {
            powerUpElement.classList.add('collected'); // Mark as collected
            return powerUpElement;
        }
    }
    return null;
}

function collectPowerUp(playerID, powerUpElement) {
    if (!powerUpElement) {
        console.error('collectPowerUp called with null powerUpElement');
        return;
    }

    const powerUpType = powerUpElement.classList[1];
    const x = parseInt(powerUpElement.style.left);
    const y = parseInt(powerUpElement.style.top);




    ws.sendMessage("POWER_UP_COLLECTED", {
        playerID,
        type: powerUpType,
        x: x,
        y: y
    });




    powerUpElement.remove();



    showPowerUpEffect(powerUpType, playerID);

}



function showPowerUpEffect(type, playerID) {
    const player = document.querySelector(`.player[data-name="${playerID}"]`);
    if (player) {
        const effect = document.createElement('div');
        effect.className = 'power-up-effect';
        effect.textContent = type === 'bomb' ? '💣' : type === 'flame' ? '🔥' : '⚡';
        effect.style.cssText = `
            position: absolute;
            top: -20px;
            left: 50%;
            transform: translateX(-50%);
            font-size: 24px;
            animation: float-up 1s ease-out forwards;
        `;
        player.appendChild(effect);
        
        setTimeout(() => effect.remove(), 1000);
    }
}


export { placeBomb };

addEvent(window, 'beforeunload', function(event) {
    const state = store.getState();
    if (state.gameStarted && state.playerName) {
      localStorage.setItem('gameRefreshing', 'true');
      
      try {
        if (ws && ws.ws.readyState === WebSocket.OPEN) {
          ws.sendMessage('PLAYER_LOST', { playerID: state.playerName });
          location.reload();
        }
      } catch(e) {
        console.error("Error sending player_lost on refresh:", e);
      }
    }
  });
  