export class MarkerManager {
    constructor(mapInstance) {
        this.map = mapInstance;
        this.markers = {};
    }

    updateMarker(id, lat, lng) {
        this.markers[id] ? this.markers[id].setLatLng([lat, lng]) : this.markers[id] = L.marker([lat, lng]).addTo(this.map);
        // if (this.markers[id]) {
        // this.markers[id].setLatLng([lat, lng]);
        // } else {
        // this.markers[id] = L.marker([lat, lng]).addTo(this.map);
        // }
    }

//   centerMapOn(lat, lng) {
//     this.map.panTo([lat, lng]);
//   }
}
