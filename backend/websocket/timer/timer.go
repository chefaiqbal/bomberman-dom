package timer

import (
	"log"
	"sync"
	"time"
)

type GameTimer struct {
	timeLeft   int
	isActive   bool
	ticker     *time.Ticker
	mu         sync.Mutex
	broadcast  func(string, interface{})
}

func NewGameTimer(broadcast func(string, interface{})) *GameTimer {
	return &GameTimer{
		timeLeft:  5, // 30 seconds countdown
		isActive:  false,
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
	t.timeLeft = 5
	t.mu.Unlock()

	t.ticker = time.NewTicker(1 * time.Second)
	go func() {
		for range t.ticker.C {
			t.mu.Lock()
			t.timeLeft--
			timeLeft := t.timeLeft
			isActive := t.isActive
			t.mu.Unlock()

			// Broadcast timer update
			t.broadcast("TIMER_UPDATE", map[string]interface{}{
				"timeLeft": timeLeft,
				"isActive": isActive,
			})

			if timeLeft <= 0 {
				t.Stop()
				log.Printf("Timer completed")
				// Send GAME_START when timer completes
				t.broadcast("GAME_START", map[string]interface{}{
					"timeLeft": 0,
					"isActive": false,
				})
				break
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
	})
}

func (t *GameTimer) GetState() map[string]interface{} {
	t.mu.Lock()
	defer t.mu.Unlock()

	return map[string]interface{}{
		"timeLeft": t.timeLeft,
		"isActive": t.isActive,
	}
} 