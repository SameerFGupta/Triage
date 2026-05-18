import { useState, useEffect, useCallback, useRef } from 'react';

export function useWebSocket(url) {
  const [status, setStatus] = useState('disconnected');
  const [lastMessage, setLastMessage] = useState(null);

  const wsRef = useRef(null);
  const reconnectCountRef = useRef(0);
  const reconnectTimeoutRef = useRef(null);

  const MAX_RETRIES = 5;
  const INITIAL_BACKOFF = 500;

  useEffect(() => {
    if (!url) return;

    const connect = () => {
      setStatus('connecting');
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        setStatus('connected');
        reconnectCountRef.current = 0; // Reset retries on successful connection
      };

      ws.onmessage = (event) => {
        setLastMessage(event);
      };

      ws.onclose = () => {
        if (reconnectCountRef.current < MAX_RETRIES) {
          setStatus('connecting'); // Reconnecting
          const backoff = INITIAL_BACKOFF * Math.pow(2, reconnectCountRef.current);
          reconnectCountRef.current += 1;

          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, backoff);
        } else {
          setStatus('disconnected');
        }
      };

      ws.onerror = () => {
        // onerror is usually followed by onclose, where reconnection logic resides
        // so we do not need to do much here except maybe logging
      };
    };

    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.onclose = null; // Prevent reconnection attempt on unmount
        wsRef.current.close();
      }
    };
  }, [url]);

  const send = useCallback((data) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(typeof data === 'string' ? data : JSON.stringify(data));
    }
  }, []);

  return { status, send, lastMessage };
}

export default useWebSocket;
