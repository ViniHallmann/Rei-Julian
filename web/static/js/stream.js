export function listenToDevice(id, onDataReceived) {
    const source = new EventSource(`/stream/${id}`);

    source.onmessage = function(event) {
        const data = JSON.parse(event.data);
        onDataReceived(data);
    };

    source.onerror = function(err) {
        console.error(`Erro SSE no dispositivo [${id}]:`, err);
    };
}