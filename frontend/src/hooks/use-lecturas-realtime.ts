'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import api from '@/lib/api';

interface LecturasRealtimeResult {
  latest: any | null;
  history: any[];
  connected: boolean;
  loading: boolean;
}

interface TimeRangeOptions {
  mode: 'live' | 'historical';
  desde?: Date;
  hasta?: Date;
  limit?: number;
}

export function useLecturasRealtime(
  unidadId: string | null,
  timeRange?: TimeRangeOptions,
): LecturasRealtimeResult {
  const [latest, setLatest] = useState<any | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const isLive = !timeRange || timeRange.mode === 'live';

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
        // Only append to history in live mode
        if (isLive) {
          setHistory((prev) => {
            const updated = [...prev, data];
            return updated.slice(-50);
          });
        }
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
  }, [unidadId, isLive]);

  // Fetch historical data and manage WS connection
  useEffect(() => {
    if (!unidadId) return;

    const params = new URLSearchParams({ unidadProduccionId: unidadId });

    if (timeRange?.mode === 'historical' && timeRange.desde && timeRange.hasta) {
      params.set('desde', timeRange.desde.toISOString());
      params.set('hasta', timeRange.hasta.toISOString());
      params.set('limit', String(timeRange.limit ?? 500));
    } else {
      params.set('limit', '50');
    }

    setLoading(true);

    api
      .get(`/api/lecturas?${params.toString()}`)
      .then((res) => {
        const items = res.data.items as any[];
        // API returns DESC order, charts need ASC
        const reversed = [...items].reverse();
        setHistory(reversed);
        if (reversed.length > 0) {
          setLatest(reversed[reversed.length - 1]);
        }
      })
      .catch(() => {
        // silent fail — will still get live data
      })
      .finally(() => {
        setLoading(false);
        // Only connect WS on first mount (handled below)
      });
  }, [unidadId, timeRange?.mode, timeRange?.desde?.getTime(), timeRange?.hasta?.getTime(), timeRange?.limit]);

  // WS connection — always connect for live gauge updates
  useEffect(() => {
    if (!unidadId) return;

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

  return { latest, history, connected, loading };
}
