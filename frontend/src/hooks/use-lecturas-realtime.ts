'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

interface LecturasRealtimeResult {
  latest: any | null;
  history: any[];
  connected: boolean;
}

export function useLecturasRealtime(unidadId: string | null): LecturasRealtimeResult {
  const [latest, setLatest] = useState<any | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [connected, setConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttemptsRef = useRef(0);

  const connect = useCallback(() => {
    if (!unidadId) return;

    const wsUrl = `ws://localhost:4000/api/ws/lecturas/${unidadId}`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      reconnectAttemptsRef.current = 0;
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        setLatest(data);
        setHistory((prev) => {
          const updated = [...prev, data];
          return updated.slice(-50);
        });
      } catch {
        // ignore malformed messages
      }
    };

    ws.onclose = () => {
      setConnected(false);
      wsRef.current = null;

      const attempts = reconnectAttemptsRef.current;
      const delay = Math.min(1000 * Math.pow(2, attempts), 30000);
      reconnectAttemptsRef.current = attempts + 1;

      reconnectTimeoutRef.current = setTimeout(connect, delay);
    };

    ws.onerror = () => {
      ws.close();
    };
  }, [unidadId]);

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connect]);

  return { latest, history, connected };
}
