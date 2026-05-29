package main

const (
	StartLat        = -31.770687426923516
	StartLon        = -52.34135057529372
	DefaultSpeedKmh = 20.0
	SimStepDelay    = 1 // segundos
	OSRMBaseURL     = "https://router.project-osrm.org"
	ProximityMeters = 500.0
	MaxLogs         = 50
)

type ClientConfig struct {
	ID   string  `json:"id"`
	Name string  `json:"name"`
	Lat  float64 `json:"lat"`
	Lon  float64 `json:"lon"`
}

var FixedClients = []ClientConfig{
	{ID: "cliente-1", Name: "Maria", Lat: -31.776941, Lon: -52.333231},
	{ID: "cliente-2", Name: "João", Lat: -31.774500, Lon: -52.340000},
	{ID: "cliente-3", Name: "Ana", Lat: -31.772000, Lon: -52.337000},
}
