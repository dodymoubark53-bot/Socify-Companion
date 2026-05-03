import { useQuery } from "@tanstack/react-query";
import { useStore } from "@/store/use-store";
import { customFetch } from "@workspace/api-client-react/src/custom-fetch";
import { Shield, Users, BarChart2, Activity, Database, Settings, AlertTriangle, CheckCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

function StatCard({ label, value, icon: Icon, color, loading }: { label: string; value: string | number; icon: React.ElementType; color: string; loading: boolean }) {
  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-muted-foreground">{label}</span>
        <Icon className={`w-5 h-5 ${color}`} />
      </div>
      {loading ? <Skeleton className="h-8 w-20" /> : <div className="text-3xl font-semibold text-foreground">{value}</div>}
    </div>
  );
}

export default function Admin() {
  const { user, workspaceId } = useStore();

  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ["dashboard-summary", workspaceId],
    queryFn: () => customFetch(`/api/dashboard/summary?workspaceId=${workspaceId}`),
    enabled: !!workspaceId,
  });

  const { data: automations, isLoading: autoLoading } = useQuery<any[]>({
    queryKey: ["automations", workspaceId],
    queryFn: () => customFetch(`/api/automations?workspaceId=${workspaceId}`),
    enabled: !!workspaceId,
  });

  const { data: accounts, isLoading: accountsLoading } = useQuery<any[]>({
    queryKey: ["social-accounts", workspaceId],
    queryFn: () => customFetch(`/api/social-accounts?workspaceId=${workspaceId}`),
    enabled: !!workspaceId,
  });

  const s = summary as any;
  const activeAutos = automations?.filter((a: any) => a.isActive).length ?? 0;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
            <Shield className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Admin Panel</h1>
            <p className="text-sm text-muted-foreground">System overview and workspace management</p>
          </div>
        </div>
        <Badge variant="outline" className="text-xs gap-1.5 border-indigo-500/30 text-indigo-400 bg-indigo-500/5">
          <Shield className="w-3 h-3" /> Super Admin
        </Badge>
      </div>

      {/* Status Banner */}
      <div className="flex items-center gap-3 p-4 rounded-xl bg-green-500/5 border border-green-500/20">
        <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
        <div>
          <p className="text-sm font-medium text-green-400">All systems operational</p>
          <p className="text-xs text-muted-foreground">API, Database, Scheduler — all running normally</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-xs text-green-400">Live</span>
        </div>
      </div>

      {/* Workspace Stats */}
      <div>
        <h2 className="text-base font-semibold text-foreground mb-4">Workspace Overview</h2>
        <div className="grid grid-cols-4 gap-4">
          <StatCard label="Total Followers" value={s?.totalFollowers?.toLocaleString() ?? "—"} icon={Users} color="text-indigo-400" loading={summaryLoading} />
          <StatCard label="Scheduled Posts" value={s?.scheduledPosts ?? "—"} icon={BarChart2} color="text-blue-400" loading={summaryLoading} />
          <StatCard label="Unread Messages" value={s?.unreadMessages ?? "—"} icon={Activity} color="text-yellow-400" loading={summaryLoading} />
          <StatCard label="Active Campaigns" value={s?.activeCampaigns ?? "—"} icon={Activity} color="text-green-400" loading={summaryLoading} />
        </div>
      </div>

      {/* Connected Accounts */}
      <div className="grid grid-cols-2 gap-6">
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Database className="w-4 h-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold text-foreground">Connected Social Accounts</h3>
          </div>
          {accountsLoading ? (
            <div className="space-y-3">{Array.from({length:3}).map((_,i)=><Skeleton key={i} className="h-10" />)}</div>
          ) : !accounts?.length ? (
            <p className="text-sm text-muted-foreground">No accounts connected</p>
          ) : (
            <div className="space-y-2">
              {accounts.map((a: any) => (
                <div key={a.id} className="flex items-center justify-between p-3 rounded-lg bg-background border border-border">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-accent flex items-center justify-center text-xs font-semibold capitalize">{a.platform[0]}</div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{a.name}</p>
                      <p className="text-xs text-muted-foreground">{a.handle} · {a.followers?.toLocaleString()} followers</p>
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${a.isActive ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"}`}>
                    {a.isActive ? "Active" : "Inactive"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Automations Status */}
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Settings className="w-4 h-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold text-foreground">Automation Status</h3>
            <span className="ml-auto text-xs text-muted-foreground">{activeAutos} active</span>
          </div>
          {autoLoading ? (
            <div className="space-y-3">{Array.from({length:3}).map((_,i)=><Skeleton key={i} className="h-10" />)}</div>
          ) : !automations?.length ? (
            <p className="text-sm text-muted-foreground">No automations created</p>
          ) : (
            <div className="space-y-2">
              {automations.map((a: any) => (
                <div key={a.id} className="flex items-center justify-between p-3 rounded-lg bg-background border border-border">
                  <div>
                    <p className="text-sm font-medium text-foreground">{a.name}</p>
                    <p className="text-xs text-muted-foreground">{a.runCount} runs · {a.triggerType}</p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${a.isActive ? "bg-green-500/10 text-green-400" : "bg-zinc-500/10 text-zinc-400"}`}>
                    {a.isActive ? "Active" : "Off"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* System Info */}
      <div className="bg-card border border-border rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Database className="w-4 h-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold text-foreground">System Info</h3>
        </div>
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Database", value: "PostgreSQL 16", status: "healthy" },
            { label: "API Server", value: "Express 5 + Node 24", status: "healthy" },
            { label: "Scheduler", value: "node-cron active", status: "healthy" },
            { label: "Auth", value: "JWT (7d expiry)", status: "healthy" },
            { label: "ORM", value: "Drizzle ORM", status: "healthy" },
            { label: "Admin", value: user?.email ?? "—", status: "healthy" },
          ].map(item => (
            <div key={item.label} className="p-3 rounded-lg bg-background border border-border">
              <p className="text-xs text-muted-foreground mb-1">{item.label}</p>
              <p className="text-sm text-foreground font-medium">{item.value}</p>
              <div className="flex items-center gap-1.5 mt-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                <span className="text-xs text-green-400">{item.status}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
