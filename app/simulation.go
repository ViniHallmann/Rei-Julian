package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"time"
)

const (
	osrmBaseURL = "https://router.project-osrm.org"

	// Coordenadas de teste para rota unica.
	osrmStartLat = -31.770687426923516
	osrmStartLon = -52.34135057529372
	osrmEndLat   = -31.776941
	osrmEndLon   = -52.333231

	simulationStepDelay = 1 * time.Second
)

type osrmResponse struct {
	Routes []struct {
		Geometry struct {
			Coordinates [][]float64 `json:"coordinates"`
		} `json:"geometry"`
	} `json:"routes"`
}

func fetchRouteFromOSRM(startLat, startLon, endLat, endLon float64) ([]RoutePoint, error) {
	url := fmt.Sprintf(
		"%s/route/v1/driving/%.6f,%.6f;%.6f,%.6f?overview=full&geometries=geojson",
		osrmBaseURL,
		startLon,
		startLat,
		endLon,
		endLat,
	)

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Get(url)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("osrm status %d", resp.StatusCode)
	}

	var payload osrmResponse
	if err := json.NewDecoder(resp.Body).Decode(&payload); err != nil {
		return nil, err
	}
	if len(payload.Routes) == 0 || len(payload.Routes[0].Geometry.Coordinates) == 0 {
		return nil, fmt.Errorf("rota osrm vazia")
	}

	coords := payload.Routes[0].Geometry.Coordinates
	route := make([]RoutePoint, 0, len(coords))
	for _, pair := range coords {
		if len(pair) < 2 {
			continue
		}
		route = append(route, RoutePoint{
			Latitude:  pair[1],
			Longitude: pair[0],
		})
	}

	if len(route) == 0 {
		return nil, fmt.Errorf("rota osrm invalida")
	}

	return route, nil
}

func Simulate(tracker *Tracker) {
	var route []RoutePoint
	for {
		loaded, err := fetchRouteFromOSRM(osrmStartLat, osrmStartLon, osrmEndLat, osrmEndLon)
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
		time.Sleep(simulationStepDelay)
	}
}
