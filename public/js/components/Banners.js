// components/Banners.js
import { createElement } from '../core/index.js';

export function createWinBanner() {
  return createElement(
    'div',
    {
      class: 'banner win-banner',
      style: `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background-color: green;
        color: white;
        padding: 20px;
        font-size: 24px;
        border-radius: 10px;
        text-align: center;
        z-index: 1000;
      `,
    },
    'You Win! 🎉'
  );
}

export function createLoseBanner() {
  return createElement(
    'div',
    {
      class: 'banner lose-banner',
      style: `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background-color: red;
        color: white;
        padding: 20px;
        font-size: 24px;
        border-radius: 10px;
        text-align: center;
        z-index: 1000;
      `,
    },
    'You Lose! 😢'
  );
}