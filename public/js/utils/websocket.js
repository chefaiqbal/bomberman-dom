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
        this.ws = new WebSocket(`ws://10.1.200.40:8081/ws`);
        

        const session = localStorage.getItem('gameSession');
        if (session) {
            const sessionData = JSON.parse(session);

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
            const session = localStorage.getItem('gameSession');
            if (session) {
                const sessionData = JSON.parse(session);

                this.authenticate(sessionData.playerID);
            }
        };

        this.ws.onerror = (error) => {
            console.error("WebSocket error:", error);
            this.clearSession();
        };

        this.ws.onclose = (event) => {
            
            const state = this.store.getState();

            if (state.gameStarted && state.playerName) {
                if (this.ws.readyState === WebSocket.OPEN) {
                    this.sendMessage('PLAYER_LOST', { playerID: state.playerName });
                }
                

                localStorage.setItem('gameDisconnected', 'true');
                

                this.reconnectAttempts = this.maxReconnectAttempts;
                this.clearSession();
                return;
            }
            
            if (this.reconnectAttempts < this.maxReconnectAttempts) {
                this.reconnectAttempts++;
                setTimeout(() => this.setupWebSocket(), 1000);
            } else {

                this.clearSession();
            }
        };
        this.ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            if (data.status === "wait" && data.redirect) {
                this.router.navigate("/wait");
                return;
            }
            switch (data.type) {
                case 'CONNECTION_SUCCESS':

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
                    } else {
                        console.error(`Power-up element at (${x}, ${y}) not found.`);
                    }
                    break;
                case 'POWER_UP_COLLECTED':
                    this.handlePowerUpCollected(data.data);
                    break;
                case 'PLAYER_LOST':
                    this.handleLostPlayer(data.data);
                    break;    
                case 'GAME_STATUS':
                    if (data.data.inProgress) {
                        this.store.setState({
                            ...this.store.getState(),
                            gameInProgress: true,
                            gamePhase: data.data.phase, 
                            gameMessage: data.data.message // add message to state
                        });
                        

                        localStorage.removeItem('gameSession');
                        

                        this.router.navigate('/game-in-progress');
                        
                        
                        this.maxReconnectAttempts = 0;// stooop reconnection attempts
                    }
                    break;
                case 'GAME_RESET':
                    this.clearSession();
                    window.location.reload(); 
                    break;
                case 'GAME_WINNER':
                    this.handleGameWinner(data.data);
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
        } else {
            console.error("WebSocket is not open. Current state:", this.ws.readyState);
        }
    }

    handleTakeDmg(ID) {
        const state = this.store.getState();
        const players = state.players.map(player => {
            if (player.ID === ID.ID) {
                const updatedLives = Math.max(player.lives - 1, 0); // Prevent negative lives
    
                if (updatedLives === 0) {
                    
                    this.sendMessage('PLAYER_LOST', { playerID: ID.ID });
                        if (player.ID === this.store.getState().playerName) {
                        this.router.navigate('/lose');

                        setTimeout(() => {
                            this.clearSession();
                            this.router.navigate('/');
                        }, 5000);
                    }
                }
    
                return { ...player, lives: updatedLives };
            }
            return player;
        });
    

        this.store.setState({
            ...state,
            players
        });
    
    
        const alivePlayers = players.filter(player => player.lives > 0);      // check for a winner
        if (alivePlayers.length === 1) {
            const winner = alivePlayers[0];
            
            this.sendMessage('PLAYER_WON', { playerID: winner.ID });
    
            if (winner.ID === this.store.getState().playerName) {
                this.router.navigate('/win');
                setTimeout(() => { // session clearing 
                    this.clearSession();
                    this.router.navigate('/');
                }, 5000);
            }
        }
    }
    


    handelMove(moveData) {
        const { direction, playerName, x, y,  frameIndex} = moveData;

        if (typeof x !== 'number' || typeof y !== 'number') {
            console.error("Invalid coordinates received:", x, y);
            return;
        }
            
        const state = this.store.getState();
        const players = state.players.map(player => 
            player.ID === playerName ? { ...player, x, y, frameIndex,direction } : player
        );
    
        this.store.setState({
            ...state,
            players
        });

    }
        
    handelMap(map) {
        spawnedPowerUps.clear(); 
        this.store.setState({
            ...this.store.getState(),
            map: map
        });
    }    
    
    handleChatMessage(msg) {
        const state = this.store.getState();
        const messages = [...(state.messages || []), msg];
        
        this.store.setState({
            ...state,
            messages
        });
    }
    
    handlePlayerUpdate(players) {
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
    
        if (!currentState.gameStarted && updatedPlayers && updatedPlayers.length > 0) { // navigate to lobby
            this.router.navigate('/lobby');
        }
    }

    
    handleGameStart(data) {
        const currentState = this.store.getState();
        
        this.store.setState({
            ...currentState,
            gameStartTimer: 0,
            timerActive: false,
            gameStarted: true
        });

        
        if (currentState.map) {// onley navigate if we have a map
            this.router.navigate('/game');
        }
    }
    
    handleTimerUpdate(data) {
        const state = this.store.getState();
        

        this.store.setState({
            ...state,
            gameStartTimer: data.timeLeft,
            timerActive: data.isActive,
            lobbyPhase: data.phase
        });

        if (data.phase !== state.lobbyPhase) {
            this.router.navigate('/lobby');
        }
    }
    
    handleGameState(data) {
        

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


        if (this.store.getState().reconnecting && data.players && data.players.length > 0) {
            this.router.navigate('/lobby');
        }
    }
    
    handleAuthResponse(data) {
        

        const wasDisconnected = localStorage.getItem('gameDisconnected');
        if (wasDisconnected === 'true') {
            localStorage.removeItem('gameDisconnected');
            this.router.navigate('/lose');
            setTimeout(() => {
                this.clearSession();
                this.router.navigate('/');
            }, 5000);
            return;
        }
        
        if (data.error) {
            if (data.gameStatus === "in_progress") {
                this.store.setState({
                    ...this.store.getState(),
                    gameInProgress: true,
                    gamePhase: data.phase || "GAME",
                    gameMessage: data.message || "Game in progress"
                });
                this.router.navigate('/game-in-progress');
                return;
            }
            this.clearSession();
            return;
        }

        if (data.sessionId && data.playerId) {

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
            
            this.sendMessage('PLAYER_JOIN', {
                id: data.playerId,
                x: 0,
                y: 0,
                lives: 3
            });
        } else {

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
        const { BombX, BombY, Radius, Destroyed } = explosionData;
        

        const bombs = document.querySelectorAll('.bomb');
        bombs.forEach(bomb => {
            const bombX = parseInt(bomb.style.left) - 5;
            const bombY = parseInt(bomb.style.top) - 5;
            if (bombX === BombX && bombY === BombY) {
                bomb.remove();
            }
        });

        const mapElement = document.querySelector(".map");
        if (!mapElement) return;

        const map = this.store.getState().map;
        const explosionTiles = new Set();
        const directions = [[0,0], [1,0], [-1,0], [0,1], [0,-1]];


        Destroyed.forEach(({X, Y}) => {
            const tileElement = mapElement.children[Y * 15 + X];
            if (tileElement) {
                tileElement.style.background = 'green';
                spawnPowerUp(X, Y, this);
            }
        });


        directions.forEach(([dx, dy]) => {
            let blockedPath = false;
            for (let i = 0; i <= Radius && !blockedPath; i++) {
                const tileX = Math.floor((BombX + (dx * i * 50)) / 50);
                const tileY = Math.floor((BombY + (dy * i * 50)) / 50);


                if (map?.[tileY]?.[tileX] === 1) {
                    blockedPath = true;
                    break;
                }


                if (map?.[tileY]?.[tileX] === 2) {
                    const wasDestroyed = Destroyed.some(d => d.X === tileX && d.Y === tileY);
                    if (wasDestroyed) {
                        explosionTiles.add(`${tileX},${tileY}`);
                        this.createExplosionAnimation(BombX + (dx * i * 50), BombY + (dy * i * 50), mapElement);
                    }
                    blockedPath = true;
                    break;
                }


                explosionTiles.add(`${tileX},${tileY}`);
                const explosion = document.createElement('div');
                explosion.className = 'explosion';
                Object.assign(explosion.style, {
                    position: 'absolute',
                    width: '94px',
                    height: '94px',
                    left: (BombX + (dx * i * 50) - 47 + 25) + 'px',
                    top: (BombY + (dy * i * 50) - 47 + 25) + 'px',
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
            const playerTileX = Math.floor(player.x / 50);
            const playerTileY = Math.floor(player.y / 50);
            const playerTileKey = `${playerTileX},${playerTileY}`;

            if (explosionTiles.has(playerTileKey)) {
                this.PlayerHit(player.ID);
            }
        });

    } catch (error) {
        console.error('Error in handleBombExplode:', error);
    }
}


createExplosionAnimation(x, y, mapElement) {
    const explosion = document.createElement('div');
    explosion.className = 'explosion';
    Object.assign(explosion.style, {
        position: 'absolute',
        width: '94px',
        height: '94px',
        left: (x - 47 + 25) + 'px',
        top: (y - 47 + 25) + 'px',
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
    }, 1000 / 5);

    mapElement.appendChild(explosion);
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
        

        this.router.navigate('/lobby');
    }


    powerUps = {
        bomb: '/static/img/morebomb.png',
        flame: '/static/img/flamePower.png',
        speed: '/static/img/speed.png'
    };

    
    handlePowerUp(powerUpData) {
        const { x, y, type } = powerUpData;
    
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
                const newStats = { ...player };
                
                switch(powerUpData.type) {
                    case 'bomb':
                        newStats.MaxBombs = (newStats.MaxBombs || 1) + 1;
                        break;
                    case 'flame':
                        newStats.bombRadius = (newStats.bombRadius || 1) + 1;
                        break;
                    case 'speed':
                        newStats.speed = (newStats.speed || 5) + 2;
                        break;
                }
                
                return newStats;
            }
            return player;
        });
    
        this.store.setState({
            ...currentState,
            players: updatedPlayers
        });
    
    }
    
    
    
    
    handleLostPlayer(lostPlayerData) {
        const state = this.store.getState();
        const players = state.players.filter(player => player.ID !== lostPlayerData.playerID);
    
        this.store.setState({
            ...state,
            players
        });
    

        const lostPlayerElement = document.querySelector(`.player[data-name="${lostPlayerData.playerID}"]`);
        if (lostPlayerElement) {
            lostPlayerElement.remove();
        }
    
        

        if (players.length === 1) {
            const winner = players[0];
            

            this.sendMessage('PLAYER_WON', { playerID: winner.ID });
            

            if (winner.ID === state.playerName) {
                this.router.navigate('/win');

                setTimeout(() => {
                    this.clearSession();
                    this.router.navigate('/');
                }, 5000);
            }
        }
    }

    handleGameWinner(data) {

        const state = this.store.getState();
        
        if (data.playerID === state.playerName) {
            this.router.navigate('/win');
        } else {
            this.router.navigate('/lose');
        }


        setTimeout(() => {
            this.clearSession();
            this.router.navigate('/');
        }, 5000);
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


        spawnedPowerUps.add(key);  

        if (webSocketService) {
            webSocketService.sendMessage('POWER_UP', { X: x, Y: y, Type: type });
        } else {
            console.error("WebSocket service is undefined.");
        }
    }
}


