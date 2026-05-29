package main

import (
        "encoding/json"
        "fmt"
        "net/http"
)

type ClientState struct {
        ID                   string  `json:"id"`
        Name                 string  `json:"name"`
        Latitude             float64 `json:"latitude"`
        Longitude            float64 `json:"longitude"`
        DistanceToHomeMeters float64 `json:"distance_to_home_meters"`
        ETASeconds           int     `json:"eta_seconds"`
}

type EventData struct {
        ID        string        `json:"id"`
        Latitude  float64       `json:"latitude"`
        Longitude float64       `json:"longitude"`
        Route     []RoutePoint  `json:"route"`
        Step      int           `json:"step"`
        Paused    bool          `json:"paused"`
        Clients   []ClientState `json:"clients"`
        Logs      []LogEntry    `json:"logs,omitempty"`
        Delay     bool          `json:"delay"`
}

type ControlRequest struct {
        Action string `json:"action"`
        RouteID string `json:"routeId,omitempty"`
}

func createSnapshot(tracker *Tracker) EventData {
        pos := tracker.GetPosition()
        route := tracker.GetRoute()
        paused := tracker.IsPaused()
        logs := tracker.GetLogs()
        delay := tracker.HasDelay()

        var clientsState []ClientState
        for _, clientConfig := range ActiveRoute.Clients {
                distance := DistanceMeters(pos.Latitude, pos.Longitude, clientConfig.Lat, clientConfig.Lon)
                etaSec := ETASeconds(distance, DefaultSpeedKmh)
                clientsState = append(clientsState, ClientState{
                        ID:                   clientConfig.ID,
                        Name:                 clientConfig.Name,
                        Latitude:             clientConfig.Lat,
                        Longitude:            clientConfig.Lon,
                        DistanceToHomeMeters: distance,
                        ETASeconds:           etaSec,
                })
        }

        return EventData{
                ID:        tracker.ID,
                Latitude:  pos.Latitude,
                Longitude: pos.Longitude,
                Route:     route,
                Step:      pos.Step,
                Paused:    paused,
                Clients:   clientsState,
                Logs:      logs,
                Delay:     delay,
        }
}

func positionHandler(tracker *Tracker) http.HandlerFunc {
        return func(w http.ResponseWriter, r *http.Request) {
                w.Header().Set("Content-Type", "application/json; charset=utf-8")
                w.Header().Set("Cache-Control", "no-store")

                data := createSnapshot(tracker)

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

                sendSnapshot := func() {
                        data := createSnapshot(tracker)
                        payload, err := json.Marshal(data)
                        if err != nil {
                                return
                        }
                        fmt.Fprintf(w, "data: %s\n\n", payload)
                        flusher.Flush()
                }

                sendSnapshot()

                ctx := r.Context()

                for {
                        select {
                        case <-ctx.Done():
                                return
                        case <-ch:
                                sendSnapshot()
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
                case "start":
                        tracker.SetPaused(false)
                        tracker.AddLog("info", "Rota iniciada.")
                case "pause":
                        tracker.SetPaused(true)
                        tracker.AddLog("info", "Simulacao pausada.")
                case "resume":
                        tracker.SetPaused(false)
                        tracker.AddLog("info", "Simulacao retomada.")
                case "reset":
                        tracker.ResetRoute()
                        tracker.SetDelay(false)
                        tracker.AddLog("info", "Rota reiniciada.")
                case "delay":
                        tracker.SetDelay(true)
                        tracker.AddLog("warn", "Atraso reportado!")
                case "clear_delay":
                        tracker.SetDelay(false)
                        tracker.AddLog("info", "Atraso resolvido.")
                case "change_route":
                        if payload.RouteID != "" {
                                for _, r := range Routes {
                                        if r.ID == payload.RouteID {
                                                ActiveRoute = r
                                                tracker.AddLog("info", "Rota alterada para: " + r.Name)
                                                // Sinaliza pro simulation carregar nova rota
                                                tracker.RequestRouteReload()
                                                break
                                        }
                                }
                        }
                default:
                        http.Error(w, "acao invalida", http.StatusBadRequest)
                        return
                }

                w.WriteHeader(http.StatusNoContent)
        }
}
