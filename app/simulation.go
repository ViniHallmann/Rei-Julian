package main

import (
	"log"
	"math"
	"math/rand"
	"time"
)

func Simulate(tracker *Tracker) {
	rng := rand.New(rand.NewSource(time.Now().UnixNano()))

	for {
		// +- 5s entre os movimentos
		delay := time.Duration(4+rng.Float64()*2) * time.Second
		time.Sleep(delay)

		current := tracker.GetPosition()
		bearing := rng.Float64() * 2 * math.Pi

		newLat, newLon := movePoint(current.Latitude, current.Longitude, stepMeters, bearing)

		next := Position{
			Latitude:  newLat,
			Longitude: newLon,
			Timestamp: time.Now(),
			Step:      current.Step + 1,
		}

		tracker.SetPosition(next)

		log.Printf(
			"[Tracker %s] step=%d lat=%.8f lon=%.8f",
			tracker.ID,
			next.Step,
			next.Latitude,
			next.Longitude,
		)
	}
}
