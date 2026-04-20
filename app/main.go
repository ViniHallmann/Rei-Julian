package main

import (
	"log"
	"net/http"
)

const (
	// Mais ou menos na praça Coronel Pedro Osório
	startLat = -31.770687426923516
	startLon = -52.34135057529372
)

func main() {
	devices := []struct {
		id  string
		lat float64
		lon float64
	}{
		{"julian", startLat, startLon},
		{"maurice", startLat + 0.001, startLon + 0.001},
	}

	trackers := make(map[string]*Tracker)

	// Instanciando e iniciando a simulação para cada rastreador
	for _, dev := range devices {
		t := NewTracker(dev.id, dev.lat, dev.lon)
		trackers[dev.id] = t
		go Simulate(t)

		// Endpoints individuais por tracker
		http.HandleFunc("/position/"+dev.id, positionHandler(t))
		http.HandleFunc("/stream/"+dev.id, sseHandler(t))
	}

	// SERVIR FRONTEND
	fs := http.FileServer(http.Dir("./web/static"))
	http.Handle("/", fs)

	log.Println("Servidor iniciado em http://localhost:8080")
	for id := range trackers {
		log.Printf("Dispositivo registrado: %s", id)
		log.Printf("  -> GET /position/%s (JSON)", id)
		log.Printf("  -> GET /stream/%s (SSE)", id)
	}

	log.Fatal(http.ListenAndServe(":8080", nil))
}
