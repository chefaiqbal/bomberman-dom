package timer

import (
	"sync"
	"time"
)

type GameTimer struct {
	timeLeft  int
	isActive  bool
	phase     string // "WAITING" or "PREGAME"
	ticker    *time.Ticker
	mu        sync.Mutex
	broadcast func(string, interface{})
}

func NewGameTimer(broadcast func(string, interface{})) *GameTimer {
	return &GameTimer{
		timeLeft:  5, // 5 seconds for each phase
		isActive:  false,
		phase:     "WAITING",
		broadcast: broadcast,
	}
}

func (t *GameTimer) Start() {
	t.mu.Lock()
	if t.isActive {
		t.mu.Unlock()
		return
	}
	t.isActive = true
	t.timeLeft = 6
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
				if phase == "WAITING" {
					// Transition to pregame phase
					t.mu.Lock()
					t.timeLeft = 10
					t.phase = "PREGAME"
					t.mu.Unlock()

					t.broadcast("LOBBY_PHASE_CHANGE", map[string]interface{}{
						"phase": "PREGAME",
					})
				} else {
					// End timer and start game
					t.Stop()
					t.broadcast("GAME_START", map[string]interface{}{
						"timeLeft": 0,
						"isActive": false,
					})
					break
				}
			}
		}
	}()
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
