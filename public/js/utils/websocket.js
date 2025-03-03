import { createElement, render, createStore } from "../core/index.js";
import { createExplosion } from "../game/Bomb.js";  // Add this import

export class WebSocketService {
    constructor(store, router) {
        this.store = store;
        this.router = router;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 3; // Increase reconnect attempts for refresh cases
        this.setupWebSocket();
    }
    
    setupWebSocket() {
        this.ws = new WebSocket(`ws://localhost:8080/ws`);
        
        // Check for existing session
        const session = localStorage.getItem('gameSession');
        if (session) {
            const sessionData = JSON.parse(session);
            // Set initial state but don't navigate yet
            this.store.setState({
                ...this.store.getState(),
                playerName: sessionData.playerID,
                sessionId: sessionData.sessionId,
                isAuthenticated: true,
                reconnecting: true
            });
        }
        
        this.setupEventHandlers();
    }
    
    clearSession() {
        localStorage.removeItem('gameSession');
        this.store.setState({
            ...this.store.getState(),
            isAuthenticated: false,
            sessionId: null,
            playerName: '',
            players: [],
            messages: [],
            reconnecting: false
        });
        this.router.navigate('/');
    }
    
    Waiting_Join(clients) {
        this.router.navigate("/lobby");
    }
    
    setupEventHandlers() {
        this.ws.onopen = () => {
            console.log("WebSocket connection established.");
            const session = localStorage.getItem('gameSession');
            if (session) {
                const sessionData = JSON.parse(session);
                // Attempt to revalidate the session
                this.authenticate(sessionData.playerID);
            }
        };

        this.ws.onerror = (error) => {
            console.error("WebSocket error:", error);
            this.clearSession();
        };

        this.ws.onclose = (event) => {
            console.log("WebSocket connection closed:", event);
            
            // On refresh or temporary disconnection, try to reconnect
            if (this.reconnectAttempts < this.maxReconnectAttempts) {
                this.reconnectAttempts++;
                console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
                setTimeout(() => this.setupWebSocket(), 1000);
            } else {
                // Only clear session if we've exhausted reconnection attempts
                this.clearSession();
            }
        };
        this.ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            console.log("Received WebSocket message:", data);
            if (data.status === "wait" && data.redirect) {
                console.log("Redirecting player to", data.redirect);
                this.router.navigate("/wait");
                return;
            }
            switch (data.type) {
                case 'CONNECTION_SUCCESS':
                    // Handle initial connection
                    if (this.store.getState().reconnecting) {
                        const session = localStorage.getItem('gameSession');
                        if (session) {
                            const sessionData = JSON.parse(session);
                            this.authenticate(sessionData.playerID);
                        }
                    }
                    break;
                case 'AUTH_RESPONSE':
                    this.handleAuthResponse(data.data);
                    break;
                case 'chat':
                    this.handleChatMessage(data.data);
                    break;
                case 'PLAYER_JOIN':
                    this.handlePlayerUpdate(data.data);
                    break;
                case 'GAME_START':
                    this.handleGameStart(data.data);
                    break;
                case "BOMB":
                    break;
                case "MOVE":
                    this.handelMove(data.data);
                    break;
                case "Waiting_Join":
                    this.Waiting_Join(data.data, this.router);
                    break;
                case "MAP":
                    this.handelMap(data.data);
                    break;
                case 'TIMER_UPDATE':
                    this.handleTimerUpdate(data.data);
                    break;
                case 'GAME_STATE':
                    this.handleGameState(data.data);
                    break;
                case 'BOMB_PLACE':
                    this.handleBombPlace(data.data);
                    break;
                case 'BOMB_EXPLODE':
                    this.handleBombExplode(data.data);
                    break;
                case 'LOBBY_PHASE_CHANGE':
                    this.handleLobbyPhaseChange(data.data);
                    break;
                case 'POWER_UP':
                    this.handlePowerUp(data.data);
                    break;
                case 'TAKE_DMG':
                    this.handleTakeDmg(data.data);
                    break;
                case 'REMOVE_POWER_UP':
                    const { x, y } = data.data;
                    const powerUpElement = document.querySelector(`.power-up[data-x="${x}"][data-y="${y}"]`);
                    if (powerUpElement) {
                        powerUpElement.remove();
                        spawnedPowerUps.delete(`${x},${y}`);
                        console.log(`Power-up at (${x}, ${y}) removed.`);
                    } else {
                        console.error(`Power-up element at (${x}, ${y}) not found.`);
                    }
                    break;
                case 'POWER_UP_COLLECTED':
                    this.handlePowerUpCollected(data.data);
                    break;
                default:
                    console.warn("Unknown message type:", data.type);
            }
        };
    }
    
    sendMessage(type, payload) {
        if (this.ws.readyState === WebSocket.OPEN) {
            const message = {
                msgType: type.toUpperCase(),
                msg: payload
            };
            this.ws.send(JSON.stringify(message));
        }
    }

    handleTakeDmg(ID) {
        const state = this.store.getState();
        const players = state.players.map(player => {
            if (player.ID === ID.ID) {
                const updatedLives = Math.max(player.lives - 1, 0); // Prevent negative lives
                console.log(`Player ${ID} took damage! Lives left: ${updatedLives}`);
                return { ...player, lives: updatedLives };
            }
            return player;
        });
    
        this.store.setState({
            ...state,
            players
        });
    
        console.log("after hit: ", state);        
    }


    handelMove(moveData) {
        const { direction, playerName, x, y,  frameIndex} = moveData;

        if (typeof x !== 'number' || typeof y !== 'number') {
            console.error("Invalid coordinates received:", x, y);
            return;
        }
        
        console.log(`Player ${playerName} moved ${direction} to (${x}, ${y}) frameIndex: ${frameIndex}`);
    
        const state = this.store.getState();
        const players = state.players.map(player => 
            player.ID === playerName ? { ...player, x, y, frameIndex,direction } : player
        );
    
        this.store.setState({
            ...state,
            players
        });

        console.log("Updated state:", this.store.getState());
    }
        
    handelMap(map) {
        console.log("Updating map:", map);
        spawnedPowerUps.clear(); 
        this.store.setState({
            ...this.store.getState(),
            map: map
        });
    }    
    
    handleChatMessage(msg) {
        const state = this.store.getState();
        this.store.setState({
            ...state,
            messages: [...state.messages, msg]
        });
    }
    
    handlePlayerUpdate(players) {
        console.log("Updating players list", players);
        const currentState = this.store.getState();
    
        const updatedPlayers = players.map(player => ({
            ...player,
            lives: player.lives !== undefined ? player.lives : 3 
        }));
    
        this.store.setState({
            ...currentState,
            players: updatedPlayers,
            isAuthenticated: true,
            reconnecting: false
        });
    
        // Navigate to lobby if not already there
        if (!currentState.gameStarted && updatedPlayers && updatedPlayers.length > 0) {
            this.router.navigate('/lobby');
        }
    }

    
    handleGameStart(data) {
        console.log("Game start received");
        const currentState = this.store.getState();
        
        this.store.setState({
            ...currentState,
            gameStartTimer: 0,
            timerActive: false,
            gameStarted: true
        });

        // Only navigate if we have a map
        if (currentState.map) {
            this.router.navigate('/game');
        }
    }
    
    handleTimerUpdate(data) {
        console.log("Timer update received:", data);
        const state = this.store.getState();
        
        // Update timer state
        this.store.setState({
            ...state,
            gameStartTimer: data.timeLeft,
            timerActive: data.isActive,
            lobbyPhase: data.phase
        });

        // Force re-render of lobby when phase changes
        if (data.phase !== state.lobbyPhase) {
            this.router.navigate('/lobby');
        }
    }
    
    handleGameState(data) {
        console.log("Game state received:", data);
        
        // Update the store with the full game state
        this.store.setState({
            ...this.store.getState(),
            gameStartTimer: data.timeLeft,
            timerActive: data.isActive,
            players: data.players,
            isAuthenticated: true,
            messages: data.chatHistory || [],
            map: data.map || null,
            reconnecting: false
        });

        // If we're reconnecting and have players, stay in lobby
        if (this.store.getState().reconnecting && data.players && data.players.length > 0) {
            this.router.navigate('/lobby');
        }
    }
    
    handleAuthResponse(data) {
        if (data.sessionId && data.playerId) {
            // Reset reconnect attempts on successful auth
            this.reconnectAttempts = 0;
            
            localStorage.setItem('gameSession', JSON.stringify({
                sessionId: data.sessionId,
                playerID: data.playerId
            }));
            
            this.store.setState({
                ...this.store.getState(),
                sessionId: data.sessionId,
                playerName: data.playerId,
                isAuthenticated: true,
                reconnecting: false
            });
            
            // After authentication, join the game
            this.sendMessage('PLAYER_JOIN', {
                id: data.playerId,
                x: 0,
                y: 0,
                lives: 3
            });
        } else {
            // Only clear session if auth explicitly fails
            this.clearSession();
        }
    }
    
    authenticate(playerName) {
        this.sendMessage('AUTH', { id: playerName });
    }

    handleBombPlace(bombData) {
        const { x, y, owner } = bombData;
        const mapElement = document.querySelector(".map");
        if (!mapElement) return;

        // Create and render bomb element
        const bombElement = document.createElement('div');
        bombElement.className = 'bomb';
        bombElement.style.cssText = `
            position: absolute;
            width: 40px;
            height: 40px;
            left: ${x + 5}px;
            top: ${y + 5}px;
            background-image: url('/static/img/Bomb.png');
            background-size: contain;
            z-index: 1;
        `;
        
        mapElement.appendChild(bombElement);
    }
    handleBombExplode(explosionData) {
        try {
            const EXPLOSION_DURATION = 1000;
            console.log('Handling bomb explosion:', explosionData);
            const { BombX, BombY, Radius, Destroyed } = explosionData;
    
            // Remove existing bomb element
            const bombs = document.querySelectorAll('.bomb');
            bombs.forEach(bomb => {
                const bombX = parseInt(bomb.style.left) - 5;
                const bombY = parseInt(bomb.style.top) - 5;
                if (bombX === BombX && bombY === BombY) {
                    bomb.remove();
                }
            });
    
            // Get map element
            const mapElement = document.querySelector(".map");
            if (!mapElement) {
                console.error('Map element not found');
                return;
            }
    
            // Handle destroyed tiles
            Destroyed.forEach(({X, Y}) => {
                const tileElement = mapElement.children[Y * 15 + X];
                if (tileElement) {
                    tileElement.style.background = 'green';
                    console.log(`Tile at (${X}, ${Y}) destroyed.`);
                    spawnPowerUp(X, Y, this);
                }
            });
    
            // Create explosion animations for each tile in the radius
            const directions = [[0,0], [1,0], [-1,0], [0,1], [0,-1]];
            directions.forEach(([dx, dy]) => {
                for (let i = 0; i <= Radius; i++) {
                    const explosionX = BombX + (dx * i * 50);
                    const explosionY = BombY + (dy * i * 50);
    
                    const tileX = Math.floor(explosionX / 50);
                    const tileY = Math.floor(explosionY / 50);
                    const map = this.store.getState().map;
    
                    if (map && map[tileY] && (map[tileY][tileX] === 1)) {
                        break;
                    }
    
                    const explosion = document.createElement('div');
                    explosion.className = 'explosion';
                    Object.assign(explosion.style, {
                        position: 'absolute',
                        width: '94px',
                        height: '94px',
                        left: (explosionX - 47 + 25) + 'px',
                        top: (explosionY - 47 + 25) + 'px',
                        backgroundImage: `url('/static/img/explosion1.png')`,
                        backgroundSize: 'contain',
                        backgroundRepeat: 'no-repeat',
                        zIndex: '2'
                    });
    
                    let frame = 0;
                    const animate = setInterval(() => {
                        if (frame >= 5) {
                            clearInterval(animate);
                            explosion.remove();
                            return;
                        }
                        explosion.style.backgroundImage = `url('/static/img/explosion${frame + 1}.png')`;
                        frame++;
                    }, EXPLOSION_DURATION / 5);
    
                    mapElement.appendChild(explosion);
                }
            });
    
            const players = this.store.getState().players;
            players.forEach(player => {
                const { x, y, ID } = player;
                const playerTileX = Math.floor(x / 50);
                const playerTileY = Math.floor(y / 50);
    
                console.log(`Checking player ${ID} at (${playerTileX}, ${playerTileY})`);
    
                if (
                    (Math.abs(playerTileX - Math.floor(BombX / 50)) + Math.abs(playerTileY - Math.floor(BombY / 50)) <= Radius)
                ) {
                    console.log(`Player ${ID} hit by explosion!`);
                    this.PlayerHit(ID);
                }
            });
        } catch (error) {
            console.error('Error in handleBombExplode:', error);
        }
    }
    
    PlayerHit(ID) {
        this.sendMessage("TAKE_DMG", {ID: ID});
    }
    
    handleLobbyPhaseChange(data) {
        const state = this.store.getState();
        this.store.setState({
            ...state,
            lobbyPhase: data.phase
        });
        
        // Re-render lobby with new phase
        this.router.navigate('/lobby');
    }


    powerUps = {
        bomb: '/static/img/morebomb.png',
        flame: '/static/img/flamePower.png',
        speed: '/static/img/speed.png'
    };

    
    handlePowerUp(powerUpData) {
        const { x, y, type } = powerUpData;
        console.log(`Power-up received at (${x}, ${y}): ${type}`);
    
        const powerUpElement = createElement("div", {
            class: `power-up ${type}`,  "data-x": x,
            "data-y": y,
            style: `left: ${(x * 50) + 20}px; 
                    top: ${(y * 50) + 20}px; 
                    background-image: url(${this.powerUps[type]}); 
                    width: 50px; height: 50px; 
                    position: absolute; 
                    background-size: contain;`
        });
    
        const mapElement = document.querySelector(".map");
        if (!mapElement) {
            console.error("Map element not found!");
            return;
        }
    
        render(powerUpElement, mapElement);
    }

    handlePowerUpCollected(powerUpData) {
        const currentState = this.store.getState();
        const updatedPlayers = currentState.players.map(player => {
            if (player.ID === powerUpData.playerID) {
                const currentMaxBombs = player.maxBombs || 1;
                const currentBombRadius = player.bombRadius || 1;
                const currentSpeed = player.speed || 5;
                
                let newState = {
                    ...player,
                    maxBombs: currentMaxBombs,
                    bombRadius: currentBombRadius,
                    speed: currentSpeed
                };

                // Apply power-up effects
                switch(powerUpData.type) {
                    case 'bomb':
                        newState.maxBombs += 1;
                        break;
                    case 'flame':
                        newState.bombRadius += 1;
                        break;
                    case 'speed':
                        newState.speed += 1;
                        break;
                }

                console.log(`Updated player stats:`, newState);
                return newState;
            }
            return player;
        });

        this.store.setState({
            ...currentState,
            players: updatedPlayers
        });
    }

}




const spawnedPowerUps = new Set(); 

function spawnPowerUp(x, y, webSocketService) {
    const key = `${x},${y}`;  
    if (spawnedPowerUps.has(key)) {
        console.warn(`Power-up already exists at (${x}, ${y}), skipping.`);
        return;
    }

    if (Math.random() > 0.9) { 
        const type = Object.keys(webSocketService.powerUps)[Math.floor(Math.random() * Object.keys(webSocketService.powerUps).length)];
        console.log(`Decided power-up: ${type} at (${x}, ${y})`);

        spawnedPowerUps.add(key);  

        if (webSocketService) {
            webSocketService.sendMessage('POWER_UP', { X: x, Y: y, Type: type });
        } else {
            console.error("WebSocket service is undefined.");
        }
    }
}
