import { useEffect, useRef, useCallback } from 'react';
import type { SyncMessage } from '../types';

/**
 * Manages a WebSocket connection to the md-kanban server.
 * Reconnects on disconnect with exponential backoff.
 *
 * Uses refs for callbacks to avoid re-creating the WebSocket when
 * onMessage/onStatusChange change (e.g. when currentFile updates).
 * Without refs, the useEffect cleanup races with the new connection,
 * causing "WebSocket is closed before the connection is established".
 */
export function useWebSocket(
  url: string,
  onMessage: (msg: SyncMessage) => void,
  onStatusChange?: (connected: boolean) => void,
) {
  const wsRef = useRef<WebSocket | null>(null);
  const retryRef = useRef(0);
  const maxRetry = 7; // 2^7 * 100ms = ~12.8s max backoff

  // Stable refs so connect() identity doesn't change when callbacks do
  const onMessageRef = useRef(onMessage);
  const onStatusChangeRef = useRef(onStatusChange);
  onMessageRef.current = onMessage;
  onStatusChangeRef.current = onStatusChange;

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      retryRef.current = 0;
      onStatusChangeRef.current?.(true);
    };

    ws.onmessage = (event) => {
      try {
        const msg: SyncMessage = JSON.parse(event.data);
        onMessageRef.current(msg);
      } catch {
        // Ignore malformed messages
      }
    };

    ws.onclose = () => {
      onStatusChangeRef.current?.(false);
      wsRef.current = null;
      // Exponential backoff: 100ms, 200ms, 400ms, ...
      const delay = Math.min(100 * Math.pow(2, retryRef.current), 30000);
      retryRef.current = Math.min(retryRef.current + 1, maxRetry);
      setTimeout(connect, delay);
    };

    ws.onerror = () => {
      // onclose will fire after this, triggering reconnect
    };
  }, [url]);

  useEffect(() => {
    connect();
    return () => {
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [connect]);
}
