import { createElement,render } from "../core/dom.js";
import { renderPlayer } from "../game/Player.js"; 


  const blockPath = '/static/img/Bwall.png';
  const wallPath = '/static/img/wall.png';
  const floorPath = '/static/img/floor.png';
const temp = [
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    [1, 3, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3, 3, 1],
    [1, 3, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 3, 1],
    [1, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3, 1],
    [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1],
    [1, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3, 1],
    [1, 3, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 3, 1],
    [1, 3, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3, 3, 1],
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
  ];

  export function generateMap() {
    return temp.map(row =>
      row.map(cell => (cell === 0 && Math.random() > 0.2 ? 2 : cell)) 
    );
  }
;

export function renderMap(map) {
  return createElement(
    'div',
    { 
      class: 'map', 
      style: `
        display: grid; 
        grid-template-columns: repeat(15, 50px);  
        grid-template-rows: repeat(11, 50px);
        justify-content: center;
        margin: 0 auto;
        padding: 20px;
      ` 
    },
    map.flatMap((row) =>
      row.map((cell) => {
        if (cell === 1) {
          return createElement('div', { class: 'wall', style: `background: url(${wallPath}) no-repeat center; background-size: contain;`});
        }
        if (cell === 2) {
          return createElement('div', { class: 'wall', style: `background: url(${blockPath}) no-repeat center; background-size: contain;`});
        }
        return createElement('div', { class: 'empty', style: 'width: 50px; height: 50px; background: green;' });
      })
    ), renderPlayer()
  );        
}

export function updateMapTile(x, y, newValue) {
    const tileX = Math.floor(x / 50);
    const tileY = Math.floor(y / 50);
    
    if (temp[tileY] && temp[tileY][tileX] === 2) { // Only destroy breakable walls
        temp[tileY][tileX] = 0;
        
        // Update the visual representation
        const mapElement = document.querySelector(".map");
        const tileElement = mapElement.children[tileY * 15 + tileX];
        if (tileElement) {
            tileElement.style.background = 'green';
        }
    }
}

  
  // const map= generateMap();
  // const mapElement = renderMap(map);
  // const container = document.getElementById('game-container');
  // render(mapElement, container);
  