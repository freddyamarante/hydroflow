'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import api from '@/lib/api';

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

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
    const wsProtocol = apiUrl.startsWith('https') ? 'wss' : 'ws';
    const wsHost = apiUrl.replace(/^https?:\/\//, '');
    const wsUrl = `${wsProtocol}://${wsHost}/api/ws/lecturas/${unidadId}`;
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
    if (!unidadId) return;

    const fetchHistorical = async () => {
      try {
        const res = await api.get(`/api/lecturas?unidadProduccionId=${unidadId}&limit=50`);
        const items = res.data.items;
        if (items.length > 0) {
          // Items are DESC, reverse to chronological for the chart
          const reversed = [...items].reverse();
          setHistory(reversed);
          setLatest(reversed[reversed.length - 1]);
        }
      } catch {
        // Historical data is optional, don't block on failure
      }
    };

    fetchHistorical();
    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connect, unidadId]);

  return { latest, history, connected };
}
