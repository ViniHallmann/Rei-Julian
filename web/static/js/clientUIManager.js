import { PROXIMITY_METERS, NOTIFICATION_MSG } from './config.js';

export class ClientUIManager {
    constructor(clientConfig) {
        this.clientConfig = clientConfig;
        this.ui = {
            status: document.getElementById('status'),
            eta: document.getElementById('eta'),
            notifyBtn: document.getElementById('notify-btn'),
            notifyState: document.getElementById('notify-state'),
            clientName: document.getElementById('client-name')
        };
        this.notificationsEnabled = false;
        this.proximityTriggered = false;

        this.setupNotifications();
    }

    initUI() {
        if (!this.clientConfig) {
            this.ui.status.textContent = 'Cliente nao encontrado!';
            this.ui.eta.textContent = '';
            return false;
        }

        if (this.ui.clientName) {
            this.ui.clientName.textContent = this.clientConfig.name;
        }
        return true;
    }

    setupNotifications() {
        const updateState = () => {
            if (this.ui.notifyState) {
                this.ui.notifyState.textContent = this.notificationsEnabled 
                    ? 'Notificacoes: ativadas' 
                    : 'Notificacoes: desativadas';
            }
        };

        if (this.ui.notifyBtn) {
            this.ui.notifyBtn.addEventListener('click', async () => {
                if (this.notificationsEnabled) {
                    this.notificationsEnabled = false;
                    updateState();
                    return;
                }
                if (!('Notification' in window)) {
                    alert('Este navegador nao suporta notificacoes.');
                    return;
                }
                const permission = await Notification.requestPermission();
                this.notificationsEnabled = permission === 'granted';
                updateState();
            });
        }

        updateState();
    }

    updateClientStatus(myState, isDelayed) {
        const distance = Math.round(myState.distance_to_home_meters);
        const minutes = Math.round(myState.eta_seconds / 60);
        
        if (this.ui.eta) {
            this.ui.eta.textContent = `Chega em ${minutes} min`;
        }

        if (distance <= PROXIMITY_METERS) {
            this.ui.status.textContent = 'O vendedor esta perto!';
            if (this.notificationsEnabled && !this.proximityTriggered) {
                new Notification('Carro do Ovo', { body: NOTIFICATION_MSG });
                this.proximityTriggered = true;
            }
        } else {
            this.ui.status.textContent = `Vendedor a ${distance} metros`; // Feedback visual aprimorado
            this.proximityTriggered = false;
        }
    }
    handleDelay(isDelayed) {
        const warningBox = document.getElementById('delay-warning');
        if (warningBox) {
            warningBox.style.display = isDelayed ? 'block' : 'none';
        }
        
        if (isDelayed && this.notificationsEnabled && !this.delayTriggered) {
             new Notification('Carro do Ovo', { body: 'O vendedor informou que vai atrasar um pouco.' });
             this.delayTriggered = true;
        } else if (!isDelayed) {
             this.delayTriggered = false; // reset when delay clears
        }
    }
}

    
