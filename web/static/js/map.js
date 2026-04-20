import { initialLat, initialLng } from './config.js';

const map = L.map('map').setView([initialLat, initialLng], 17);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);

export { map };