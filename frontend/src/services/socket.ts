import { io, type Socket } from 'socket.io-client';
import { useAuthStore } from '../store/auth-store';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL ?? 'http://localhost:3333';

let socket: Socket | null = null;
let currentKey: string | null = null;

export function getSocket(): Socket | null {
  const { accessToken, currentWorkspaceId } = useAuthStore.getState();
  if (!accessToken || !currentWorkspaceId) {
    disconnect();
    return null;
  }
  const key = `${currentWorkspaceId}:${accessToken}`;
  if (socket && currentKey === key && socket.connected) return socket;

  disconnect();
  currentKey = key;
  socket = io(SOCKET_URL, {
    path: '/socket.io',
    auth: { token: accessToken, workspaceId: currentWorkspaceId },
    transports: ['websocket'],
  });
  return socket;
}

export function disconnect() {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
    currentKey = null;
  }
}
