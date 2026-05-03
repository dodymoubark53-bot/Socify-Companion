import { Server, type Socket } from "socket.io";
import { logger } from "./logger";

let _io: Server | null = null;

export function initSocket(httpServer: any): Server {
  _io = new Server(httpServer, {
    cors: { origin: "*", methods: ["GET", "POST"] },
    path: "/api/socket.io",
  });

  _io.on("connection", (socket: Socket) => {
    logger.info({ socketId: socket.id }, "Socket.io client connected");

    socket.on("join_workspace", (workspaceId: number) => {
      socket.join(`workspace:${workspaceId}`);
      logger.info({ socketId: socket.id, workspaceId }, "Client joined workspace room");
    });

    socket.on("leave_workspace", (workspaceId: number) => {
      socket.leave(`workspace:${workspaceId}`);
    });

    socket.on("disconnect", () => {
      logger.info({ socketId: socket.id }, "Socket.io client disconnected");
    });
  });

  logger.info("Socket.io server initialized");
  return _io;
}

export function getIo(): Server | null {
  return _io;
}

export function emitToWorkspace(workspaceId: number, event: string, data: unknown) {
  if (!_io) return;
  _io.to(`workspace:${workspaceId}`).emit(event, data);
}
