'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
  ClientRole,
  ServerToClientMessage,
  ClientToServerMessage,
  ViewportState,
  GridSettings,
  ViewportDimensions,
} from '../../types/messages';
import { DEFAULT_SESSION, type SessionState } from '../../types/session';

type ConnectionStatus =
  | 'offline'
  | 'connecting'
  | 'connected'
  | 'stale'
  | 'reconnecting';

const HEARTBEAT_INTERVAL_MS = 5000;
const STALE_AFTER_MS = 10000;
const CONNECTION_LOST_DEBOUNCE_MS = 300;

const defaultPort = process.env.NEXT_PUBLIC_WS_PORT || '8081';
const envWsUrl = process.env.NEXT_PUBLIC_WS_URL;

const buildWsUrl = () => {
  if (envWsUrl) return envWsUrl;
  if (typeof window === 'undefined') return '';
  const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
  const host = window.location.hostname;
  return `${protocol}://${host}:${defaultPort}`;
};

const safeParseMessage = (data: string): ServerToClientMessage | null => {
  try {
    const parsed = JSON.parse(data);
    if (parsed && typeof parsed.type === 'string')
      return parsed as ServerToClientMessage;
  } catch {
    // ignore
  }
  return null;
};

/**
 * Tracks the shared tabletop session over WebSocket, mirroring server state
 * locally while providing typed helpers to push changes back to the server.
 * The hook also handles heartbeats and reconnection to keep the UI resilient.
 */
