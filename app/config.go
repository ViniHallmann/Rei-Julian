package main

const (
	StartLat        = -31.7654 // Pelotas Centro aproximado (Praça Coronel Pedro Osório)
	StartLon        = -52.3376
	DefaultSpeedKmh = 10.0
	SimStepDelay    = 1 // segundos
	OSRMBaseURL     = "https://router.project-osrm.org"
	ProximityMeters = 300.0
	MaxLogs         = 50
)

type ClientConfig struct {
	ID   string  `json:"id"`
	Name string  `json:"name"`
	Lat  float64 `json:"lat"`
	Lon  float64 `json:"lon"`
	rota string  `json:"rota"`
}

type RouteConfig struct {
	ID      string         `json:"id"`
	Name    string         `json:"name"`
	Clients []ClientConfig `json:"clients"`
}

var Routes = []RouteConfig{
	{
		ID:   "rota-pelotas-centro",
		Name: "Rota 1: Pelotas / Centro",
		Clients: []ClientConfig{
			{ID: "cliente-1", Name: "Maria (Mercado Público)", Lat: -31.7674, Lon: -52.3361, rota: "rota-pelotas-centro"},
			{ID: "cliente-2", Name: "João (Calçadão)", Lat: -31.7628, Lon: -52.3411, rota: "rota-pelotas-centro"},
			{ID: "cliente-3", Name: "Ana (Terminal)", Lat: -31.7601, Lon: -52.3385, rota: "rota-pelotas-centro"},
			{ID: "cliente-4", Name: "Base (Retorno)", Lat: -31.7654, Lon: -52.3376, rota: "rota-pelotas-centro"},
		},
	},
	{
		ID:   "rota-pelotas-zona-norte",
		Name: "Rota 2: Pelotas / Zona Norte",
		Clients: []ClientConfig{
			{ID: "cliente-5", Name: "Carlos (Av. Dom Joaquim)", Lat: -31.7512, Lon: -52.3298, rota: "rota-pelotas-zona-norte"},
			{ID: "cliente-6", Name: "Fernanda (Fernando Osório)", Lat: -31.7456, Lon: -52.3255, rota: "rota-pelotas-zona-norte"},
			{ID: "cliente-7", Name: "Base (Retorno)", Lat: -31.7654, Lon: -52.3376, rota: "rota-pelotas-zona-norte"},
		},
	},
	{
		ID:   "rota-pelotas-zona-sul",
		Name: "Rota 3: Pelotas / Zona Sul",
		Clients: []ClientConfig{
			{ID: "cliente-8", Name: "Pedro (Una)", Lat: -31.7710, Lon: -52.3100, rota: "rota-pelotas-zona-sul"},
			{ID: "cliente-9", Name: "Lucas (Shopping)", Lat: -31.7758, Lon: -52.3129, rota: "rota-pelotas-zona-sul"},
			{ID: "cliente-10", Name: "Base (Retorno)", Lat: -31.7654, Lon: -52.3376, rota: "rota-pelotas-zona-sul"},
		},
	},
}

// Fallback/Default for legacy code
var ActiveRoute = Routes[0]

var FixedClients = Routes[0].Clients
