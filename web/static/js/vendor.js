import { START_LAT, START_LON } from './config.js';

const map = L.map('map').setView([START_LAT, START_LON], 16);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);

let vendorMarker = null;
let routeLine = null;
const logs = [];

const statusEl = document.getElementById('vendor-status');
const positionEl = document.getElementById('vendor-position');
const stepEl = document.getElementById('vendor-step');
const clientsListEl = document.getElementById('vendor-clients-list');
const logsEl = document.getElementById('vendor-logs');
const pauseBtn = document.getElementById('pause-btn');
const resumeBtn = document.getElementById('resume-btn');
const resetBtn = document.getElementById('reset-btn');
const badgeEl = document.getElementById('vendor-badge');
const logFilterEl = document.getElementById('log-filter');

function formatTime(isoTime) {
    if (!isoTime) {
        return '--:--:--';
    }
    const date = new Date(isoTime);
    return date.toLocaleTimeString('pt-BR', { hour12: false });
}

function renderLogs(entries) {
    const filter = logFilterEl.value;
    const filtered = entries.filter((entry) => filter === 'all' || entry.level === filter);
    logsEl.innerHTML = filtered
        .slice(-10)
        .reverse()
        .map((entry) => {
            const time = formatTime(entry.timestamp);
            return `<div class="log-entry log-${entry.level}"><span class="log-time">${time}</span> ${entry.message}</div>`;
        })
        .join('');
}

function addLog(message) {
    logs.unshift({
        timestamp: new Date().toISOString(),
        level: 'info',
        message
    });
    if (logs.length > 6) {
        logs.pop();
    }
    renderLogs(logs);
}

function sendControl(action) {
    return fetch('/control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
    }).catch((err) => {
        console.error('Erro ao enviar controle:', err);
    });
}

pauseBtn.addEventListener('click', () => {
    sendControl('pause');
    addLog('Simulacao pausada.');
});

resumeBtn.addEventListener('click', () => {
    sendControl('resume');
    addLog('Simulacao retomada.');
});

resetBtn.addEventListener('click', () => {
    sendControl('reset');
    addLog('Rota reiniciada.');
});

logFilterEl.addEventListener('change', () => {
    renderLogs(logs);
});

const source = new EventSource('/stream');
source.onmessage = (event) => {
    const data = JSON.parse(event.data);

    statusEl.textContent = 'Online e transmitindo.';
    badgeEl.textContent = data.paused ? 'Pausado' : 'Online';
    badgeEl.classList.remove('badge-offline');
    badgeEl.classList.toggle('badge-paused', !!data.paused);
    positionEl.textContent = `Posicao: ${data.latitude.toFixed(6)}, ${data.longitude.toFixed(6)}`;
    stepEl.textContent = `Passo: ${data.step}`;
    
    if (data.paused) {
        statusEl.textContent = 'Pausado.';
    }

    if (Array.isArray(data.clients) && data.clients.length > 0) {
        clientsListEl.innerHTML = data.clients.map(c => {
            const min = Math.round(c.eta_seconds / 60);
            return `<div><strong>${c.name}:</strong> ${Math.round(c.distance_to_home_meters)}m (ETA: ${min} min)</div>`;
        }).join('');
    } else {
        clientsListEl.innerHTML = 'Nenhum cliente configurado.';
    }

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

    if (Array.isArray(data.logs) && data.logs.length > 0) {
        logs.length = 0;
        data.logs.forEach((entry) => logs.push(entry));
        renderLogs(logs);
    } else {
        addLog(`Step ${data.step} - ${data.latitude.toFixed(5)}, ${data.longitude.toFixed(5)}`);
    }
};

source.onerror = () => {
    statusEl.textContent = 'Conexao perdida. Tentando reconectar...';
    badgeEl.textContent = 'Offline';
    badgeEl.classList.add('badge-offline');
    addLog('Conexao SSE perdida.');
};
