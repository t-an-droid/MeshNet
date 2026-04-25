import { Capacitor } from '@capacitor/core';
import {
  ConnectionType,
  NearbyConnections,
  Strategy
} from '@capacitor-trancee/nearby-connections';
import { getIdentity, getSyncPayload, mergeMessages, parseSyncPayload } from './store';

const SERVICE_ID = 'com.meshrelief.app';

export const isNativeNearbyAvailable = () => Capacitor.isNativePlatform();

const encodePayload = (value) => {
  const json = JSON.stringify(value);
  const bytes = new TextEncoder().encode(json);
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
};

const decodePayload = (value) => {
  const binary = atob(value);
  const bytes = Uint8Array.from(binary, char => char.charCodeAt(0));
  return JSON.parse(new TextDecoder().decode(bytes));
};

const allPermissionsGranted = (status) => Object.values(status).every(value => value === 'granted');

export const createNativeNearbySession = ({
  onStatus,
  onPeerCount,
  onImported,
  onError
}) => {
  const listeners = [];
  const connected = new Set();
  let running = false;

  const updatePeerCount = () => onPeerCount(connected.size);

  const sendSyncPayload = async (endpointID) => {
    const packet = {
      type: 'sync_data',
      payload: getSyncPayload(12000),
      sentAt: Date.now()
    };
    await NearbyConnections.sendPayload({
      endpointID,
      payload: encodePayload(packet)
    });
  };

  const start = async () => {
    if (running) return;
    if (!isNativeNearbyAvailable()) {
      onError('Native Nearby is only available in the installed Android app.');
      return;
    }

    const identity = getIdentity();
    const endpointName = `Node #${identity.id}`;
    onStatus('Requesting nearby permissions');

    const permissionStatus = await NearbyConnections.requestPermissions({
      permissions: [
        'wifiNearby',
        'wifiState',
        'bluetoothNearby',
        'bluetoothLegacy',
        'location',
        'locationCoarse'
      ]
    });

    if (!allPermissionsGranted(permissionStatus)) {
      onError('Nearby permissions were not granted.');
      return;
    }

    await NearbyConnections.initialize({
      endpointName,
      serviceID: SERVICE_ID,
      strategy: Strategy.CLUSTER,
      autoConnect: false,
      lowPower: false
    });

    listeners.push(
      await NearbyConnections.addListener('onEndpointFound', async endpoint => {
        onStatus(`Found ${endpoint.endpointName || 'nearby node'}`);
        try {
          await NearbyConnections.requestConnection({
            endpointID: endpoint.endpointID,
            endpointName
          });
        } catch {
          // The peer may already be connecting from the other side.
        }
      }),
      await NearbyConnections.addListener('onEndpointInitiated', async endpoint => {
        onStatus(`Accepting ${endpoint.endpointName || 'nearby node'}`);
        await NearbyConnections.acceptConnection({ endpointID: endpoint.endpointID });
      }),
      await NearbyConnections.addListener('onEndpointConnected', async endpoint => {
        connected.add(endpoint.endpointID);
        updatePeerCount();
        onStatus(`Connected to ${endpoint.endpointName || 'nearby node'}`);
        await sendSyncPayload(endpoint.endpointID);
      }),
      await NearbyConnections.addListener('onEndpointDisconnected', endpoint => {
        connected.delete(endpoint.endpointID);
        updatePeerCount();
        onStatus('Peer disconnected');
      }),
      await NearbyConnections.addListener('onPayloadReceived', event => {
        try {
          const packet = decodePayload(event.payload);
          if (packet.type !== 'sync_data') return;
          const incomingMsgs = parseSyncPayload(packet.payload);
          const res = mergeMessages(incomingMsgs);
          onImported(res.added);
        } catch {
          onError('Received unreadable nearby payload.');
        }
      })
    );

    await NearbyConnections.startAdvertising({
      endpointName,
      connectionType: ConnectionType.BALANCED,
      lowPower: false
    });
    await NearbyConnections.startDiscovery({ lowPower: false });

    running = true;
    onStatus('Native Nearby active');
  };

  const stop = async () => {
    connected.clear();
    updatePeerCount();
    running = false;
    await Promise.all(listeners.splice(0).map(listener => listener.remove()));
    try {
      await NearbyConnections.reset();
    } catch {
      // Reset can fail if the native layer is already idle.
    }
    onStatus('Native Nearby stopped');
  };

  return { start, stop };
};
