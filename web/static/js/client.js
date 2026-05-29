import { START_LAT, START_LON, PROXIMITY_METERS, CLIENTS } from './config.js';

const map = L.map('map').setView([START_LAT, START_LON], 16);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);

let vendorMarker = null;
let homeMarker = null;
let homeCircle = null;
let routeLine = null;
let notificationsEnabled = false;
let proximityTriggered = false;

const statusEl = document.getElementById('status');
const etaEl = document.getElementById('eta');
const notifyBtn = document.getElementById('notify-btn');
const notifyState = document.getElementById('notify-state');
const clientNameEl = document.getElementById('client-name');

const clientId = window.location.pathname.split('/').pop();
const clientConfig = CLIENTS.find(c => c.id === clientId);

if (!clientConfig) {
    statusEl.textContent = 'Cliente nao encontrado!';
    etaEl.textContent = '';
} else {
    // Definimos o nome se o elemento existir
    if (clientNameEl) clientNameEl.textContent = clientConfig.name;
    
    // Draw the client's home
    homeMarker = L.marker([clientConfig.lat, clientConfig.lon]).addTo(map).bindPopup('Casa de ' + clientConfig.name);
    homeCircle = L.circle([clientConfig.lat, clientConfig.lon], { radius: PROXIMITY_METERS }).addTo(map);
}

function updateNotificationState() {
    notifyState.textContent = notificationsEnabled ? 'Notificacoes: ativadas' : 'Notificacoes: desativadas';
}

notifyBtn.addEventListener('click', async () => {
    if (!('Notification' in window)) {
        alert('Este navegador nao suporta notificacoes.');
        return;
    }

    const permission = await Notification.requestPermission();
    notificationsEnabled = permission === 'granted';
    updateNotificationState();
});

const source = new EventSource('/stream');
source.onmessage = (event) => {
    const data = JSON.parse(event.data);
    
    if (!clientConfig) return;

    const myState = data.clients?.find(c => c.id === clientId);
    if (!myState) return;

    if (!vendorMarker) {
        vendorMarker = L.marker([data.latitude, data.longitude]).addTo(map);
    } else {
        vendorMarker.setLatLng([data.latitude, data.longitude]);
    }

    if (Array.isArray(data.route) && data.route.length > 1) {
        const latLngs = data.route.map((point) => [point.latitude, point.longitude]);
        if (!routeLine) {
            routeLine = L.polyline(latLngs, { color: '#f15a24' }).addTo(map);
        } else {
            routeLine.setLatLngs(latLngs);
        }
    }

    const distance = myState.distance_to_home_meters;
    const minutes = Math.round(myState.eta_seconds / 60);
    etaEl.textContent = `ETA: ${minutes} min`;

    if (distance <= PROXIMITY_METERS) {
        statusEl.textContent = 'O vendedor esta perto!';
        if (notificationsEnabled && !proximityTriggered) {
            new Notification('Carro do Ovo', {
                body: 'O vendedor esta a menos de 500m da sua casa.'
            });
            proximityTriggered = true;
        }
    } else {
        statusEl.textContent = 'Aguardando o vendedor se aproximar.';
        proximityTriggered = false;
    }
};

source.onerror = (err) => {
    console.error('Erro SSE:', err);
};

updateNotificationState();
