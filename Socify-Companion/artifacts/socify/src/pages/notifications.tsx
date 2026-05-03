import { useState } from "react";
import { useStore } from "@/store/use-store";
import { useListNotifications, getListNotificationsQueryKey } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Bell, Check, CheckCheck, Zap, MessageSquare, TrendingUp, Users, Calendar, Star, AlertCircle, Info } from "lucide-react";
import { formatDistanceToNow, isToday, isYesterday, isThisWeek } from "date-fns";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

const TYPE_META: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  post_published:    { icon: Zap,          color: "text-indigo-400 bg-indigo-400/10",  label: "Post" },
  new_message:       { icon: MessageSquare, color: "text-blue-400 bg-blue-400/10",    label: "Message" },
  weekly_digest:     { icon: TrendingUp,   color: "text-purple-400 bg-purple-400/10", label: "Report" },
  lead_scored:       { icon: Star,         color: "text-amber-400 bg-amber-400/10",   label: "Lead" },
  team_invite:       { icon: Users,        color: "text-green-400 bg-green-400/10",   label: "Team" },
  scheduled_post:    { icon: Calendar,     color: "text-sky-400 bg-sky-400/10",       label: "Schedule" },
  mention:           { icon: MessageSquare, color: "text-pink-400 bg-pink-400/10",    label: "Mention" },
  alert:             { icon: AlertCircle,  color: "text-red-400 bg-red-400/10",       label: "Alert" },
  system:            { icon: Info,         color: "text-zinc-400 bg-zinc-400/10",     label: "System" },
};

function getTypeMeta(type: string) {
  return TYPE_META[type] ?? TYPE_META["system"];
}

function groupNotifications(notifications: any[]) {
  const groups: Record<string, any[]> = { Today: [], Yesterday: [], "This Week": [], Older: [] };
  for (const n of notifications) {
    const d = new Date(n.createdAt);
    if (isToday(d)) groups["Today"].push(n);
    else if (isYesterday(d)) groups["Yesterday"].push(n);
    else if (isThisWeek(d)) groups["This Week"].push(n);
    else groups["Older"].push(n);
  }
  return groups;
}

export default function Notifications() {
  const { workspaceId } = useStore();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [unreadOnly, setUnreadOnly] = useState(false);

  const { data: notifications, isLoading } = useListNotifications(
    { workspaceId, unreadOnly },
    { query: { enabled: !!workspaceId, queryKey: getListNotificationsQueryKey({ workspaceId, unreadOnly }) } }
  );

  const unreadCount = notifications?.filter(n => !n.isRead).length ?? 0;
  const grouped = groupNotifications(notifications ?? []);

  const markRead = async (id: number) => {
    await fetch(`/api/notifications/${id}/read`, {
      method: "POST",
      headers: { Authorization: `Bearer ${localStorage.getItem("socify_token")}` },
    });
    queryClient.invalidateQueries({ queryKey: getListNotificationsQueryKey({ workspaceId, unreadOnly }) });
  };

  const markAllRead = async () => {
    await fetch("/api/notifications/read-all", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("socify_token")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ workspaceId }),
    });
    queryClient.invalidateQueries({ queryKey: getListNotificationsQueryKey({ workspaceId, unreadOnly }) });
    queryClient.invalidateQueries({ queryKey: getListNotificationsQueryKey({ workspaceId, unreadOnly: false }) });
    toast({ title: "All notifications marked as read" });
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in duration-300">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            Notifications
            {unreadCount > 0 && (
              <Badge className="bg-primary/20 text-primary border-primary/30">{unreadCount} unread</Badge>
            )}
          </h1>
          <p className="text-muted-foreground mt-2">Stay on top of everything happening in your workspace.</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Switch id="unread-only" checked={unreadOnly} onCheckedChange={setUnreadOnly} />
            <Label htmlFor="unread-only" className="text-sm cursor-pointer">Unread only</Label>
          </div>
          {unreadCount > 0 && (
            <Button variant="outline" size="sm" onClick={markAllRead}>
              <CheckCheck className="w-4 h-4 mr-2" />
              Mark all read
            </Button>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}
        </div>
      ) : (notifications?.length ?? 0) === 0 ? (
        <Card className="bg-card border-border">
          <CardContent className="p-16 flex flex-col items-center text-center text-muted-foreground">
            <Bell className="w-14 h-14 mb-4 opacity-30" />
            <p className="font-semibold text-lg text-foreground">{unreadOnly ? "No unread notifications" : "All caught up!"}</p>
            <p className="text-sm mt-1 max-w-xs">{unreadOnly ? "Toggle off 'Unread only' to see all notifications." : "New activity from your workspace will appear here."}</p>
            {unreadOnly && <Button variant="outline" size="sm" className="mt-4" onClick={() => setUnreadOnly(false)}>Show all</Button>}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {Object.entries(grouped).map(([group, items]) => {
            if (items.length === 0) return null;
            return (
              <div key={group}>
                <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">{group}</h2>
                <div className="space-y-2">
                  {items.map(notification => {
                    const meta = getTypeMeta(notification.type);
                    const Icon = meta.icon;
                    return (
                      <div
                        key={notification.id}
                        className={`flex items-start gap-4 p-4 rounded-xl border transition-all cursor-pointer group ${
                          !notification.isRead
                            ? "bg-primary/5 border-primary/20 hover:border-primary/40"
                            : "bg-card border-border hover:border-border/80"
                        }`}
                        onClick={() => !notification.isRead && markRead(notification.id)}
                      >
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${meta.color}`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <p className="text-sm font-semibold flex items-center gap-2">
                                {notification.title}
                                {!notification.isRead && (
                                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary" />
                                )}
                              </p>
                              <p className="text-sm text-muted-foreground mt-0.5 leading-relaxed">{notification.message}</p>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <span className="text-xs text-muted-foreground whitespace-nowrap">
                                {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                              </span>
                              {!notification.isRead && (
                                <button
                                  className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-muted transition-all"
                                  onClick={e => { e.stopPropagation(); markRead(notification.id); }}
                                  title="Mark as read"
                                >
                                  <Check className="w-3.5 h-3.5 text-muted-foreground" />
                                </button>
                              )}
                            </div>
                          </div>
                          <div className="mt-1.5">
                            <Badge variant="outline" className={`text-[10px] h-4 px-1.5 border-0 ${meta.color}`}>
                              {meta.label}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
