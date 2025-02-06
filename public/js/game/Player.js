import { createElement, render,createStore  } from "../core/index.js";

const speed = 10;
const frameWidth = 64;
const frameHeight = 64;

const directions = {
    "ArrowDown": 0,
    "ArrowUp": 1,
    "ArrowLeft": 2,
    "ArrowRight": 3
};

const playerStore = createStore({
    x: 100,
    y: 100,
    direction: 0,
    frameIndex: 0,
    movingDirection: null
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
            background-size: 192px 256px;
            background-repeat: no-repeat;
        `,
    });
}
// // Render player
// const container = document.getElementById("game-area");
// const app = renderPlayer();
// render(app, container);

function gameLoop() {
    const state = playerStore.getState();
    if (state.movingDirection !== null) {
        const direction = directions[state.movingDirection];

        playerStore.setState({
            ...state,
            direction,
            frameIndex: (state.frameIndex + 1) % 3,
            x: state.movingDirection === "ArrowLeft" ? state.x - speed : state.movingDirection === "ArrowRight" ? state.x + speed : state.x,
            y: state.movingDirection === "ArrowUp" ? state.y - speed : state.movingDirection === "ArrowDown" ? state.y + speed : state.y
        });

        updateCharacter();
    }

    requestAnimationFrame(gameLoop);
}

document.onkeydown = function (e) {
    if (directions[e.key] !== undefined) {
        playerStore.setState({ ...playerStore.getState(), movingDirection: e.key });
    }
};

document.onkeyup = function (e) {
    if (e.key === playerStore.getState().movingDirection) {
        playerStore.setState({ ...playerStore.getState(), movingDirection: null });
    }
};

gameLoop();
