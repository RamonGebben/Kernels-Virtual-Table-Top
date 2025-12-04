import { createServer } from 'node:http';
import { WebSocketServer, WebSocket } from 'ws';

import type {
  ClientRole,
  ClientToServerMessage,
  ServerToClientMessage,
  ViewportDimensions,
} from '../../types/messages.js';
import { DEFAULT_SESSION, type SessionState } from '../../types/session.js';
import { BLANK_MAP_ID } from '../../types/session.js';
import { getGridForMap, setGridForMap } from '../../src/lib/mapMetadata.js';

type Client = {
  socket: WebSocket;
  role: ClientRole;
  viewport?: ViewportDimensions;
};

const DEBUG_WS = process.env.DEBUG_WS === 'true';
const WS_PORT = Number(process.env.WS_PORT ?? 8081);

const httpServer = createServer();
const wss = new WebSocketServer({ server: httpServer });
const clients = new Set<Client>();
let sessionState: SessionState = DEFAULT_SESSION;

const send = (socket: WebSocket, message: ServerToClientMessage) => {
  if (socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(message));
  }
};

const broadcast = (message: ServerToClientMessage, exclude?: WebSocket) => {
  for (const client of clients) {
    if (client.socket === exclude) continue;
    send(client.socket, message);
  }
};

const sendSessionState = async (socket: WebSocket) => {
  send(socket, { type: 'session-state', session: sessionState });
};

const handleMessage = async (
  client: Client,
  message: ClientToServerMessage,
) => {
  if (DEBUG_WS) {
    console.log('WS message:', JSON.stringify(message, null, 2));
  }
  switch (message.type) {
    case 'client-connected':
      client.role = message.role;
      client.viewport = message.viewport;
      send(client.socket, { type: 'welcome', role: message.role });
      broadcast(
        {
          type: 'client-connected',
          role: message.role,
          viewport: message.viewport,
        },
        client.socket,
      );
      await sendSessionState(client.socket);
      break;
    case 'request-session':
      await sendSessionState(client.socket);
      break;
    case 'viewport-change': {
      sessionState = { ...sessionState, viewport: message.viewport };
      broadcast(
        { type: 'viewport-change', viewport: message.viewport },
        client.socket,
      );
      break;
    }
    case 'table-size': {
      sessionState = { ...sessionState, tableSize: message.size };
      broadcast({ type: 'table-size', size: message.size }, client.socket);
      break;
    }
    case 'table-viewport-change': {
      sessionState = { ...sessionState, tableViewport: message.viewport };
      broadcast(
        { type: 'table-viewport-change', viewport: message.viewport },
        client.socket,
      );
      break;
    }
    case 'grid-update':
      sessionState = { ...sessionState, grid: message.grid };
      if (sessionState.map.filename) {
        void setGridForMap(sessionState.map.filename, message.grid);
      }
      broadcast({ type: 'grid-update', grid: message.grid }, client.socket);
      break;
    case 'map-change':
      if (message.map.id !== BLANK_MAP_ID && message.map.filename) {
        const storedGrid = await getGridForMap(message.map.filename);
        if (storedGrid) {
          const mapWithGrid = { ...message.map, grid: storedGrid };
          sessionState = {
            ...sessionState,
            map: mapWithGrid,
            grid: storedGrid,
          };
          broadcast({ type: 'map-change', map: mapWithGrid }, client.socket);
          broadcast({ type: 'grid-update', grid: storedGrid }, client.socket);
          break;
        }
      }
      sessionState = { ...sessionState, map: message.map };
      broadcast({ type: 'map-change', map: message.map }, client.socket);
      break;
    case 'artwork-display':
      sessionState = { ...sessionState, artwork: message.artwork };
      broadcast(
        { type: 'artwork-display', artwork: message.artwork },
        client.socket,
      );
      break;
    case 'lock-viewport':
      sessionState = { ...sessionState, locked: message.locked };
      broadcast(
        { type: 'lock-viewport', locked: message.locked },
        client.socket,
      );
      break;
    case 'ping':
      send(client.socket, { type: 'pong', timestamp: message.timestamp });
      break;
    default:
      // Exhaustiveness guard for new message types.
      const _never: never = message;
      return _never;
  }
};

wss.on('connection', socket => {
  const client: Client = { socket, role: 'table' };
  clients.add(client);

  socket.on('message', async data => {
    try {
      const parsed = JSON.parse(data.toString());
      if (
        !parsed ||
        typeof parsed !== 'object' ||
        typeof parsed.type !== 'string'
      ) {
        return;
      }
      await handleMessage(client, parsed as ClientToServerMessage);
    } catch (error) {
      console.error('Failed to process message', error);
    }
  });

  socket.on('close', () => {
    clients.delete(client);
  });
});

httpServer.listen(WS_PORT, () => {
  console.log(`WebSocket server listening on ws://localhost:${WS_PORT}`);
});
