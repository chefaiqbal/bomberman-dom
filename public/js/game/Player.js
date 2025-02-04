import { createElement, render } from "../core/index.js";
let x = 100, y = 100;
const speed = 64;
let frameIndex = 0;
let direction = 0;
const directions = {
    "ArrowDown": 0,
    "ArrowUp": 1,
    "ArrowLeft": 2,
    "ArrowRight": 3
};

function updateCharacter() {
    const characterEl = document.querySelector(".player");
    if (!characterEl) return;

    characterEl.style.left = `${x}px`;
    characterEl.style.top = `${y}px`;

    const frameWidth = 64;
    const frameHeight = 64;
    characterEl.style.backgroundPosition = `-${frameIndex * frameWidth}px -${direction * frameHeight}px`;
}

export function renderPlayer() {
    return createElement("div", {
        class: "player",
        style: `
            position: absolute;
            width: 64px;
            height: 64px;
            left: ${x}px;
            top: ${y}px;
            background-image: url('/static/img/whiteman1.png');
            background-size: 192px 256px;
            background-repeat: no-repeat;
        `,
    });
}

// // Render player
// const container = document.getElementById("game-area");
// const app = renderPlayer();
// render(app, container);

function customKeydownLoop() {
    document.onkeydown = (e) =>{
        // triggerEvent('keydown', e);
        if (directions[e.key] !== undefined) {
    
            direction = directions[e.key];
            frameIndex = (frameIndex + 1) % 3;
    
            if (e.key === "ArrowDown") y += speed;
            if (e.key === "ArrowUp") y -= speed;
            if (e.key === "ArrowLeft") x -= speed;
            if (e.key === "ArrowRight") x += speed;
    
            updateCharacter();
        }}
}

customKeydownLoop();

