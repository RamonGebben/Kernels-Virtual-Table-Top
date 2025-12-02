/* eslint-disable @typescript-eslint/no-explicit-any */
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useSessionState } from './useSessionState';
import type { ClientToServerMessage } from '../../types/messages';

class FakeWebSocket {
  static instances: FakeWebSocket[] = [];
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  url: string;
  readyState = FakeWebSocket.CONNECTING;
  sent: string[] = [];
  listeners: Record<string, Set<(event: any) => void>> = {};

  constructor(url: string) {
    this.url = url;
    FakeWebSocket.instances.push(this);
  }

  addEventListener(type: string, listener: (event: any) => void) {
    if (!this.listeners[type]) this.listeners[type] = new Set();
    this.listeners[type].add(listener);
  }

  removeEventListener(type: string, listener: (event: any) => void) {
    this.listeners[type]?.delete(listener);
  }

  dispatchEvent(event: { type: string; data?: any }) {
    this.listeners[event.type]?.forEach(listener => listener(event));
  }

  open() {
    this.readyState = FakeWebSocket.OPEN;
    this.dispatchEvent({ type: 'open' });
  }

  send(data: string) {
    this.sent.push(data);
  }

  close() {
    this.readyState = FakeWebSocket.CLOSED;
    this.dispatchEvent({ type: 'close' });
  }

  triggerMessage(payload: Record<string, unknown>) {
    this.dispatchEvent({
      type: 'message',
      data: JSON.stringify(payload),
    });
  }
}

describe('useSessionState', () => {
  const originalWsUrl = process.env.NEXT_PUBLIC_WS_URL;

  beforeEach(() => {
    vi.useFakeTimers();
    FakeWebSocket.instances = [];
    vi.stubGlobal('WebSocket', FakeWebSocket as unknown as typeof WebSocket);
    process.env.NEXT_PUBLIC_WS_URL = 'ws://localhost:8081';
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    process.env.NEXT_PUBLIC_WS_URL = originalWsUrl;
  });

  it('sends connect handshake and updates session from server messages', async () => {
    const { result } = renderHook(() => useSessionState('dm'));
    const socket = FakeWebSocket.instances[0];
    expect(socket.url).toBe('ws://localhost:8081');

    act(() => socket.open());

    expect(socket.sent[0]).toContain('"type":"client-connected"');
    expect(socket.sent[1]).toContain('"type":"request-session"');

    const sessionState = {
      map: { id: 'map1', name: 'Forest', filename: 'forest.png' },
      viewport: { x: 1, y: 2, zoom: 1 },
      grid: { size: 48 },
      tableViewport: { x: 0, y: 0, zoom: 1 },
      tableSize: { width: 1920, height: 1080 },
      locked: false,
    };

    await act(async () => {
      socket.triggerMessage({ type: 'session-state', session: sessionState });
    });

    expect(result.current.session.map.id).toBe('map1');

    await act(async () => {
      socket.triggerMessage({
        type: 'viewport-change',
        viewport: { x: 10, y: 20, zoom: 2 },
      });
    });

    expect(result.current.session.viewport).toEqual({
      x: 10,
      y: 20,
      zoom: 2,
    });
  });

  it('emits heartbeats and marks connection lost when no pong is received', async () => {
    const { result, unmount } = renderHook(() => useSessionState('dm'));
    const socket = FakeWebSocket.instances[0];

    act(() => socket.open());

    await act(async () => {
      vi.advanceTimersByTime(5000);
    });

    expect(socket.sent.some(msg => msg.includes('"type":"ping"'))).toBe(true);
    expect(result.current.connectionLost).toBe(false);

    await act(async () => {
      vi.advanceTimersByTime(11_000);
    });

    expect(result.current.connectionLost).toBe(true);
    unmount();
  });

  it('sends viewport updates over the socket', async () => {
    const { result } = renderHook(() => useSessionState('dm'));
    const socket = FakeWebSocket.instances[0];

    act(() => socket.open());

    await act(async () => {
      result.current.sendViewportChange({ x: 5, y: 6, zoom: 2 });
    });

    const sent = socket.sent.map(
      msg => JSON.parse(msg) as ClientToServerMessage,
    );
    const viewportMsg = sent.find(msg => msg.type === 'viewport-change');
    expect(viewportMsg?.viewport).toEqual({ x: 5, y: 6, zoom: 2 });
  });
});
