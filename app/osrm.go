package main

import (
	"encoding/json"
	"fmt"
	"net/http"
	"time"
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
		OSRMBaseURL,
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
