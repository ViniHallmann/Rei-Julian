import { MAP_TILE_URL, MAP_MAX_ZOOM, VENDOR_INITIAL_ZOOM, START_LAT, START_LON } from './config.js';

export class MarkerManager {
    constructor() {
        this.map = L.map('map', { zoomControl: true }).setView([START_LAT, START_LON], VENDOR_INITIAL_ZOOM);
        L.tileLayer(MAP_TILE_URL, { maxZoom: MAP_MAX_ZOOM }).addTo(this.map);
        
        this.vendorMarker = null;
        this.clientMarkers = {};
        this.routeLine = null;

        // Custom event to update marker state when visited via UI
        document.addEventListener('client-visited', (e) => {
            const { id, visited } = e.detail;
            this.updateClientMarkerState(id, visited);
        });
    }

    createVendorIcon() {
        const svgPin = `<svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" class="svg-pin"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>`;
        return L.divIcon({
            className: 'custom-map-marker vendor-marker',
            html: `<div class="marker-icon pulse">${svgPin}</div><div class="marker-label">Vendedor</div>`,
            iconSize: [24, 30],
            iconAnchor: [12, 30]
        });
    }

    createClientIcon(label, isVisited = false) {
        const extraClass = isVisited ? ' visited-marker' : ' client-marker';
        const svgPin = `<svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" class="svg-pin"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>`;
        return L.divIcon({
            className: `custom-map-marker${extraClass}`,
            html: `<div class="marker-icon">${svgPin}</div><div class="marker-label">${label}</div>`,
            iconSize: [24, 30],
            iconAnchor: [12, 30]
        });
    }

    updateVendorMarker(lat, lon) {
        if (!this.vendorMarker) {
            this.vendorMarker = L.marker([lat, lon], { icon: this.createVendorIcon() }).addTo(this.map);
        } else {
            this.vendorMarker.setLatLng([lat, lon]);
        }
    }

    updateClientMarkers(clients, visitedSet = new Set()) {
        if (!Array.isArray(clients)) return;
        
        clients.forEach(c => {
            const isVisited = visitedSet.has(c.id);
            if (!this.clientMarkers[c.id]) {
                const marker = L.marker([c.latitude, c.longitude], { 
                    icon: this.createClientIcon(c.name, isVisited) 
                }).addTo(this.map);
                this.clientMarkers[c.id] = { marker, name: c.name, isVisited };
            } else {
                this.clientMarkers[c.id].marker.setLatLng([c.latitude, c.longitude]);
            }
        });
    }

    updateClientMarkerState(id, isVisited) {
        if (this.clientMarkers[id]) {
            this.clientMarkers[id].isVisited = isVisited;
            this.clientMarkers[id].marker.setIcon(this.createClientIcon(this.clientMarkers[id].name, isVisited));
        }
    }

    updateRouteLine(routeData) {
        if (!Array.isArray(routeData) || routeData.length <= 1) return;
        const latLngs = routeData.map(p => [p.latitude, p.longitude]);
        if (!this.routeLine) {
            this.routeLine = L.polyline(latLngs, { color: '#00ff9d', weight: 6, smoothFactor: 1 }).addTo(this.map);
        } else {
            this.routeLine.setLatLngs(latLngs);
        }
    }
}
