import { useEffect, useRef, useCallback } from "react";
import { io, type Socket } from "socket.io-client";
import { useStore } from "@/store/use-store";

let socketInstance: Socket | null = null;

function getSocket(): Socket {
  if (!socketInstance) {
    const base = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";
    socketInstance = io(window.location.origin, {
      path: `${base}/api/socket.io`,
      transports: ["websocket", "polling"],
      autoConnect: false,
    });
  }
  return socketInstance;
}

export function useSocket() {
  const { workspaceId, token } = useStore();
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!token || !workspaceId) return;

    const socket = getSocket();
    socketRef.current = socket;

    if (!socket.connected) {
      socket.auth = { token };
      socket.connect();
    }

    socket.emit("join_workspace", workspaceId);

    return () => {
      socket.emit("leave_workspace", workspaceId);
    };
  }, [token, workspaceId]);

  const on = useCallback(<T = unknown>(event: string, handler: (data: T) => void) => {
    const socket = socketRef.current;
    if (!socket) return () => {};
    socket.on(event, handler);
    return () => { socket.off(event, handler); };
  }, []);

  const emit = useCallback((event: string, data?: unknown) => {
    socketRef.current?.emit(event, data);
  }, []);

  return { socket: socketRef.current, on, emit };
}
