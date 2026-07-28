import { useEffect, useRef, useCallback } from 'react';
import type { SyncMessage } from '../types';

/**
 * Manages a WebSocket connection to the kanban-md server.
 * Reconnects on disconnect with exponential backoff.
 */
export function useWebSocket(
  url: string,
  onMessage: (msg: SyncMessage) => void,
  onStatusChange?: (connected: boolean) => void,
) {
  const wsRef = useRef<WebSocket | null>(null);
  const retryRef = useRef(0);
  const maxRetry = 7; // 2^7 * 100ms = ~12.8s max backoff

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      retryRef.current = 0;
      onStatusChange?.(true);
    };

    ws.onmessage = (event) => {
      try {
        const msg: SyncMessage = JSON.parse(event.data);
        onMessage(msg);
      } catch {
        // Ignore malformed messages
      }
    };

    ws.onclose = () => {
      onStatusChange?.(false);
      wsRef.current = null;
      // Exponential backoff: 100ms, 200ms, 400ms, ...
      const delay = Math.min(100 * Math.pow(2, retryRef.current), 30000);
      retryRef.current = Math.min(retryRef.current + 1, maxRetry);
      setTimeout(connect, delay);
    };

    ws.onerror = () => {
      // onclose will fire after this, triggering reconnect
    };
  }, [url, onMessage, onStatusChange]);

  useEffect(() => {
    connect();
    return () => {
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [connect]);
}
