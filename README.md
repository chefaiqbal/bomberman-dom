# 💣 Bomberman DOM

A multiplayer Bomberman game built with a custom vanilla JavaScript framework and Go WebSocket server.

<img alt="Bomberman Game" src="public/static/img/bombermandom.gif">

## 🚀 Features
- Real-time Multiplayer - Play with up to 4 players simultaneously
- Custom Framework - Built on a lightweight vanilla JS framework
- Power-ups System - Collect items to increase your abilities:
  - 💣 Bomb+ (place more bombs)
  - 🔥 Flame+ (increase explosion radius)
  - ⚡ Speed+ (move faster)
- Destructible Environment - Strategically destroy walls to reach opponents
- Chat System - Communicate with other players in real-time
- Lobby System - Wait for players and see when game is starting
- Auto IP Detection - Automatically detects and uses your machine's IP address

## 🛠️ Technology Stack
<img alt="JavaScript" src="https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black">
<img alt="Go" src="https://img.shields.io/badge/Go-00ADD8?style=for-the-badge&logo=go&logoColor=white">
<img alt="WebSockets" src="https://img.shields.io/badge/WebSockets-010101?style=for-the-badge&logo=socket.io&logoColor=white">
<img alt="HTML5" src="https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white">
<img alt="TailwindCSS" src="https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white">
<img alt="GitHub Copilot" src="https://img.shields.io/badge/GitHub_Copilot-24292e?style=for-the-badge&logo=github&logoColor=white">

### Backend
- Go 1.23.5 - Fast and efficient server-side language
- Gorilla WebSockets - WebSocket implementation for Go
- Custom Game Engine - In-memory game state management

### Frontend
- Custom JS Framework - Lightweight, custom-built framework with:
  - Virtual DOM rendering
  - State management store
  - Client-side routing
  - Custom event system
- TailwindCSS - Utility-first CSS framework

## 🏗️ Architecture

### Custom Framework Components
```
core/
├── dom.js         # Virtual DOM-like implementation
├── state.js       # Centralized state management
├── router.js      # Client-side routing
├── eventManagement.js # Custom event handling
└── index.js       # Core exports
```

### Project Structure
```
bomberman-dom/
├── backend/
│   ├── server/
│   │   └── main.go        # HTTP server & static file serving
│   ├── websocket/
│   │   ├── game.go        # Game logic & state management
│   │   ├── game/          # Game phase constants
│   │   │   └── phases.go  # Game phase definitions
│   │   ├── models.go      # Data structures
│   │   ├── session.go     # Session management
│   │   ├── socket.go      # WebSocket handling
│   │   └── timer/         # Game timing system
│   │       └── timer.go   # Timer implementation
│   ├── go.mod             # Go module definition
│   └── go.sum             # Go module checksums
│
├── public/
│   ├── js/
│   │   ├── app.js         # Main application entry point
│   │   ├── components/    # UI components
│   │   │   ├── Banners.js             # Win/lose screens
│   │   │   ├── Chat.js                # Chat component
│   │   │   ├── ChatDisplay.js         # Chat messages UI
│   │   │   ├── ChatInput.js           # Chat input handling
│   │   │   ├── GameBoard.js           # Main game board
│   │   │   ├── GameInProgress.js      # Game status screen
│   │   │   ├── GameTimer.js           # Timer display
│   │   │   ├── Lobby.js               # Lobby interface
│   │   │   ├── NicknameForm.js        # Player name input
│   │   │   ├── NicknameScreen.js      # Initial player screen
│   │   │   └── PreGameLobby.js        # Pre-game state UI
│   │   ├── core/          # Framework core
│   │   │   ├── dom.js                 # Virtual DOM implementation
│   │   │   ├── eventManagement.js     # Event handling system
│   │   │   ├── index.js               # Core exports
│   │   │   ├── router.js              # Client-side routing
│   │   │   └── state.js               # State management
│   │   ├── game/          # Game logic
│   │   │   ├── Bomb.js                # Bomb mechanics
│   │   │   ├── Map.js                 # Map generation & rendering
│   │   │   └── Player.js              # Player movement & actions
│   │   └── utils/         # Utility functions
│   │       └── websocket.js           # WebSocket client
│   │
│   ├── static/
│   │   └── img/           # Game assets & sprites
│   │
│   ├── styles/
│   │   └── main.css       # Custom CSS styles
│   │
│   └── index.html         # Main HTML entry point
│
└── README.md              # Project documentation
```

## 📊 Data Flow

### Game Initialization:
1. Player enters nickname
2. WebSocket connection established
3. Authentication with server
4. Join lobby

### Lobby Phase:
1. Players connect and wait (minimum 2 players)
2. Timer starts when enough players join
3. Map generation and synchronization

### Game Phase:
1. Real-time player movement
2. Bomb placement and explosions
3. Power-up collection and effects
4. Player damage and elimination

### Game End:
1. Winner determination
2. Return to lobby system

## 🎮 Getting Started

### Prerequisites
- Go 1.23.5+
- Modern web browser with WebSocket support

### Installation
1. Clone the repository:
```
git clone https://github.com/chefaiqbal/bomberman-dom.git
cd bomberman-dom
```

2. Start the server:
```
cd backend/server
go run main.go
```

3. Open your browser and navigate to the IP address shown in the console:
```
Server starting on http://192.168.x.x:8081
```

### Network Setup
- The server automatically detects your machine's outbound IP address
- The client automatically connects to the server's IP address
- No manual IP configuration required
- For LAN play, ensure all devices are on the same network

## 🕹️ How to Play
1. Enter your nickname (3-15 characters)
2. Wait in the lobby for other players to join
3. Once the game starts, use the following controls:
   - Arrow keys: Move your character
   - Spacebar: Place bombs
4. Collect power-ups to gain advantages:
   - 💣 Bomb+: Increases the number of bombs you can place simultaneously
   - 🔥 Flame+: Increases your bomb explosion radius
   - ⚡ Speed+: Makes your character move faster
5. Be the last player standing to win!

## 👥 Development
This project was developed using:
- GitHub Copilot - AI pair programming
- Go - Backend server development
- WebSockets - Real-time communication
- Custom JS Framework - Frontend development
- TailwindCSS - UI styling


## 🙏 Credits
- Game concept based on the classic Bomberman series by Hudson Soft
- Created with 💖 by 
- Abdulla Aljuffairi - [@xoabdulla](https://github.com/xoabdulla)
- Amir Iqbal - [@chefaiqbal](https://github.com/chefaiqbal)
- Fatema Mohamed - [@famohamed96](https://github.com/famohamed96)
- Hussain Helal - [@hlhol](https://github.com/hlhol)

