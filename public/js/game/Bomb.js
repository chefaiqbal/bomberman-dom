import { createElement } from "../core/index.js";
import { ws, store } from "../app.js";

const BOMB_TIMER = 3000; // 3 seconds
const EXPLOSION_DURATION = 1000; // 1 second
const BOMB_RADIUS = 2; // How many tiles the explosion reaches

// Updated sprite configuration
const explosionFrameWidth = 94;  // Width of each frame
const explosionFrameHeight = 94; // Height of each frame
const explosionFrameCount = 5;   // We have 5 explosion images
const explosionImages = [
    '/static/img/explosion1.png',
    '/static/img/explosion2.png',
    '/static/img/explosion3.png',
    '/static/img/explosion4.png',
    '/static/img/explosion5.png'
];

export function placeBomb(x, y, playerId) {
    const tileX = x;
    const tileY = y;
    
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
    try {
        console.log('Creating explosion at:', x, y, 'with radius:', radius);
        const explosions = [];
        const directions = [[0,0], [1,0], [-1,0], [0,1], [0,-1]];
        
        directions.forEach(([dx, dy]) => {
            for (let i = 0; i <= radius; i++) {
                const explosionX = x + (dx * i * 50);
                const explosionY = y + (dy * i * 50);

                const explosion = document.createElement('div');
                explosion.className = 'explosion';
                
                Object.assign(explosion.style, {
                    position: 'absolute',
                    width: explosionFrameWidth + 'px',
                    height: explosionFrameHeight + 'px',
                    left: (explosionX - explosionFrameWidth/2 + 25) + 'px',
                    top: (explosionY - explosionFrameHeight/2 + 25) + 'px',
                    backgroundImage: `url('${explosionImages[0]}')`,
                    backgroundSize: 'contain',
                    backgroundRepeat: 'no-repeat',
                    zIndex: '2'
                });

                let currentFrame = 0;
                const animate = () => {
                    if (currentFrame >= explosionFrameCount) {
                        // Clear the background image on the last frame
                        explosion.style.backgroundImage = 'none';
                        return;
                    }
                    explosion.style.backgroundImage = `url('${explosionImages[currentFrame]}')`;
                    currentFrame++;
                };

                // Start animation with slightly faster timing
                const intervalId = setInterval(animate, EXPLOSION_DURATION / (explosionFrameCount + 1));
                explosion.dataset.intervalId = intervalId;
                
                explosions.push(explosion);
            }
        });

        return explosions;
    } catch (error) {
        console.error('Error in createExplosion:', error);
        return [];
    }
}
