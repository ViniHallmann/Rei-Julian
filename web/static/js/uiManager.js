export class UIManager {
    constructor() {
        this.ui = {
            status: document.getElementById('vendor-status'),
            position: document.getElementById('vendor-position'),
            step: document.getElementById('vendor-step'),
            clientsList: document.getElementById('vendor-clients-list'),
            logs: document.getElementById('vendor-logs'),
            togglePlayBtn: document.getElementById('toggle-play-btn'),
            resetBtn: document.getElementById('reset-btn'),
            startBtn: document.getElementById('start-btn'),
            badge: document.getElementById('vendor-badge'),
            logFilter: document.getElementById('log-filter'),
            accordion: document.getElementById('debug-accordion'),
            debugPanel: document.getElementById('debug-panel')
        };
        this.logs = [];
        this.visitedClients = new Set();
        this.isPaused = false;
        
        // Listeners for UI
        this.bindEvents();
    }

    bindEvents() {
        this.ui.logFilter.addEventListener('change', () => this.renderLogs());

        this.ui.accordion.addEventListener('click', (e) => {
            const acc = e.currentTarget;
            acc.classList.toggle('active');
            if (this.ui.debugPanel.style.maxHeight) {
                this.ui.debugPanel.style.maxHeight = null;
            } else {
                this.ui.debugPanel.style.maxHeight = this.ui.debugPanel.scrollHeight + "px";
            }
        });
        
        this.ui.clientsList.addEventListener('click', (e) => {
            const btn = e.target.closest('.btn-visited');
            if (btn) {
                const clientId = btn.dataset.id;
                if (this.visitedClients.has(clientId)) {
                    this.visitedClients.delete(clientId);
                } else {
                    this.visitedClients.add(clientId);
                }
                const card = btn.closest('.client-card');
                card.classList.toggle('visited', this.visitedClients.has(clientId));
                
                // Update icon path dynamically
                if (this.visitedClients.has(clientId)) {
                     btn.innerHTML = `<svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>`;
                } else {
                     btn.innerHTML = `<svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
                }
                
                // Dispatch event so map markers can update
                document.dispatchEvent(new CustomEvent('client-visited', { detail: { id: clientId, visited: this.visitedClients.has(clientId) } }));
            }
            
            // Placholders for new actions
            if (e.target.closest('.btn-emergency-skip')) {
                alert('Ação: Pular Cliente');
            }
            if (e.target.closest('.btn-emergency-delay')) {
                alert('Ação: Avisar Atraso');
            }
        });
    }

    setControlsCallbacks(onTogglePlay, onReset, onStart) {
        this.ui.togglePlayBtn.addEventListener('click', onTogglePlay);
        this.ui.resetBtn.addEventListener('click', onReset);
        if (this.ui.startBtn) {
            this.ui.startBtn.addEventListener('click', onStart);
        }
    }

    formatTime(isoTime) {
        if (!isoTime) return '--:--:--';
        return new Date(isoTime).toLocaleTimeString('pt-BR', { hour12: false });
    }

    renderLogs() {
        const filter = this.ui.logFilter.value;
        const filtered = this.logs.filter(entry => filter === 'all' || entry.level === filter);
        
        this.ui.logs.innerHTML = filtered
            .slice(-10).reverse()
            .map(entry => `<div class="log-entry log-${entry.level}"><span class="log-time">${this.formatTime(entry.timestamp)}</span> ${entry.message}</div>`)
            .join('');
    }

    addLog(message, level = 'info') {
        this.logs.unshift({ timestamp: new Date().toISOString(), level, message });
        if (this.logs.length > 6) this.logs.pop();
        this.renderLogs();
    }

    renderClientCards(clients) {
        if (!Array.isArray(clients) || clients.length === 0) {
            this.ui.clientsList.innerHTML = '<div style="color:#aaa;">Nenhum cliente configurado.</div>';
            return;
        }

        const cardsHtml = clients.map(c => {
            const min = Math.round(c.eta_seconds / 60);
            const distance = Math.round(c.distance_to_home_meters);
            const isVisited = this.visitedClients.has(c.id);
            const cardClass = isVisited ? 'client-card visited' : 'client-card';
            const initial = c.name.charAt(0).toUpperCase();

            // Svg icon depending on the state
            const iconSvg = isVisited 
                ? `<svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>`
                : `<svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`;

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
                    <div class="client-actions">
                        <button class="btn-icon btn-visited" data-id="${c.id}" title="Marcar Visitado">
                            ${iconSvg}
                        </button>
                        <button class="btn-icon btn-emergency-skip" title="Pular Cliente">
                            <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 4 15 12 5 20 5 4"></polygon><line x1="19" y1="5" x2="19" y2="19"></line></svg>
                        </button>
                        <button class="btn-icon btn-emergency-delay" title="Avisar Atraso">
                            <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                        </button>
                    </div>
                </div>
            `;
        }).join('');

        this.ui.clientsList.innerHTML = cardsHtml;
    }

    update(data) {
        this.isPaused = data.paused;
        this.ui.status.textContent = this.isPaused ? 'Pausado.' : 'Online e transmitindo.';
        this.ui.badge.textContent = this.isPaused ? 'Pausado' : 'Online';
        this.ui.badge.classList.remove('badge-offline');
        this.ui.badge.classList.toggle('badge-paused', !!this.isPaused);
        this.ui.togglePlayBtn.textContent = this.isPaused ? 'Retomar' : 'Pausar';
        
        this.ui.position.textContent = `Posicao: ${data.latitude.toFixed(6)}, ${data.longitude.toFixed(6)}`;
        this.ui.step.textContent = `Passo: ${data.step}`;

        this.renderClientCards(data.clients);

        if (Array.isArray(data.logs) && data.logs.length > 0) {
            this.logs.length = 0;
            data.logs.forEach(entry => this.logs.push(entry));
            this.renderLogs();
        } else {
            this.addLog(`Step ${data.step} - ${data.latitude.toFixed(5)}, ${data.longitude.toFixed(5)}`);
        }

        if (this.ui.accordion.classList.contains('active')) {
            this.ui.debugPanel.style.maxHeight = this.ui.debugPanel.scrollHeight + "px";
        }
    }

    setOffline() {
        this.ui.status.textContent = 'Conexao perdida. Tentando reconectar...';
        this.ui.badge.textContent = 'Offline';
        this.ui.badge.classList.add('badge-offline');
        this.addLog('Conexao SSE perdida.');
    }
}
