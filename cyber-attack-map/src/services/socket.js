import { io } from 'socket.io-client';

const DEFAULT_URL = 'http://localhost:3000';

/**
 * Minimal valid event: { from: { lat, lon }, to: { lat, lon } }
 * Optional from middleware: id, category, severity, sourceLabel, targetLabel, ddos: { ... }, createdAt
 */
function isValidPayload(payload) {
  return (
    payload &&
    payload.from &&
    payload.to &&
    typeof payload.from.lat === 'number' &&
    typeof payload.from.lon === 'number' &&
    typeof payload.to.lat === 'number' &&
    typeof payload.to.lon === 'number'
  );
}

/**
 * Connect to Socket.io and listen for "attack" events from your bridge server.
 * @param {(payload: object) => void} onAttack
 * @param {(connected: boolean) => void} [onConnectionChange]
 * @returns {() => void} cleanup
 */
export function connectAttackSocket(onAttack, onConnectionChange) {
  const url = import.meta.env.VITE_SOCKET_URL || DEFAULT_URL;
  const socket = io(url, {
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
  });

  const handleConnect = () => onConnectionChange?.(true);
  const handleDisconnect = () => onConnectionChange?.(false);
  const handleConnectError = () => onConnectionChange?.(false);

  socket.on('connect', handleConnect);
  socket.on('disconnect', handleDisconnect);
  socket.on('connect_error', handleConnectError);

  socket.on('attack', (payload) => {
    if (isValidPayload(payload)) {
      onAttack(payload);
    }
  });

  return () => {
    socket.off('connect', handleConnect);
    socket.off('disconnect', handleDisconnect);
    socket.off('connect_error', handleConnectError);
    socket.off('attack');
    socket.disconnect();
  };
}
