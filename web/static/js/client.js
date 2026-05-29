import { CLIENTS } from './config.js';
import { ClientUIManager } from './clientUIManager.js';
import { ClientMapManager } from './clientMapManager.js';

const clientId = window.location.pathname.split('/').pop();
const clientConfig = CLIENTS.find(c => c.id === clientId);

const uiManager = new ClientUIManager(clientConfig);
const mapManager = new ClientMapManager();

function setupSSE() {
    const source = new EventSource('/stream');
    source.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (!clientConfig) return;

        const myState = data.clients?.find(c => c.id === clientId);
        if (!myState) return;

        mapManager.updateVendorMarker(data.latitude, data.longitude);
        mapManager.updateRouteLine(data.route);
        uiManager.updateClientStatus(myState);
        uiManager.handleDelay(data.delay);
    };

    source.onerror = (err) => console.error('Erro SSE:', err);
}

if (uiManager.initUI()) {
    mapManager.initClientMarker(clientConfig);
    setupSSE();
}
