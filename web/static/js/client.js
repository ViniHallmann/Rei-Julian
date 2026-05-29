import { 
    START_LAT, START_LON, PROXIMITY_METERS, 
    MAP_TILE_URL, MAP_MAX_ZOOM, CLIENT_INITIAL_ZOOM, NOTIFICATION_MSG, CLIENTS 
} from './config.js';

let map, vendorMarker, homeMarker, homeCircle, routeLine;
let notificationsEnabled = false;
let proximityTriggered = false;

const ui = {
    status: document.getElementById('status'),
    eta: document.getElementById('eta'),
    notifyBtn: document.getElementById('notify-btn'),
    notifyState: document.getElementById('notify-state'),
    clientName: document.getElementById('client-name')
};

const clientId = window.location.pathname.split('/').pop();
const clientConfig = CLIENTS.find(c => c.id === clientId);

function initMap() {
    map = L.map('map', { zoomControl: true }).setView([START_LAT, START_LON], CLIENT_INITIAL_ZOOM);
    L.tileLayer(MAP_TILE_URL, { maxZoom: MAP_MAX_ZOOM }).addTo(map);
}

function createCustomIcon(label, isHome = false) {
    return L.divIcon({
        className: `custom-map-marker ${isHome ? 'home-marker' : ''}`,
        html: `<div class="marker-dot"></div><div class="marker-label">${label}</div>`,
        iconSize: [20, 20],
        iconAnchor: [10, 10]
    });
}

function initClient() {
    if (!clientConfig) {
        ui.status.textContent = 'Cliente nao encontrado!';
        ui.eta.textContent = '';
        return false;
    }

    if (ui.clientName) ui.clientName.textContent = clientConfig.name;
    
    homeMarker = L.marker([clientConfig.lat, clientConfig.lon], { 
        icon: createCustomIcon('Casa', true) 
    }).addTo(map);
    
    homeCircle = L.circle([clientConfig.lat, clientConfig.lon], { 
        radius: PROXIMITY_METERS, 
        color: '#00b0ff', 
        fillColor: '#00b0ff', 
        fillOpacity: 0.1, 
        weight: 1 
    }).addTo(map);

    return true;
}

function setupNotifications() {
    const updateState = () => {
        ui.notifyState.textContent = notificationsEnabled ? 'Notificacoes: ativadas' : 'Notificacoes: desativadas';
    };

    ui.notifyBtn.addEventListener('click', async () => {
        if (!('Notification' in window)) {
            alert('Este navegador nao suporta notificacoes.');
            return;
        }
        const permission = await Notification.requestPermission();
        notificationsEnabled = permission === 'granted';
        updateState();
    });

    updateState();
}

function updateVendorMarker(lat, lon) {
    if (!vendorMarker) {
        vendorMarker = L.marker([lat, lon], { icon: createCustomIcon('Vendedor') }).addTo(map);
    } else {
        vendorMarker.setLatLng([lat, lon]);
    }
}

function updateRouteLine(routeData) {
    if (!Array.isArray(routeData) || routeData.length <= 1) return;
    
    const latLngs = routeData.map(p => [p.latitude, p.longitude]);
    if (!routeLine) {
        routeLine = L.polyline(latLngs, { color: '#00e676', weight: 5, smoothFactor: 1 }).addTo(map);
    } else {
        routeLine.setLatLngs(latLngs);
    }
}

function updateClientStatus(myState) {
    const distance = myState.distance_to_home_meters;
    const minutes = Math.round(myState.eta_seconds / 60);
    ui.eta.textContent = `Chega em ${minutes} min`;

    if (distance <= PROXIMITY_METERS) {
        ui.status.textContent = 'O vendedor esta perto!';
        if (notificationsEnabled && !proximityTriggered) {
            new Notification('Carro do Ovo', { body: NOTIFICATION_MSG });
            proximityTriggered = true;
        }
    } else {
        ui.status.textContent = 'Aguardando o vendedor se aproximar.';
        proximityTriggered = false;
    }
}

function setupSSE() {
    const source = new EventSource('/stream');
    source.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (!clientConfig) return;

        const myState = data.clients?.find(c => c.id === clientId);
        if (!myState) return;

        updateVendorMarker(data.latitude, data.longitude);
        updateRouteLine(data.route);
        updateClientStatus(myState);
    };

    source.onerror = (err) => console.error('Erro SSE:', err);
}

// Inicializacao Sequencial
initMap();
if (initClient()) {
    setupNotifications();
    setupSSE();
}
