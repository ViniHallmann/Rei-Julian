package main

import (
	"encoding/json"
	"fmt"
	"net/http"
)

type EventData struct {
	ID        string       `json:"id"`
	Latitude  float64      `json:"latitude"`
	Longitude float64      `json:"longitude"`
	Route     []RoutePoint `json:"route"`
	Step      int          `json:"step"`
	ETASeconds int         `json:"eta_seconds"`
	Paused    bool         `json:"paused"`
	Home      *RoutePoint  `json:"home,omitempty"`
	DistanceToHomeMeters float64 `json:"distance_to_home_meters,omitempty"`
	Logs      []LogEntry   `json:"logs,omitempty"`
}

type ControlRequest struct {
	Action string `json:"action"`
}

type SetHomeRequest struct {
	Latitude  float64 `json:"latitude"`
	Longitude float64 `json:"longitude"`
}

func positionHandler(tracker *Tracker) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json; charset=utf-8")
		w.Header().Set("Cache-Control", "no-store")

		pos := tracker.GetPosition()
		route := tracker.GetRoute()
		etaSeconds := 0
		next, ok := tracker.CurrentRoutePoint()
		if ok {
			distance := DistanceMeters(pos.Latitude, pos.Longitude, next.Latitude, next.Longitude)
			etaSeconds = ETASeconds(distance, DefaultSpeedKmh)
		}
		paused := tracker.IsPaused()
		var home *RoutePoint
		var distanceHome float64
		if point, ok := tracker.GetHome(); ok {
			home = &RoutePoint{Latitude: point.Latitude, Longitude: point.Longitude}
			distanceHome = DistanceMeters(pos.Latitude, pos.Longitude, point.Latitude, point.Longitude)
		}
		logs := tracker.GetLogs()

		data := EventData{
			ID:         tracker.ID,
			Latitude:   pos.Latitude,
			Longitude:  pos.Longitude,
			Route:      route,
			Step:       pos.Step,
			ETASeconds: etaSeconds,
			Paused:     paused,
			Home:       home,
			DistanceToHomeMeters: distanceHome,
			Logs:       logs,
		}

		if err := json.NewEncoder(w).Encode(data); err != nil {
			http.Error(w, "erro ao serializar posição", http.StatusInternalServerError)
			return
		}
	}
}

func sseHandler(tracker *Tracker) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		flusher, ok := w.(http.Flusher)
		if !ok {
			http.Error(w, "streaming não suportado", http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "text/event-stream")
		w.Header().Set("Cache-Control", "no-cache")
		w.Header().Set("Connection", "keep-alive")
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("X-Accel-Buffering", "no")

		ch := tracker.Subscribe()
		defer tracker.Unsubscribe(ch)

		sendSnapshot := func(pos Position) {
			route := tracker.GetRoute()
			etaSeconds := 0
			next, ok := tracker.CurrentRoutePoint()
			if ok {
				distance := DistanceMeters(pos.Latitude, pos.Longitude, next.Latitude, next.Longitude)
				etaSeconds = ETASeconds(distance, DefaultSpeedKmh)
			}
			paused := tracker.IsPaused()
			var home *RoutePoint
			var distanceHome float64
			if point, ok := tracker.GetHome(); ok {
				home = &RoutePoint{Latitude: point.Latitude, Longitude: point.Longitude}
				distanceHome = DistanceMeters(pos.Latitude, pos.Longitude, point.Latitude, point.Longitude)
			}
			logs := tracker.GetLogs()

			data := EventData{
				ID:         tracker.ID,
				Latitude:   pos.Latitude,
				Longitude:  pos.Longitude,
				Route:      route,
				Step:       pos.Step,
				ETASeconds: etaSeconds,
				Paused:     paused,
				Home:       home,
				DistanceToHomeMeters: distanceHome,
				Logs:       logs,
			}
			payload, err := json.Marshal(data)
			if err != nil {
				return
			}
			fmt.Fprintf(w, "data: %s\n\n", payload)
			flusher.Flush()
		}

		// envia a posição atual imediatamente
		sendSnapshot(tracker.GetPosition())

		ctx := r.Context()

		for {
			select {
			case <-ctx.Done():
				return
			case pos := <-ch:
				sendSnapshot(pos)
			}
		}
	}
}

func controlHandler(tracker *Tracker) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			http.Error(w, "metodo não permitido", http.StatusMethodNotAllowed)
			return
		}

		var payload ControlRequest
		if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
			http.Error(w, "payload invalido", http.StatusBadRequest)
			return
		}

		switch payload.Action {
		case "pause":
			tracker.SetPaused(true)
			tracker.AddLog("info", "Simulacao pausada.")
		case "resume":
			tracker.SetPaused(false)
			tracker.AddLog("info", "Simulacao retomada.")
		case "reset":
			tracker.ResetRoute()
			tracker.AddLog("info", "Rota reiniciada.")
		default:
			http.Error(w, "acao invalida", http.StatusBadRequest)
			return
		}

		w.WriteHeader(http.StatusNoContent)
	}
}

func setHomeHandler(tracker *Tracker) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			http.Error(w, "metodo não permitido", http.StatusMethodNotAllowed)
			return
		}

		var payload SetHomeRequest
		if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
			http.Error(w, "payload invalido", http.StatusBadRequest)
			return
		}

		tracker.SetHome(RoutePoint{Latitude: payload.Latitude, Longitude: payload.Longitude})
		tracker.AddLog("info", "Casa do cliente atualizada.")
		w.WriteHeader(http.StatusNoContent)
	}
}
