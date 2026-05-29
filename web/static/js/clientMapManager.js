import { START_LAT, START_LON, MAP_TILE_URL, MAP_MAX_ZOOM, CLIENT_INITIAL_ZOOM, PROXIMITY_METERS } from './config.js';

export class ClientMapManager {
    constructor() {
        this.map = L.map('map', { zoomControl: true }).setView([START_LAT, START_LON], CLIENT_INITIAL_ZOOM);
        L.tileLayer(MAP_TILE_URL, { maxZoom: MAP_MAX_ZOOM }).addTo(this.map);
        
        this.vendorMarker = null;
        this.homeMarker = null;
        this.homeCircle = null;
        this.routeLine = null;
    }

    createCustomIcon(label, isHome = false) {
        const svgPin = `<svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" class="svg-pin"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>`;
        
        if (isHome) {
            return L.divIcon({
                className: 'custom-map-marker home-marker',
                html: `<div class="marker-icon">${svgPin}</div><div class="marker-label">${label}</div>`,
                iconSize: [24, 30],
                iconAnchor: [12, 30]
            });
        }
        return L.divIcon({
            className: 'custom-map-marker vendor-marker',
            html: `<div class="marker-icon pulse">${svgPin}</div><div class="marker-label">${label}</div>`,
            iconSize: [24, 30],
            iconAnchor: [12, 30]
        });
    }

    initClientMarker(clientConfig) {
        if (!clientConfig) return;

        this.homeMarker = L.marker([clientConfig.lat, clientConfig.lon], { 
            icon: this.createCustomIcon('Casa', true) 
        }).addTo(this.map);
        
        this.homeCircle = L.circle([clientConfig.lat, clientConfig.lon], { 
            radius: PROXIMITY_METERS, 
            color: '#00b0ff', 
            fillColor: '#00b0ff', 
            fillOpacity: 0.1, 
            weight: 1 
        }).addTo(this.map);
    }

    updateVendorMarker(lat, lon) {
        if (!this.vendorMarker) {
            this.vendorMarker = L.marker([lat, lon], { icon: this.createCustomIcon('Vendedor') }).addTo(this.map);
        } else {
            this.vendorMarker.setLatLng([lat, lon]);
        }
    }

    updateRouteLine(routeData) {
        if (!Array.isArray(routeData) || routeData.length <= 1) return;
        
        const latLngs = routeData.map(p => [p.latitude, p.longitude]);
        if (!this.routeLine) {
            this.routeLine = L.polyline(latLngs, { color: '#00ff9d', weight: 5, smoothFactor: 1 }).addTo(this.map);
        } else {
            this.routeLine.setLatLngs(latLngs);
        }
    }
}
