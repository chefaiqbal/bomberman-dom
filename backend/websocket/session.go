package bomber

import (
	"fmt"
	"math/rand"
	"sync"
	"time"
)

var (
	sessions = make(map[string]*Session)
	sessionMu sync.RWMutex
	
)

func CreateSession(playerID string) *Session {
	sessionMu.Lock()
	defer sessionMu.Unlock()

	// Update to use GameStarted
	if GameStarted {
		return nil
	}

	// Check if player already has a session
	for _, session := range sessions {
		if session.PlayerID == playerID {
			return session
		}
	}

	// Create new session
	session := &Session{
		ID:        generateSessionID(),
		PlayerID:  playerID,
		CreatedAt: time.Now(),
	}
	sessions[session.ID] = session
	return session
}

func ValidateSession(sessionID string) *Session {
	sessionMu.RLock()
	defer sessionMu.RUnlock()
	
	// Update to use GameStarted
	if GameStarted {
		// If game is in progress, only allow existing sessions
		if session, exists := sessions[sessionID]; exists {
			return session
		}
		return nil
	}
	
	// Normal session validation for non-game state
	if session, exists := sessions[sessionID]; exists {
		return session
	}
	return nil
}

func RemoveSession(sessionID string) {
	sessionMu.Lock()
	defer sessionMu.Unlock()
	delete(sessions, sessionID)
}

func generateSessionID() string {
	return fmt.Sprintf("%d", time.Now().UnixNano() + rand.Int63())
}

// Add this function to clean up old sessions
func CleanupOldSessions() {
	sessionMu.Lock()
	defer sessionMu.Unlock()
	
	// Clear all sessions
	sessions = make(map[string]*Session)
}

// Add this function to remove a specific session
func RemovePlayerSession(playerID string) {
	sessionMu.Lock()
	defer sessionMu.Unlock()
	
	// Find and remove the session for this player
	for id, session := range sessions {
		if session.PlayerID == playerID {
			delete(sessions, id)
			break
		}
	}
}