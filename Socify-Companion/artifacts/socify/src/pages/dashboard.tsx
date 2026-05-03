import { useStore } from "@/store/use-store";
import { useGetDashboardSummary, getGetDashboardSummaryQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, TrendingUp, Calendar, CheckCircle2, MessageSquare, Target } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function Dashboard() {
  const { workspaceId } = useStore();
  const { data: summary, isLoading } = useGetDashboardSummary(
    { workspaceId },
    { query: { enabled: !!workspaceId, queryKey: getGetDashboardSummaryQueryKey({ workspaceId }) } }
  );

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64 mt-2" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-2">Here's what's happening across your workspace.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Followers"
          value={summary?.totalFollowers.toLocaleString() || "0"}
          trend={summary?.followerGrowth || 0}
          icon={Users}
        />
        <MetricCard
          title="Avg Engagement Rate"
          value={`${summary?.engagementRate?.toFixed(2) || "0"}%`}
          trend={0.5} // Mock positive trend for demo
          icon={TrendingUp}
        />
        <MetricCard
          title="Scheduled Posts"
          value={summary?.scheduledPosts.toString() || "0"}
          trend={0}
          icon={Calendar}
          neutral
        />
        <MetricCard
          title="Unread Messages"
          value={summary?.unreadMessages.toString() || "0"}
          trend={0}
          icon={MessageSquare}
          danger={summary && summary.unreadMessages > 0}
        />
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
         <Card className="bg-card">
           <CardHeader>
             <CardTitle>Recent Activity</CardTitle>
           </CardHeader>
           <CardContent>
             <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
               <CheckCircle2 className="h-10 w-10 mb-4 opacity-50" />
               <p>All caught up!</p>
               <p className="text-sm">No recent activity to show.</p>
             </div>
           </CardContent>
         </Card>

         <Card className="bg-card">
           <CardHeader>
             <CardTitle>Upcoming Posts</CardTitle>
           </CardHeader>
           <CardContent>
             <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
               <Calendar className="h-10 w-10 mb-4 opacity-50" />
               <p>Your queue is empty</p>
               <p className="text-sm">Schedule a post to see it here.</p>
             </div>
           </CardContent>
         </Card>
      </div>
    </div>
  );
}

function MetricCard({ title, value, trend, icon: Icon, neutral, danger }: any) {
  return (
    <Card className="bg-card border-border">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {!neutral && trend !== undefined && (
          <p className={`text-xs mt-1 font-medium ${trend > 0 ? "text-success" : trend < 0 ? "text-danger" : "text-muted-foreground"}`}>
            {trend > 0 ? "+" : ""}{trend}% from last month
          </p>
        )}
        {danger && (
           <p className="text-xs mt-1 font-medium text-danger">Requires attention</p>
        )}
      </CardContent>
    </Card>
  );
}
