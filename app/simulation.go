package main

import (
	"fmt"
	"log"
	"time"
)

func Simulate(tracker *Tracker) {
	var route []RoutePoint
	for {
		// Pega a rota em direcao ao primeiro cliente da lista pra simular
		loaded, err := fetchRouteFromOSRM(StartLat, StartLon, FixedClients[0].Lat, FixedClients[0].Lon)
		if err != nil {
			log.Printf("erro ao buscar rota OSRM: %v", err)
			tracker.AddLog("error", fmt.Sprintf("Falha OSRM: %v", err))
			time.Sleep(5 * time.Second)
			continue
		}
		route = loaded
		tracker.SetRoute(route)
		tracker.AddLog("info", "Rota OSRM carregada.")
		break
	}

	// inicia na primeira coordenada.
	first := route[0]
	tracker.SetPosition(Position{
		Latitude:  first.Latitude,
		Longitude: first.Longitude,
		Timestamp: time.Now(),
		Step:      0,
	})
	tracker.AddLog("info", "Simulacao iniciada.")

	for {
		if tracker.IsPaused() {
			time.Sleep(500 * time.Millisecond)
			continue
		}

		point, ok := tracker.CurrentRoutePoint()
		if !ok {
			tracker.SetRoute(route)
			continue
		}

		current := tracker.GetPosition()
		tracker.SetPosition(Position{
			Latitude:  point.Latitude,
			Longitude: point.Longitude,
			Timestamp: time.Now(),
			Step:      current.Step + 1,
		})
		tracker.AddLog("info", fmt.Sprintf("Step %d - %.5f, %.5f", current.Step+1, point.Latitude, point.Longitude))

		tracker.AdvanceRoutePoint()
		time.Sleep(time.Duration(SimStepDelay) * time.Second)
	}
}
