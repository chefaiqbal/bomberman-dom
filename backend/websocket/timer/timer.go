package timer

import (
	"sync"
	"time"
	"bomber/websocket/game"
)

type GameTimer struct {
	timeLeft      int
	isActive      bool
	phase         string // "WAITING" or "PREGAME"
	ticker        *time.Ticker
	mu            sync.Mutex
	broadcast     func(string, interface{})
	onPhaseChange func(string) // Add callback for phase changes
}

func NewGameTimer(broadcast func(string, interface{}), onPhaseChange func(string)) *GameTimer {
	return &GameTimer{
		timeLeft:      2, // 5 seconds for each phase
		isActive:      false,
		phase:         "WAITING",
		broadcast:     broadcast,
		onPhaseChange: onPhaseChange,
	}
}

func (t *GameTimer) Start() {
	t.mu.Lock()
	if t.isActive {
		t.mu.Unlock()
		return
	}
	t.isActive = true
	t.timeLeft = 2
	t.phase = "WAITING"
	t.mu.Unlock()

	t.ticker = time.NewTicker(1 * time.Second)
	go func() {
		for range t.ticker.C {
			t.mu.Lock()
			t.timeLeft--
			timeLeft := t.timeLeft
			phase := t.phase
			t.mu.Unlock()

			// Broadcast timer update
			t.broadcast("TIMER_UPDATE", map[string]interface{}{
				"timeLeft": timeLeft,
				"isActive": true,
				"phase":    phase,
			})

			if timeLeft <= 0 {
				if phase == game.PhaseWaiting {
					// Transition to pregame phase
					t.mu.Lock()
					t.timeLeft = 2
					t.phase = game.PhasePregame
					t.mu.Unlock()

					 // Use callback instead of direct access
					if t.onPhaseChange != nil {
						t.onPhaseChange(game.PhasePregame)
					}

					t.broadcast("LOBBY_PHASE_CHANGE", map[string]interface{}{
						"phase": game.PhasePregame,
					})
				} else {
					// End timer and start game
					t.Stop()
					
					// Use callback instead of direct access
					if t.onPhaseChange != nil {
						t.onPhaseChange(game.PhaseGame)
					}

					t.broadcast("GAME_START", map[string]interface{}{
						"timeLeft": 0,
						"isActive": false,
					})
					break
				}
			}
		}
	}()

	if t.phase == game.PhaseGame {
		// Prevent new connections during game phase
		t.broadcast("GAME_STATUS", map[string]interface{}{
			"inProgress": true,
			"phase": game.PhaseGame,
		})
	}
}

func (t *GameTimer) Stop() {
	t.mu.Lock()
	defer t.mu.Unlock()

	if t.ticker != nil {
		t.ticker.Stop()
	}
	t.isActive = false
	t.timeLeft = 0

	// Broadcast final state
	t.broadcast("TIMER_UPDATE", map[string]interface{}{
		"timeLeft": t.timeLeft,
		"isActive": t.isActive,
		"phase":    t.phase,
	})

	// Reset game status when game ends
	t.broadcast("GAME_STATUS", map[string]interface{}{
		"inProgress": false,
		"phase": "WAITING",
	})
}

func (t *GameTimer) GetState() map[string]interface{} {
	t.mu.Lock()
	defer t.mu.Unlock()

	return map[string]interface{}{
		"timeLeft": t.timeLeft,
		"isActive": t.isActive,
		"phase":    t.phase,
	}
}
