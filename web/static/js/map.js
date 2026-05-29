import { START_LAT, START_LON } from './config.js';

const map = L.map('map').setView([START_LAT, START_LON], 17);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);

export { map };