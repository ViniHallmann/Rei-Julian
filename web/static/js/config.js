export const START_LAT = -31.7654;
export const START_LON = -52.3376;
export const PROXIMITY_METERS = 300;
export const AVERAGE_SPEED_KMH = 20;

export const MAP_TILE_URL = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
export const MAP_MAX_ZOOM = 19;
export const CLIENT_INITIAL_ZOOM = 14;
export const VENDOR_INITIAL_ZOOM = 16;
export const NOTIFICATION_MSG = `O vendedor esta a menos de ${PROXIMITY_METERS}m da sua casa.`;


export const CLIENTS = [
    { id: "cliente-maria", name: "Maria", lat: -31.7674, lon: -52.3361, rota: "rota-pelotas-centro" },
    { id: "cliente-joao", name: "João", lat: -31.7628, lon: -52.3411, rota: "rota-pelotas-centro" },
    { id: "cliente-ana", name: "Ana", lat: -31.7601, lon: -52.3385, rota: "rota-pelotas-centro" },
    { id: "cliente-carlos", name: "Carlos", lat: -31.7654, lon: -52.3376, rota: "rota-pelotas-zona-norte" },
    { id: "cliente-fernanda", name: "Fernanda", lat: -31.7456, lon: -52.3255, rota: "rota-pelotas-zona-norte" },
    { id: "cliente-pedro", name: "Pedro", lat: -31.7654, lon: -52.3376, rota: "rota-pelotas-zona-sul" },
    { id: "cliente-lucas", name: "Lucas", lat: -31.762000, lon: -52.315000, rota: "rota-pelotas-zona-sul" },
    { id: "cliente-10", name: "Base", lat: -31.7654, lon: -52.3376, rota: "base" },
];
