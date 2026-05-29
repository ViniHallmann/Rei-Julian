import { 
    START_LAT, START_LON, 
    MAP_TILE_URL, MAP_MAX_ZOOM, VENDOR_INITIAL_ZOOM 
} from './config.js';

let map, vendorMarker, routeLine;
const logs = [];
const visitedClients = new Set();
let isPaused = false;

const ui = {
    status: document.getElementById('vendor-status'),
    position: document.getElementById('vendor-position'),
    step: document.getElementById('vendor-step'),
    clientsList: document.getElementById('vendor-clients-list'),
    logs: document.getElementById('vendor-logs'),
    togglePlayBtn: document.getElementById('toggle-play-btn'),
    resetBtn: document.getElementById('reset-btn'),
    badge: document.getElementById('vendor-badge'),
    logFilter: document.getElementById('log-filter'),
    accordion: document.getElementById('debug-accordion'),
    debugPanel: document.getElementById('debug-panel')
};

function initMap() {
    map = L.map('map', { zoomControl: true }).setView([START_LAT, START_LON], VENDOR_INITIAL_ZOOM);
    L.tileLayer(MAP_TILE_URL, { maxZoom: MAP_MAX_ZOOM }).addTo(map);
}

function createCustomIcon(label) {
    return L.divIcon({
        className: 'custom-map-marker',
        html: `<div class="marker-dot"></div><div class="marker-label">${label}</div>`,
        iconSize: [20, 20],
        iconAnchor: [10, 10]
    });
}

function formatTime(isoTime) {
    if (!isoTime) return '--:--:--';
    return new Date(isoTime).toLocaleTimeString('pt-BR', { hour12: false });
}

function renderLogs() {
    const filter = ui.logFilter.value;
    const filtered = logs.filter(entry => filter === 'all' || entry.level === filter);
    
    ui.logs.innerHTML = filtered
        .slice(-10).reverse()
        .map(entry => `<div class="log-entry log-${entry.level}"><span class="log-time">${formatTime(entry.timestamp)}</span> ${entry.message}</div>`)
        .join('');
}

function addClientLog(message) {
    logs.unshift({ timestamp: new Date().toISOString(), level: 'info', message });
    if (logs.length > 6) logs.pop();
    renderLogs();
}

function sendControl(action) {
    return fetch('/control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
    }).catch(err => console.error('Erro ao enviar controle:', err));
}

function bindControls() {
    ui.togglePlayBtn.addEventListener('click', () => {
        if (isPaused) {
            sendControl('resume');
            addClientLog('Simulacao retomada.');
        } else {
            sendControl('pause');
            addClientLog('Simulacao pausada.');
        }
        // Local Optimistic Update
        isPaused = !isPaused;
        ui.togglePlayBtn.textContent = isPaused ? 'Retomar' : 'Pausar';
    });

    ui.resetBtn.addEventListener('click', () => { 
        sendControl('reset');
        addClientLog('Rota reiniciada.'); 
        visitedClients.clear(); // Limpa estado visitas
    });
    
    ui.logFilter.addEventListener('change', renderLogs);

    // Accordion Logic
    ui.accordion.addEventListener('click', function() {
        this.classList.toggle('active');
        if (ui.debugPanel.style.maxHeight) {
            ui.debugPanel.style.maxHeight = null;
        } else {
            ui.debugPanel.style.maxHeight = ui.debugPanel.scrollHeight + "px";
        }
    });

    // Delegacao de eventos para os botões "Marcar Visitado"
    ui.clientsList.addEventListener('click', (e) => {
        if (e.target.classList.contains('btn-visited')) {
            const clientId = e.target.dataset.id;
            if (visitedClients.has(clientId)) {
                visitedClients.delete(clientId);
            } else {
                visitedClients.add(clientId);
            }
            // Força um reflow simulado local pra mostrar instantaneamente
            e.target.closest('.client-card').classList.toggle('visited', visitedClients.has(clientId));
            e.target.textContent = visitedClients.has(clientId) ? 'Concluído' : 'Marcar Visitado';
        }
    });
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
        // Updated colors and thickness for neon route
        routeLine = L.polyline(latLngs, { color: '#00ff9d', weight: 6, smoothFactor: 1 }).addTo(map);
    } else {
        routeLine.setLatLngs(latLngs);
    }
}

function renderClientCards(clients) {
    if (!Array.isArray(clients) || clients.length === 0) {
        ui.clientsList.innerHTML = '<div style="color:#aaa;">Nenhum cliente configurado.</div>';
        return;
    }

    const cardsHtml = clients.map(c => {
        const min = Math.round(c.eta_seconds / 60);
        const distance = Math.round(c.distance_to_home_meters);
        const isVisited = visitedClients.has(c.id);
        const cardClass = isVisited ? 'client-card visited' : 'client-card';
        const initial = c.name.charAt(0).toUpperCase();
        const btnText = isVisited ? 'Concluído' : 'Marcar Visitado';

        return `
            <div class="${cardClass}" data-id="${c.id}">
                <div class="client-card-header">
                    <div class="client-avatar">${initial}</div>
                    <div class="client-info">
                        <span class="client-name">${c.name}</span>
                        <span class="client-distance">${distance}m de distância</span>
                        <span class="client-eta">Chega em ${min} min</span>
                    </div>
                </div>
                <button class="btn-visited" data-id="${c.id}">${btnText}</button>
            </div>
        `;
    }).join('');

    // Update only if innerHTML changes, to prevent losing focus/flickering heavily.
    // In a vanilla JS app, full string replace is simple. 
    // To preserve states cleanly on SSE ticks, we can do a naive replace:
    ui.clientsList.innerHTML = cardsHtml;
}

function updateUI(data) {
    isPaused = data.paused;
    ui.status.textContent = isPaused ? 'Pausado.' : 'Online e transmitindo.';
    ui.badge.textContent = isPaused ? 'Pausado' : 'Online';
    ui.badge.classList.remove('badge-offline');
    ui.badge.classList.toggle('badge-paused', !!isPaused);
    ui.togglePlayBtn.textContent = isPaused ? 'Retomar' : 'Pausar';
    
    ui.position.textContent = `Posicao: ${data.latitude.toFixed(6)}, ${data.longitude.toFixed(6)}`;
    ui.step.textContent = `Passo: ${data.step}`;

    renderClientCards(data.clients);

    if (Array.isArray(data.logs) && data.logs.length > 0) {
        logs.length = 0;
        data.logs.forEach(entry => logs.push(entry));
        renderLogs();
    } else {
        addClientLog(`Step ${data.step} - ${data.latitude.toFixed(5)}, ${data.longitude.toFixed(5)}`);
    }

    // Keep accordion panel sized properly if opened
    if (ui.accordion.classList.contains('active')) {
        ui.debugPanel.style.maxHeight = ui.debugPanel.scrollHeight + "px";
    }
}

function setupSSE() {
    const source = new EventSource('/stream');
    
    source.onmessage = (event) => {
        const data = JSON.parse(event.data);
        updateUI(data);
        updateVendorMarker(data.latitude, data.longitude);
        updateRouteLine(data.route);
    };

    source.onerror = () => {
        ui.status.textContent = 'Conexao perdida. Tentando reconectar...';
        ui.badge.textContent = 'Offline';
        ui.badge.classList.add('badge-offline');
        addClientLog('Conexao SSE perdida.');
    };
}

// Inicializacao Sequencial
initMap();
bindControls();
setupSSE();
