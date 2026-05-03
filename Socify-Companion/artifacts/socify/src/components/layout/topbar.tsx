import { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { Bell, Search, CheckCheck, ExternalLink, Command } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useListNotifications, getListNotificationsQueryKey } from "@workspace/api-client-react";
import { useStore } from "@/store/use-store";
import { useSocket } from "@/hooks/useSocket";
import { CommandPalette } from "@/components/common/command-palette";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

export function Topbar() {
  const { workspaceId, token } = useStore();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [cmdOpen, setCmdOpen] = useState(false);

  const { data: notifications } = useListNotifications(
    { workspaceId, unreadOnly: false },
    { query: { enabled: !!workspaceId, queryKey: getListNotificationsQueryKey({ workspaceId, unreadOnly: false }) } }
  );

  const unreadCount = notifications?.filter(n => !n.isRead).length ?? 0;
  const recentNotifs = (notifications ?? []).slice(0, 6);

  const { socket } = useSocket(workspaceId ?? 0);

  useEffect(() => {
    if (!socket) return;
    const handler = () => {
      queryClient.invalidateQueries({ queryKey: getListNotificationsQueryKey({ workspaceId, unreadOnly: false }) });
      queryClient.invalidateQueries({ queryKey: getListNotificationsQueryKey({ workspaceId, unreadOnly: true }) });
    };
    socket.on("notification:new", handler);
    return () => { socket.off("notification:new", handler); };
  }, [socket, workspaceId, queryClient]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") { e.preventDefault(); setCmdOpen(v => !v); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const markRead = async (id: number) => {
    await fetch(`/api/notifications/${id}/read`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    queryClient.invalidateQueries({ queryKey: getListNotificationsQueryKey({ workspaceId, unreadOnly: false }) });
  };

  const markAllRead = async () => {
    await fetch("/api/notifications/read-all", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ workspaceId }),
    });
    queryClient.invalidateQueries({ queryKey: getListNotificationsQueryKey({ workspaceId, unreadOnly: false }) });
  };

  return (
    <>
      <CommandPalette open={cmdOpen} onClose={() => setCmdOpen(false)} />

      <header className="h-16 border-b border-border bg-background flex items-center justify-between px-6 flex-shrink-0">
        <button
          onClick={() => setCmdOpen(true)}
          className="w-80 flex items-center gap-2.5 h-9 px-3 rounded-lg bg-muted/50 border border-transparent hover:border-border transition-colors text-muted-foreground text-sm"
        >
          <Search className="w-3.5 h-3.5 flex-shrink-0" />
          <span className="flex-1 text-left">Search anything…</span>
          <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded border border-border bg-background px-1.5 py-0.5 text-[10px] font-mono">
            <Command className="w-2.5 h-2.5" />K
          </kbd>
        </button>

        <div className="flex items-center gap-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="w-5 h-5 text-muted-foreground" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-primary rounded-full ring-2 ring-background" />
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-96 p-0">
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-sm">Notifications</h3>
                  {unreadCount > 0 && (
                    <Badge className="h-4 px-1.5 text-[10px] bg-primary/20 text-primary border-primary/30">{unreadCount}</Badge>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {unreadCount > 0 && (
                    <button onClick={markAllRead} className="text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors">
                      <CheckCheck className="w-3 h-3" /> Mark all read
                    </button>
                  )}
                </div>
              </div>

              <div className="max-h-[380px] overflow-y-auto">
                {recentNotifs.length === 0 ? (
                  <div className="py-10 text-center text-sm text-muted-foreground">
                    <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    No notifications yet
                  </div>
                ) : (
                  recentNotifs.map(n => (
                    <div
                      key={n.id}
                      onClick={() => { if (!n.isRead) markRead(n.id); }}
                      className={cn(
                        "flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors border-b border-border last:border-0",
                        !n.isRead ? "bg-primary/5 hover:bg-primary/10" : "hover:bg-muted/50"
                      )}
                    >
                      {!n.isRead && <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />}
                      {n.isRead && <span className="w-1.5 h-1.5 flex-shrink-0" />}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold truncate">{n.title}</p>
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{n.message}</p>
                        <p className="text-[10px] text-muted-foreground/60 mt-1">
                          {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <DropdownMenuSeparator />
              <div className="p-2">
                <button
                  onClick={() => setLocation("/notifications")}
                  className="w-full text-xs text-center text-muted-foreground hover:text-foreground py-1.5 flex items-center justify-center gap-1 transition-colors"
                >
                  View all notifications <ExternalLink className="w-3 h-3" />
                </button>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button onClick={() => setLocation("/composer")}>
            Create Post
          </Button>
        </div>
      </header>
    </>
  );
}
