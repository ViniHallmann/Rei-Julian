package main

import (
	"encoding/json"
	"fmt"
	"net/http"
)

type EventData struct {
	ID        string  `json:"id"`
	Latitude  float64 `json:"latitude"`
	Longitude float64 `json:"longitude"`
}

func positionHandler(tracker *Tracker) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json; charset=utf-8")
		w.Header().Set("Cache-Control", "no-store")

		pos := tracker.GetPosition()
		data := EventData{
			ID:        tracker.ID,
			Latitude:  pos.Latitude,
			Longitude: pos.Longitude,
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

		// envia a posição atual imediatamente
		initial := tracker.GetPosition()
		data := EventData{
			ID:        tracker.ID,
			Latitude:  initial.Latitude,
			Longitude: initial.Longitude,
		}
		initialJSON, _ := json.Marshal(data)
		fmt.Fprintf(w, "data: %s\n\n", initialJSON)
		flusher.Flush()

		ctx := r.Context()

		for {
			select {
			case <-ctx.Done():
				return
			case pos := <-ch:
				data := EventData{
					ID:        tracker.ID,
					Latitude:  pos.Latitude,
					Longitude: pos.Longitude,
				}
				payload, err := json.Marshal(data)
				if err != nil {
					continue
				}
				fmt.Fprintf(w, "data: %s\n\n", payload)
				flusher.Flush()
			}
		}
	}
}
