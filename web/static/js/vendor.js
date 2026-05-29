import { UIManager } from './uiManager.js';
import { MarkerManager } from './markerManager.js';

const ui = new UIManager();
const mapManager = new MarkerManager();

function sendControl(action) {
    return fetch('/control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
    }).catch(err => console.error('Erro ao enviar controle:', err));
}

ui.setControlsCallbacks(
    () => {
        if (ui.isPaused) {
            sendControl('resume');
            ui.addLog('Simulacao retomada.');
        } else {
            sendControl('pause');
            ui.addLog('Simulacao pausada.');
        }
        ui.isPaused = !ui.isPaused;
        ui.ui.togglePlayBtn.textContent = ui.isPaused ? 'Retomar' : 'Pausar';
    },
    () => {
        sendControl('reset');
        ui.addLog('Rota reiniciada.'); 
        ui.visitedClients.clear();
        // Emite reset para os markers
        for(let id of Object.keys(mapManager.clientMarkers)) {
            mapManager.updateClientMarkerState(id, false);
        }
    },
    () => {
        sendControl('start');
        ui.addLog('Rota iniciada!'); 
        if (ui.isPaused) {
            ui.isPaused = false;
            ui.ui.togglePlayBtn.textContent = 'Pausar';
        }
    }
);

function setupSSE() {
    const source = new EventSource('/stream');
    
    source.onmessage = (event) => {
        const data = JSON.parse(event.data);
        ui.update(data);
        mapManager.updateVendorMarker(data.latitude, data.longitude);
        mapManager.updateClientMarkers(data.clients, ui.visitedClients);
        mapManager.updateRouteLine(data.route);
    };

    source.onerror = () => {
        ui.setOffline();
    };
}

// Start tracking
setupSSE();

// Handle Route Select
document.getElementById('route-select').addEventListener('change', (e) => {
    fetch('/control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'change_route', routeId: e.target.value })
    });
});

document.getElementById('vendor-clients-list').addEventListener('click', (e) => {
    const delayBtn = e.target.closest('.btn-emergency-delay');
    if (delayBtn) {
        // Toggle delay state on backend
        const isCurrentlyDelayed = delayBtn.classList.contains('delayed-active');
        fetch('/control', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: isCurrentlyDelayed ? 'clear_delay' : 'delay' })
        });
        
        delayBtn.classList.toggle('delayed-active');
        if (!isCurrentlyDelayed) {
            delayBtn.style.color = '#ff3c3c';
        } else {
            delayBtn.style.color = '';
        }
    }
});

document.addEventListener('vendor-action', (e) => {
    const payload = e.detail;
    fetch('/control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    }).catch(err => console.error('Erro na ação:', err));
});
