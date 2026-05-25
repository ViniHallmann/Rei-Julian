const startLat = -31.770687426923516;
const startLon = -52.34135057529372;
const proximityMeters = 500;
const averageSpeedKmh = 20;

const map = L.map('map').setView([startLat, startLon], 16);
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

map.on('click', (event) => {
    const { lat, lng } = event.latlng;

    if (!homeMarker) {
        homeMarker = L.marker([lat, lng]).addTo(map).bindPopup('Casa');
    } else {
        homeMarker.setLatLng([lat, lng]);
    }

    if (!homeCircle) {
        homeCircle = L.circle([lat, lng], { radius: proximityMeters }).addTo(map);
    } else {
        homeCircle.setLatLng([lat, lng]);
    }

    statusEl.textContent = 'Casa definida. Aguardando vendedor...';
    proximityTriggered = false;

    fetch('/set-home', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ latitude: lat, longitude: lng })
    }).catch((err) => {
        console.error('Erro ao enviar casa:', err);
    });
});

function haversineMeters(lat1, lon1, lat2, lon2) {
    const toRad = (value) => (value * Math.PI) / 180;
    const r = 6371000;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return r * c;
}

function etaSeconds(distanceMeters) {
    const speedMs = (averageSpeedKmh * 1000) / 3600;
    return Math.max(0, Math.round(distanceMeters / speedMs));
}

function updateEta(vendorLat, vendorLon, serverEtaSeconds) {
    if (!homeMarker) {
        etaEl.textContent = 'ETA: --';
        return;
    }

    const home = homeMarker.getLatLng();
    const distance = haversineMeters(vendorLat, vendorLon, home.lat, home.lng);
    const seconds = Number.isFinite(serverEtaSeconds) && serverEtaSeconds > 0
        ? serverEtaSeconds
        : etaSeconds(distance);
    const minutes = Math.round(seconds / 60);
    etaEl.textContent = `ETA: ${minutes} min`;

    if (distance <= proximityMeters) {
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
}

const source = new EventSource('/stream');
source.onmessage = (event) => {
    const data = JSON.parse(event.data);

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

    updateEta(data.latitude, data.longitude, data.eta_seconds);
};

source.onerror = (err) => {
    console.error('Erro SSE:', err);
};

updateNotificationState();
