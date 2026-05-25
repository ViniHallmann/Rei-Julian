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
	tracker := NewTracker("vendedor", startLat, startLon)
	go Simulate(tracker)

	// Endpoints
	http.HandleFunc("/position", positionHandler(tracker))
	http.HandleFunc("/stream", sseHandler(tracker))
	http.HandleFunc("/control", controlHandler(tracker))
	http.HandleFunc("/set-home", setHomeHandler(tracker))

	// SERVIR FRONTEND
	fs := http.FileServer(http.Dir("./web/static"))
	http.Handle("/", fs)

	log.Println("Servidor iniciado em http://localhost:8080")
	log.Printf("  -> GET /position (JSON)")
	log.Printf("  -> GET /stream (SSE)")
	log.Printf("  -> POST /control (pause/resume)")
	log.Printf("  -> POST /set-home (client)")

	log.Fatal(http.ListenAndServe(":8080", nil))
}
