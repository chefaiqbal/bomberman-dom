import { createElement } from "../core/index.js";
import { ws, store } from "../app.js";

const BOMB_TIMER = 3000; // 3 seconds
const EXPLOSION_DURATION = 1000; // 1 second
const BOMB_RADIUS = 2; // How many tiles the explosion reaches

export function placeBomb(x, y, playerId) {
    const tileX = Math.floor(x / 50) * 50;
    const tileY = Math.floor(y / 50) * 50;
    
    // Send bomb placement message to server
    ws.sendMessage("BOMB_PLACE", {
        x: tileX,
        y: tileY,
        owner: playerId,
        radius: BOMB_RADIUS
    });

    // Create bomb element
    const bombElement = createElement("div", {
        class: "bomb",
        style: `
            position: absolute;
            width: 40px;
            height: 40px;
            left: ${tileX + 5}px;
            top: ${tileY + 5}px;
            background-image: url('/static/img/Bomb.png');
            background-size: contain;
            z-index: 1;
        `
    });

    return bombElement;
}

export function createExplosion(x, y, radius) {
    const explosions = [];
    const directions = [[0,0], [1,0], [-1,0], [0,1], [0,-1]];
    
    directions.forEach(([dx, dy]) => {
        for (let i = 0; i <= radius; i++) {
            const explosionX = x + (dx * i * 50);
            const explosionY = y + (dy * i * 50);
            
            const explosion = createElement("div", {
                class: "explosion",
                style: `
                    position: absolute;
                    width: 50px;
                    height: 50px;
                    left: ${explosionX}px;
                    top: ${explosionY}px;
                    background-image: url('/static/img/Bomb.png');
                    background-size: contain;
                    z-index: 2;
                `
            });
            
            explosions.push(explosion);
        }
    });

    return explosions;
}
