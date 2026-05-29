package main

import (
        "fmt"
        "log"
        "time"
)

func fetchRouteForActiveConfig(tracker *Tracker) []RoutePoint {
        clients := ActiveRoute.Clients
        if len(clients) == 0 {
                return []RoutePoint{{Latitude: StartLat, Longitude: StartLon}} 
        }

        // Simula uma rota completando o tour nos clientes em ordem e voltando pra casa.
        // Ponto de partida
        allPoints := []RoutePoint{}
        lastLat, lastLon := StartLat, StartLon

        for _, client := range clients {
                loaded, err := fetchRouteFromOSRM(lastLat, lastLon, client.Lat, client.Lon)
                if err != nil {
                        log.Printf("erro ao buscar rota OSRM para %s: %v", client.Name, err)
                        tracker.AddLog("error", fmt.Sprintf("Falha OSRM para %s: %v", client.Name, err))
                        // Tenta prosseguir mesmo com erro adicionando linha reta
                        loaded = []RoutePoint{{Latitude: lastLat, Longitude: lastLon}, {Latitude: client.Lat, Longitude: client.Lon}}
                }
                allPoints = append(allPoints, loaded...)
                lastLat, lastLon = client.Lat, client.Lon
                // delay pra nao tomar block na API demo do OSRM
                time.Sleep(500 * time.Millisecond)
        }
        
        tracker.AddLog("info", "Rota OSRM carregada totalmente.")
        return allPoints
}

func Simulate(tracker *Tracker) {
        route := fetchRouteForActiveConfig(tracker)
        tracker.SetRoute(route)

        first := route[0]
        tracker.SetPosition(Position{
                Latitude:  first.Latitude,
                Longitude: first.Longitude,
                Timestamp: time.Now(),
                Step:      0,
        })
        tracker.AddLog("info", "Simulacao pronta. Selecione Rota ou Iniciar.")
        tracker.SetPaused(true)

        for {
                if tracker.ConsumeRouteReload() {
                        tracker.SetPaused(true)
                        route = fetchRouteForActiveConfig(tracker)
                        tracker.SetRoute(route)
                        tracker.ResetRoute()
                        tracker.AddLog("info", "Rota atualizada e pausada!")
                }

                if tracker.IsPaused() {
                        time.Sleep(500 * time.Millisecond)
                        continue
                }

                point, ok := tracker.CurrentRoutePoint()
                if !ok {
                        tracker.SetPaused(true) // Chegou no fim da rota
                        tracker.AddLog("info", "Chegou no final da rota!")
                        continue
                }

                current := tracker.GetPosition()
                tracker.SetPosition(Position{
                        Latitude:  point.Latitude,
                        Longitude: point.Longitude,
                        Timestamp: time.Now(),
                        Step:      current.Step + 1,
                })
                
                // only log every 10 steps so it doesn't flood 
                if (current.Step % 10) == 0 {
                    tracker.AddLog("info", fmt.Sprintf("Movendo... Passo %d", current.Step+1))
                }

                tracker.AdvanceRoutePoint()
                time.Sleep(time.Duration(SimStepDelay) * time.Second)
        }
}
