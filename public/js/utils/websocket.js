import { createElement, render, createStore } from "../core/index.js";


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

    handelMove(moveData) {
        const { direction, playerName, x, y,  frameIndex} = moveData;
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
        
        this.store.setState({
            ...currentState,
            players: players,
            isAuthenticated: true,
            reconnecting: false
        });

        // Navigate to lobby if not already there
        if (!currentState.gameStarted && players && players.length > 0) {
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
        const { BombX, BombY, Radius, Destroyed } = explosionData;
        
        // Remove the bomb element
        const bombs = document.querySelectorAll('.bomb');
        bombs.forEach(bomb => {
            const bombX = parseInt(bomb.style.left) - 5;
            const bombY = parseInt(bomb.style.top) - 5;
            if (bombX === BombX && bombY === BombY) {
                bomb.remove();
            }
        });

        // Create explosion animation
        const mapElement = document.querySelector(".map");
        if (!mapElement) return;

        // Update destroyed tiles
        Destroyed.forEach(({X, Y}) => {
            const tileElement = mapElement.children[Y * 15 + X];
            if (tileElement) {
                tileElement.style.background = 'green';
                console.log(`Tile at (${X}, ${Y}) destroyed.`);
                spawnPowerUp(X, Y, this);
            }
        });

        // Create explosion effects
        const explosions = createExplosion(BombX, BombY, Radius);
        explosions.forEach(explosion => {
            mapElement.appendChild(explosion);
        });

        // Remove explosion effects after animation
        setTimeout(() => {
            document.querySelectorAll('.explosion').forEach(el => el.remove());
        }, 1000);
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
            class: `power-up ${type}`,
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
