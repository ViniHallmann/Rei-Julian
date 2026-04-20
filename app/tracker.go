package main

import (
	"sync"
	"time"
)

type Position struct {
	Latitude  float64   `json:"latitude"`
	Longitude float64   `json:"longitude"`
	Timestamp time.Time `json:"timestamp"`
	Step      int       `json:"step"`
}

type Tracker struct {
	ID       string
	mu       sync.RWMutex
	position Position
	clients  map[chan Position]struct{}
}

func NewTracker(id string, startLat, startLon float64) *Tracker {
	return &Tracker{
		ID: id,
		position: Position{
			Latitude:  startLat,
			Longitude: startLon,
			Timestamp: time.Now(),
			Step:      0,
		},
		clients: make(map[chan Position]struct{}),
	}
}

func (t *Tracker) GetPosition() Position {
	t.mu.RLock()
	defer t.mu.RUnlock()
	return t.position
}

func (t *Tracker) SetPosition(p Position) {
	t.mu.Lock()
	t.position = p

	clients := make([]chan Position, 0, len(t.clients))
	for ch := range t.clients {
		clients = append(clients, ch)
	}
	t.mu.Unlock()

	for _, ch := range clients {
		select {
		case ch <- p:
		default:
			// cliente lento, ignora este envio
		}
	}
}

func (t *Tracker) Subscribe() chan Position {
	ch := make(chan Position, 8)

	t.mu.Lock()
	t.clients[ch] = struct{}{}
	t.mu.Unlock()

	return ch
}

func (t *Tracker) Unsubscribe(ch chan Position) {
	t.mu.Lock()
	delete(t.clients, ch)
	t.mu.Unlock()
	close(ch)
}
