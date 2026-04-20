import { map } from './map.js';
import { MarkerManager } from './marker.js';
import { listenToDevice } from './stream.js';
import { devicesToTrack } from './config.js';

const markerManager = new MarkerManager(map);

devicesToTrack.forEach(id => {
  listenToDevice(id, (data) => {
    markerManager.updateMarker(data.id, data.latitude, data.longitude);
    console.log(`Dispositivo [${data.id}] atualizado:`, data);
  });
});