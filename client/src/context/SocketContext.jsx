import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { io } from 'socket.io-client';
import useAuth from '../hooks/useAuth';

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const { user, isAuthenticated } = useAuth();
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState(null);

  const connectSocket = useCallback(() => {
    if (!isAuthenticated || !user) return;

    const token = localStorage.getItem('accessToken') || localStorage.getItem('sessionToken');
    const socketUrl = import.meta.env.VITE_WS_URL || window.location.origin;

    console.log('[SocketContext] Connecting websocket...', socketUrl);
    const newSocket = io(socketUrl, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    newSocket.on('connect', () => {
      console.log('[SocketContext] WebSocket connected! SocketId:', newSocket.id);
      setConnected(true);

      // Join kitchen room if staff/manager/owner has outletId
      const outletId = user.outletId || (user.outletIds && user.outletIds[0]);
      if (outletId && user.role !== 'CUSTOMER') {
        newSocket.emit('join_kitchen', { outletId });
      }
    });

    newSocket.on('disconnect', (reason) => {
      console.log('[SocketContext] WebSocket disconnected:', reason);
      setConnected(false);
    });

    newSocket.on('connect_error', (error) => {
      console.error('[SocketContext] Connection error:', error.message);
      setConnected(false);
    });

    // Listen to all RealtimeEvents and cache the last one to broadcast to local listeners
    const events = [
      'TABLE_OCCUPIED', 'TABLE_AVAILABLE', 'TABLE_RESERVED', 'TABLE_STATUS_CHANGED',
      'TABLE_TRANSFERRED', 'TABLE_MERGED', 'TABLE_UNMERGED', 'TABLE_CLEANING_STARTED',
      'TABLE_CLEANING_COMPLETED', 'WAITER_TASK_CREATED', 'WAITER_TASK_ASSIGNED',
      'WAITER_TASK_ACKNOWLEDGED', 'WAITER_TASK_IN_PROGRESS', 'WAITER_TASK_COMPLETED',
      'WAITER_TASK_CANCELLED', 'WAITER_TASK_ESCALATED', 'ITEM_FIRE_REQUESTED',
      'ORDER_CREATED', 'ORDER_STATUS_CHANGED', 'QR_ASSISTANCE_REQUESTED',
      'CART_CREATED', 'CART_UPDATED', 'CHECKOUT_STARTED', 'INVENTORY_CHANGED',
      'MENU_CHANGED', 'SEAT_MOVED', 'SEAT_SWAPPED', 'WAITER_CHANGED',
      'SESSION_CLOSED', 'SEAT_ADDED', 'SEAT_REMOVED', 'GUEST_COUNT_CHANGED',
      'ITEM_FIRED', 'ITEM_HELD', 'COURSE_FIRED', 'BILL_REQUESTED',
      'BILL_SPLIT_CREATED', 'BILL_SETTLED'
    ];

    events.forEach(event => {
      newSocket.on(event, (payload) => {
        console.log(`[SocketContext] Received event: ${event}`, payload);
        setLastMessage({ event, payload, timestamp: Date.now() });
      });
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [isAuthenticated, user]);

  useEffect(() => {
    const cleanup = connectSocket();
    return () => {
      if (cleanup) cleanup();
    };
  }, [connectSocket]);

  const joinSession = useCallback((sessionId) => {
    if (socket && connected) {
      socket.emit('join_session', { sessionId });
    }
  }, [socket, connected]);

  const leaveSession = useCallback((sessionId) => {
    if (socket && connected) {
      socket.emit('leave_session', { sessionId });
    }
  }, [socket, connected]);

  const joinKitchen = useCallback((outletId) => {
    if (socket && connected) {
      socket.emit('join_kitchen', { outletId });
    }
  }, [socket, connected]);

  const leaveKitchen = useCallback((outletId) => {
    if (socket && connected) {
      socket.emit('leave_kitchen', { outletId });
    }
  }, [socket, connected]);

  return (
    <SocketContext.Provider value={{
      socket,
      connected,
      lastMessage,
      joinSession,
      leaveSession,
      joinKitchen,
      leaveKitchen,
      reconnect: connectSocket
    }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  const context = useContext(SocketContext);
  if (context === undefined) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
}
