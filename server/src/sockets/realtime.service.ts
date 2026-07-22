import { Server as SocketIOServer, Socket } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import http from "http";
import { AuthService } from "../modules/auth/auth.service.js";
import { TokenBlacklistService } from "../modules/auth/tokenblacklist.service.js";
import { RealtimeEvent } from "../types/socket-events.js";
import connectRedis from "../config/redis.js";

import GuestSession from "../models/guestsession.model.js";
import QRSession from "../models/qrsession.model.js";

export class RealtimeService {
  private static io: SocketIOServer | null = null;

  static initialize(server: http.Server): SocketIOServer {
    const clientUrl = process.env.CLIENT_URL || "*";

    this.io = new SocketIOServer(server, {
      cors: {
        origin: clientUrl === "*" ? "*" : [clientUrl],
        methods: ["GET", "POST"],
        credentials: true
      }
    });

    connectRedis().then((pubClient) => {
      if (pubClient && pubClient.isOpen) {
        const subClient = pubClient.duplicate();
        subClient.connect().then(() => {
          this.io?.adapter(createAdapter(pubClient, subClient));
          console.log("[RealtimeService] Socket.IO Redis Adapter configured successfully.");
        }).catch((err) => {
          console.error("[RealtimeService] Failed to connect Redis subClient for adapter:", err);
        });
      }
    }).catch((err) => {
      console.warn("[RealtimeService] Failed to configure Redis Adapter (running in standalone mode):", err.message);
    });

    this.io.use(async (socket: Socket, next) => {
      try {
        const token = socket.handshake.auth?.token || socket.handshake.query?.token;

        if (!token) {
          return next(new Error("Authentication error: No token provided"));
        }

        if (typeof token === "string" && (token.startsWith("GUEST-SESS-") || token.startsWith("WEB-SESS-"))) {
          const guestSession = await GuestSession.findOne({ guestSessionToken: token, status: "ACTIVE" });
          if (!guestSession) {
            return next(new Error("Authentication error: Invalid or expired guest session"));
          }
          const qrSession = await QRSession.findOne({ _id: guestSession.qrsessionId, status: "ACTIVE" });
          if (!qrSession) {
            return next(new Error("Authentication error: QR Table session is closed"));
          }

          socket.data = {
            role: "CUSTOMER",
            sessionId: qrSession._id.toString(),
            tenantId: qrSession.tenantId.toString(),
            outletId: qrSession.outletId.toString()
          };
          return next();
        }

        const isBlacklisted = await TokenBlacklistService.isBlacklisted(token);
        if (isBlacklisted) {
          return next(new Error("Authentication error: Token is blacklisted"));
        }

        const decoded = AuthService.verifyAccessToken(token);
        if (!decoded) {
          return next(new Error("Authentication error: Invalid or expired token"));
        }

        socket.data = {
          userId: decoded.userId,
          tenantId: decoded.tenantId,
          restaurantId: decoded.restaurantId,
          outletId: decoded.outletId,
          outletIds: decoded.outletIds,
          email: decoded.email,
          role: decoded.role,
          status: decoded.status,
          sessionId: (decoded as any).sessionId || null
        };

        next();
      } catch (error: any) {
        next(new Error(`Authentication error: ${error.message}`));
      }
    });

    this.io.on("connection", (socket: Socket) => {
      const { tenantId, outletId, role, sessionId } = socket.data;

      if (tenantId && outletId && role !== "CUSTOMER") {
        const outletRoom = `tenant:${tenantId}:outlet:${outletId}`;
        socket.join(outletRoom);
      }

      if (sessionId) {
        const sessionRoom = `session:${sessionId}`;
        socket.join(sessionRoom);
      }

      socket.on("join_session", (data: { sessionId: string }) => {
        if (data?.sessionId) {
          const sessionRoom = `session:${data.sessionId}`;
          socket.join(sessionRoom);
          socket.emit("joined_session", { sessionId: data.sessionId });
        }
      });

      socket.on("leave_session", (data: { sessionId: string }) => {
        if (data?.sessionId) {
          const sessionRoom = `session:${data.sessionId}`;
          socket.leave(sessionRoom);
          socket.emit("left_session", { sessionId: data.sessionId });
        }
      });

      socket.on("join_kitchen", (data: { outletId: string }) => {
        if (data?.outletId) {
          const kitchenRoom = `kitchen:${data.outletId}`;
          socket.join(kitchenRoom);
          socket.emit("joined_kitchen", { outletId: data.outletId });
        }
      });

      socket.on("leave_kitchen", (data: { outletId: string }) => {
        if (data?.outletId) {
          const kitchenRoom = `kitchen:${data.outletId}`;
          socket.leave(kitchenRoom);
          socket.emit("left_kitchen", { outletId: data.outletId });
        }
      });

      socket.on("disconnect", () => {

      });
    });

    return this.io;
  }

  static getIO(): SocketIOServer {
    if (!this.io) {
      throw new Error("RealtimeService is not initialized. Please call initialize first.");
    }
    return this.io;
  }

  static sendToOutlet(tenantId: string | object, outletId: string | object, event: RealtimeEvent, payload: any): void {
    if (!this.io) return;
    const room = `tenant:${tenantId.toString()}:outlet:${outletId.toString()}`;
    this.io.to(room).emit(event, payload);
  }

  static sendToSession(sessionId: string | object, event: RealtimeEvent, payload: any): void {
    if (!this.io) return;
    const room = `session:${sessionId.toString()}`;
    this.io.to(room).emit(event, payload);
  }

  static sendToKitchen(outletId: string | object, event: RealtimeEvent, payload: any): void {
    if (!this.io) return;
    const room = `kitchen:${outletId.toString()}`;
    this.io.to(room).emit(event, payload);
  }
}
