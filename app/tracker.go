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

type RoutePoint struct {
	Latitude  float64 `json:"latitude"`
	Longitude float64 `json:"longitude"`
}

type LogEntry struct {
	Timestamp time.Time `json:"timestamp"`
	Level     string    `json:"level"`
	Message   string    `json:"message"`
}

type Tracker struct {
	ID       string
	mu       sync.RWMutex
	position Position
	route    []RoutePoint
	routeIdx int
	paused   bool
	logs     []LogEntry
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
		route:    nil,
		routeIdx: 0,
		paused:   false,
		logs:     make([]LogEntry, 0, 64),
		clients:  make(map[chan Position]struct{}),
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

func (t *Tracker) SetRoute(points []RoutePoint) {
	clean := make([]RoutePoint, 0, len(points))
	for _, p := range points {
		clean = append(clean, p)
	}

	t.mu.Lock()
	t.route = clean
	t.routeIdx = 0
	t.mu.Unlock()
}

func (t *Tracker) GetRoute() []RoutePoint {
	t.mu.RLock()
	defer t.mu.RUnlock()
	if len(t.route) == 0 {
		return nil
	}

	copyRoute := make([]RoutePoint, len(t.route))
	copy(copyRoute, t.route)
	return copyRoute
}

func (t *Tracker) CurrentRoutePoint() (RoutePoint, bool) {
	t.mu.RLock()
	defer t.mu.RUnlock()
	if len(t.route) == 0 {
		return RoutePoint{}, false
	}
	if t.routeIdx >= len(t.route) {
		return RoutePoint{}, false
	}
	return t.route[t.routeIdx], true
}

func (t *Tracker) AdvanceRoutePoint() {
	t.mu.Lock()
	defer t.mu.Unlock()
	if len(t.route) == 0 {
		return
	}

	t.routeIdx = (t.routeIdx + 1) % len(t.route)
}

func (t *Tracker) ResetRoute() {
	t.mu.Lock()
	defer t.mu.Unlock()
	if len(t.route) == 0 {
		return
	}

	t.routeIdx = 0

	first := t.route[0]
	t.logs = t.logs[:0] // Limpa os historicos de log

	// Atualiza com a posicao zero imediatamente e notifica
	t.position = Position{
		Latitude:  first.Latitude,
		Longitude: first.Longitude,
		Timestamp: time.Now(),
		Step:      0,
	}

	// Broadcaster inline igual ao SetPosition
	clients := make([]chan Position, 0, len(t.clients))
	for ch := range t.clients {
		clients = append(clients, ch)
	}

	// Nao mantemos o lock durante os envios no canal
	go func(pos Position) {
		for _, ch := range clients {
			select {
			case ch <- pos:
			default:
			}
		}
	}(t.position)
}

func (t *Tracker) SetPaused(paused bool) {
	t.mu.Lock()
	t.paused = paused
	t.mu.Unlock()
}

func (t *Tracker) IsPaused() bool {
	t.mu.RLock()
	defer t.mu.RUnlock()
	return t.paused
}

func (t *Tracker) AddLog(level, message string) {
	t.mu.Lock()
	defer t.mu.Unlock()

	if len(t.logs) >= MaxLogs {
		copy(t.logs, t.logs[1:])
		t.logs = t.logs[:len(t.logs)-1]
	}
	if len(message) > 0 {
		if level == "" {
			level = "info"
		}
		t.logs = append(t.logs, LogEntry{
			Timestamp: time.Now(),
			Level:     level,
			Message:   message,
		})
	}
}

func (t *Tracker) GetLogs() []LogEntry {
	t.mu.RLock()
	defer t.mu.RUnlock()
	if len(t.logs) == 0 {
		return nil
	}

	copyLogs := make([]LogEntry, len(t.logs))
	copy(copyLogs, t.logs)
	return copyLogs
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
