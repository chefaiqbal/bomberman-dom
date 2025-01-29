
import { createElement,render } from "../core/dom.js";

  const blockPath = '/static/img/block.png';
  const wallPath = '/static/img/wall.png'
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
  
  function generateMap() {
    return temp.map(row =>
      row.map(cell => (cell === 0 && Math.random() > 0.2 ? 2 : cell)) 
    );
  }
;

  function renderMap(map) {
    return createElement(
      'div',
      { class: 'map', style: 'display: grid; grid-template-columns: repeat(15, 60px);  grid-template-rows: repeat(11, 60px); ' },
      map.flatMap((row) =>
        row.map((cell) => {
          if (cell === 1) {
            return createElement('div', { class: 'wall', style: `background: url(${wallPath}) no-repeat center; background-size: contain;`});
          }
          if (cell === 2) {
            return createElement('div', { class: 'wall', style: `background: url(${blockPath}) no-repeat center; background-size: contain;`});
          }
          return createElement('div', { class: 'empty', style: 'width: 60px; height: 60px; background: green;' });
        })
      )
    );
  }
  
  const map= generateMap();
  const mapElement = renderMap(map);
  const container = document.getElementById('game-container');
  render(mapElement, container);
  