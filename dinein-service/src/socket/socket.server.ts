import type { Server as HttpServer } from 'node:http';
import { Server } from 'socket.io';
import { getEnv } from '../config/env.config.js';
import { SOCKET_EVENTS, SOCKET_ROOMS } from '../constants/socket-events.constants.js';
import { logger } from '../utils/logger.js';

let io: any = null;

export const initializeSocketServer = (httpServer: HttpServer): any => {
  const env = getEnv();

  io = new Server(httpServer, {
    cors: {
      origin: env.SOCKET_CORS_ORIGIN,
      credentials: true,
    },
  });

  io.on(SOCKET_EVENTS.CONNECT, (socket: { id: string; join: (room: string) => void; leave: (room: string) => void; on: (event: string, handler: (value: string) => void) => void }) => {
    logger.info('Socket client connected', { socketId: socket.id });

    socket.on(SOCKET_EVENTS.JOIN_OUTLET, (outletId: string) => {
      socket.join(SOCKET_ROOMS.outlet(outletId));
    });

    socket.on(SOCKET_EVENTS.JOIN_TABLE, (tableId: string) => {
      socket.join(SOCKET_ROOMS.table(tableId));
    });

    socket.on(SOCKET_EVENTS.JOIN_SESSION, (sessionId: string) => {
      socket.join(SOCKET_ROOMS.session(sessionId));
    });

    socket.on(SOCKET_EVENTS.LEAVE_TABLE, (tableId: string) => {
      socket.leave(SOCKET_ROOMS.table(tableId));
    });
  });

  return io;
};

export const getIo = (): any => io;

export const emitOutletEvent = (outletId: string, event: string, payload: unknown): void => {
  io?.to(SOCKET_ROOMS.outlet(outletId)).emit(event, payload);
};

export const emitTableEvent = (tableId: string, event: string, payload: unknown): void => {
  io?.to(SOCKET_ROOMS.table(tableId)).emit(event, payload);
};

export const emitSessionEvent = (sessionId: string, event: string, payload: unknown): void => {
  io?.to(SOCKET_ROOMS.session(sessionId)).emit(event, payload);
};
