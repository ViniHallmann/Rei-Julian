package main

import "math"

const (
	// DefaultSpeedKmh define a velocidade media para o ETA.
	DefaultSpeedKmh = 20.0
)

// DistanceMeters calcula a distancia em linha reta usando Haversine.
func DistanceMeters(lat1, lon1, lat2, lon2 float64) float64 {
	r1 := degreesToRadians(lat1)
	r2 := degreesToRadians(lat2)
	dLat := degreesToRadians(lat2 - lat1)
	dLon := degreesToRadians(lon2 - lon1)

	a := math.Sin(dLat/2)*math.Sin(dLat/2) +
		math.Cos(r1)*math.Cos(r2)*math.Sin(dLon/2)*math.Sin(dLon/2)

	c := 2 * math.Atan2(math.Sqrt(a), math.Sqrt(1-a))
	return earthRadiusMeters * c
}

// ETASeconds calcula o ETA em segundos com base na distancia (m) e velocidade (km/h).
func ETASeconds(distanceMeters, speedKmh float64) int {
	if speedKmh <= 0 {
		return 0
	}

	speedMs := speedKmh / 3.6
	seconds := distanceMeters / speedMs
	return int(math.Round(seconds))
}
