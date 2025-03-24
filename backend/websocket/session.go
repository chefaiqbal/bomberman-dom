package bomber

import (
	"fmt"
	"math/rand"
	"sync"
	"time"
)

var (
	sessions  = make(map[string]*Session)
	sessionMu sync.RWMutex
)

func CreateSession(playerID string) *Session {
	sessionMu.Lock()
	defer sessionMu.Unlock()

	if GameStarted {
		return nil
	}

	for _, session := range sessions {
		if session.PlayerID == playerID {
			return session
		}
	}

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

	if GameStarted {

		if session, exists := sessions[sessionID]; exists {
			return session
		}
		return nil
	}

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
	return fmt.Sprintf("%d", time.Now().UnixNano()+rand.Int63())
}

func CleanupOldSessions() {
	sessionMu.Lock()
	defer sessionMu.Unlock()

	sessions = make(map[string]*Session)
}

func RemovePlayerSession(playerID string) {
	sessionMu.Lock()
	defer sessionMu.Unlock()

	for id, session := range sessions {
		if session.PlayerID == playerID {
			delete(sessions, id)
			break
		}
	}
}
