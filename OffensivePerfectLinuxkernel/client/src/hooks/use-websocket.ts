import { useEffect, useRef, useCallback, useState } from "react";
import type { User, MessageWithSender } from "@shared/schema";

interface WebSocketMessage {
  type: 'new_message' | 'typing_status' | 'user_joined' | 'user_left';
  message?: MessageWithSender;
  userId?: string;
  isTyping?: boolean;
  roomId?: string;
}

interface UseWebSocketProps {
  roomId: string | null;
  currentUser?: User;
  onNewMessage?: (message: MessageWithSender) => void;
  onTypingStatus?: (userId: string, isTyping: boolean) => void;
  onUserActivity?: (userId: string, activity: 'joined' | 'left') => void;
}

export function useWebSocket({
  roomId,
  currentUser,
  onNewMessage,
  onTypingStatus,
  onUserActivity
}: UseWebSocketProps) {
  const ws = useRef<WebSocket | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('disconnected');
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  const connect = useCallback(() => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      
      ws.current = new WebSocket(wsUrl);
      setConnectionStatus('connecting');

      ws.current.onopen = () => {
        setConnectionStatus('connected');
        reconnectAttempts.current = 0;
        
        // Join room if we have roomId and user
        if (roomId && currentUser) {
          ws.current?.send(JSON.stringify({
            type: 'join_room',
            roomId,
            userId: currentUser.id
          }));
        }
      };

      ws.current.onmessage = (event) => {
        try {
          const data: WebSocketMessage = JSON.parse(event.data);
          
          switch (data.type) {
            case 'new_message':
              if (data.message) {
                onNewMessage?.(data.message);
              }
              break;
              
            case 'typing_status':
              if (data.userId && data.isTyping !== undefined) {
                onTypingStatus?.(data.userId, data.isTyping);
              }
              break;
              
            case 'user_joined':
            case 'user_left':
              if (data.userId) {
                onUserActivity?.(data.userId, data.type === 'user_joined' ? 'joined' : 'left');
              }
              break;
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      ws.current.onclose = () => {
        setConnectionStatus('disconnected');
        
        // Attempt to reconnect with exponential backoff
        if (reconnectAttempts.current < maxReconnectAttempts) {
          const delay = Math.pow(2, reconnectAttempts.current) * 1000;
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttempts.current++;
            connect();
          }, delay);
        }
      };

      ws.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        setConnectionStatus('disconnected');
      };

    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      setConnectionStatus('disconnected');
    }
  }, [roomId, currentUser, onNewMessage, onTypingStatus, onUserActivity]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    
    if (ws.current) {
      ws.current.close();
      ws.current = null;
    }
    
    setConnectionStatus('disconnected');
  }, []);

  const sendMessage = useCallback((type: string, data: any) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({ type, ...data }));
      return true;
    }
    return false;
  }, []);

  const sendTypingStatus = useCallback((isTyping: boolean) => {
    return sendMessage('typing_status', { isTyping });
  }, [sendMessage]);

  const broadcastNewMessage = useCallback((message: MessageWithSender) => {
    return sendMessage('new_message', { message });
  }, [sendMessage]);

  // Connect when component mounts or room changes
  useEffect(() => {
    if (roomId && currentUser) {
      connect();
    }
    
    return () => {
      disconnect();
    };
  }, [roomId, currentUser?.id, connect, disconnect]);

  // Join new room when roomId changes
  useEffect(() => {
    if (ws.current?.readyState === WebSocket.OPEN && roomId && currentUser) {
      ws.current.send(JSON.stringify({
        type: 'join_room',
        roomId,
        userId: currentUser.id
      }));
    }
  }, [roomId, currentUser?.id]);

  return {
    connectionStatus,
    sendTypingStatus,
    broadcastNewMessage,
    connect,
    disconnect
  };
}