export function useSessionState(role: ClientRole) {
  const [session, setSession] = useState<SessionState>(DEFAULT_SESSION);
  const [connectionStatus, setConnectionStatus] =
    useState<ConnectionStatus>('connecting');
  const [connectionLostVisible, setConnectionLostVisible] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const heartbeatTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastPongRef = useRef<number>(0);
  const connectionLostTimer = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  const wsUrl = useMemo(() => buildWsUrl(), []);

  useEffect(() => {
    if (!wsUrl) {
      const t = setTimeout(() => {
        setConnectionStatus('offline');
      }, 0);
      return () => clearTimeout(t);
    }

    // initialize lastPongRef on mount/effect instead of during render
    lastPongRef.current = Date.now();

    const connect = (reason: 'initial' | 'reconnect' = 'initial') => {
      setConnectionStatus(
        reason === 'reconnect' ? 'reconnecting' : 'connecting',
      );
      if (wsRef.current) {
        wsRef.current.close();
      }
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.addEventListener('open', () => {
        const connectMsg: ClientToServerMessage = {
          type: 'client-connected',
          role,
        };
        ws.send(JSON.stringify(connectMsg));
        ws.send(
          JSON.stringify({
            type: 'request-session',
          } satisfies ClientToServerMessage),
        );
        setConnectionStatus('connected');
        lastPongRef.current = Date.now();
      });

      ws.addEventListener('message', event => {
        const msg = safeParseMessage(event.data);
        if (!msg) return;
        switch (msg.type) {
          case 'session-state':
            setSession(msg.session);
            break;
          case 'table-size':
            setSession(prev => ({ ...prev, tableSize: msg.size }));
            break;
          case 'table-viewport-change':
            setSession(prev => ({ ...prev, tableViewport: msg.viewport }));
            break;
          case 'grid-update':
            setSession(prev => ({ ...prev, grid: msg.grid }));
            break;
          case 'map-change':
            setSession(prev => ({
              ...prev,
              map: msg.map,
              grid: msg.map.grid ?? prev.grid,
            }));
            break;
          case 'artwork-display':
            setSession(prev => ({ ...prev, artwork: msg.artwork }));
            break;
          case 'lock-viewport':
            setSession(prev => ({ ...prev, locked: msg.locked }));
            break;
          case 'viewport-change':
            setSession(prev => ({ ...prev, viewport: msg.viewport }));
            break;
          case 'pong':
            lastPongRef.current = Date.now();
            setConnectionStatus('connected');
            break;
          default:
            break;
        }
      });

      ws.addEventListener('close', () => {
        setConnectionStatus('reconnecting');
        if (!reconnectTimer.current) {
          reconnectTimer.current = setTimeout(() => {
            reconnectTimer.current = null;
            connect('reconnect');
          }, 2000);
        }
      });

      ws.addEventListener('error', () => {
        ws.close();
      });
    };

    connect('initial');

    heartbeatTimer.current = setInterval(() => {
      const socket = wsRef.current;
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(
          JSON.stringify({
            type: 'ping',
            timestamp: Date.now(),
          } satisfies ClientToServerMessage),
        );
      }
      const stale = Date.now() - lastPongRef.current >= STALE_AFTER_MS;
      setConnectionStatus(prev => {
        if (stale && prev === 'connected') return 'stale';
        if (!stale && prev === 'stale') return 'connected';
        return prev;
      });
      if (stale) {
        setConnectionLostVisible(true);
      }
    }, HEARTBEAT_INTERVAL_MS);

    return () => {
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      if (heartbeatTimer.current) clearInterval(heartbeatTimer.current);
      wsRef.current?.close();
      wsRef.current = null;
      setConnectionStatus('offline');
    };
  }, [role, wsUrl]);

  const sendMessage = useCallback((message: ClientToServerMessage) => {
    const socket = wsRef.current;
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(message));
    }
  }, []);

  const sendMapChange = useCallback(
    (map: SessionState['map']) => {
      setSession(prev => ({ ...prev, map }));
      sendMessage({ type: 'map-change', map });
    },
    [sendMessage],
  );

  const sendViewportChange = useCallback(
    (viewport: ViewportState) => {
      setSession(prev => ({ ...prev, viewport }));
      sendMessage({ type: 'viewport-change', viewport });
    },
    [sendMessage],
  );

  const sendGridUpdate = useCallback(
    (grid: GridSettings) => {
      setSession(prev => ({ ...prev, grid }));
      sendMessage({ type: 'grid-update', grid });
    },
    [sendMessage],
  );

  const sendTableViewportChange = useCallback(
    (viewport: ViewportState) => {
      setSession(prev => ({ ...prev, tableViewport: viewport }));
      sendMessage({ type: 'table-viewport-change', viewport });
    },
    [sendMessage],
  );

  const sendTableSize = useCallback(
    (size: ViewportDimensions) => {
      setSession(prev => ({ ...prev, tableSize: size }));
      sendMessage({ type: 'table-size', size });
    },
    [sendMessage],
  );

  const sendArtworkDisplay = useCallback(
    (artwork: SessionState['artwork']) => {
      setSession(prev => ({ ...prev, artwork }));
      sendMessage({ type: 'artwork-display', artwork });
    },
    [sendMessage],
  );

  useEffect(() => {
    if (connectionLostTimer.current) {
      clearTimeout(connectionLostTimer.current);
      connectionLostTimer.current = null;
    }

    if (connectionStatus === 'connected') {
      connectionLostTimer.current = setTimeout(() => {
        setConnectionLostVisible(false);
      }, 0);
      return undefined;
    }

    connectionLostTimer.current = setTimeout(() => {
      setConnectionLostVisible(true);
      connectionLostTimer.current = null;
    }, CONNECTION_LOST_DEBOUNCE_MS);

    return () => {
      if (connectionLostTimer.current) {
        clearTimeout(connectionLostTimer.current);
        connectionLostTimer.current = null;
      }
    };
  }, [connectionStatus]);

  const connected = connectionStatus === 'connected';
  const connectionLost = connectionLostVisible;

  return {
    session,
    connectionStatus,
    connected,
    connectionLost,
    sendMapChange,
    sendViewportChange,
    sendGridUpdate,
    sendTableViewportChange,
    sendTableSize,
    sendArtworkDisplay,
  };
}

export default useSessionState;
