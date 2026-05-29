package main

import (
	"log"
	"net/http"
	"strings"
)

func main() {
	tracker := NewTracker("vendedor", StartLat, StartLon)
	go Simulate(tracker)

	// Endpoints
	http.HandleFunc("/position", positionHandler(tracker))
	http.HandleFunc("/stream", sseHandler(tracker))
	http.HandleFunc("/control", controlHandler(tracker))

	http.HandleFunc("/client/", func(w http.ResponseWriter, r *http.Request) {
		id := strings.TrimPrefix(r.URL.Path, "/client/")
		if id == "" {
			http.NotFound(w, r)
			return
		}
		http.ServeFile(w, r, "./web/static/client.html")
	})

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
