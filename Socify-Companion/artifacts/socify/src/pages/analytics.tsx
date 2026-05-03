import { useState, useMemo } from "react";
import { useStore } from "@/store/use-store";
import { useGetAnalyticsOverview, getGetAnalyticsOverviewQueryKey, useGetEngagementTimeline, getGetEngagementTimelineQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, BarChart, Bar, Cell, Legend
} from "recharts";
import { Users, Eye, MousePointerClick, FileText, ArrowUpRight } from "lucide-react";

const HOURS = ["12am","1","2","3","4","5","6","7","8","9","10","11","12pm","1","2","3","4","5","6","7","8","9","10","11"];
const DAYS = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];

function generateHeatmapData() {
  return DAYS.map(day => ({
    day,
    hours: HOURS.map((hour, h) => ({
      hour,
      value: Math.round(
        Math.max(0, Math.random() * 100 * (h >= 8 && h <= 20 ? 1.5 : 0.3) * (day === "Sat" || day === "Sun" ? 0.6 : 1))
      ),
    })),
  }));
}

function generateCompetitorData() {
  return [
    { name: "Your Brand", followers: 18400, engagement: 4.2, reach: 42000, posts: 28, color: "#6366F1" },
    { name: "Competitor A", followers: 24100, engagement: 2.8, reach: 38000, posts: 45, color: "#F472B6" },
    { name: "Competitor B", followers: 12300, engagement: 5.1, reach: 28000, posts: 19, color: "#34D399" },
    { name: "Competitor C", followers: 31200, engagement: 1.9, reach: 56000, posts: 62, color: "#FB923C" },
  ];
}

function HeatmapChart() {
  const data = useMemo(generateHeatmapData, []);
  const maxVal = Math.max(...data.flatMap(d => d.hours.map(h => h.value)));

  function getColor(value: number) {
    if (value === 0) return "bg-muted/20";
    const intensity = value / maxVal;
    if (intensity > 0.8) return "bg-indigo-500";
    if (intensity > 0.6) return "bg-indigo-500/70";
    if (intensity > 0.4) return "bg-indigo-500/50";
    if (intensity > 0.2) return "bg-indigo-500/30";
    return "bg-indigo-500/15";
  }

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[640px]">
        <div className="flex gap-1 mb-2 pl-12">
          {HOURS.map((h, i) => (
            <div key={i} className="flex-1 text-center text-[9px] text-muted-foreground font-medium" style={{ minWidth: 20 }}>
              {i % 3 === 0 ? h : ""}
            </div>
          ))}
        </div>
        {data.map(row => (
          <div key={row.day} className="flex items-center gap-1 mb-1">
            <div className="w-10 text-right text-xs text-muted-foreground pr-2 font-medium">{row.day}</div>
            {row.hours.map((cell, i) => (
              <div
                key={i}
                className={`flex-1 h-7 rounded transition-all cursor-default group relative ${getColor(cell.value)}`}
                style={{ minWidth: 20 }}
                title={`${row.day} ${cell.hour}: ${cell.value} engagements`}
              >
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 bg-popover border border-border rounded px-2 py-1 text-[10px] whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none z-10 shadow-md">
                  {row.day} {cell.hour}: <strong>{cell.value}</strong>
                </div>
              </div>
            ))}
          </div>
        ))}
        <div className="flex items-center gap-3 mt-4 pl-12">
          <span className="text-xs text-muted-foreground">Less</span>
          {["bg-indigo-500/15","bg-indigo-500/30","bg-indigo-500/50","bg-indigo-500/70","bg-indigo-500"].map((c, i) => (
            <div key={i} className={`w-5 h-5 rounded ${c}`} />
          ))}
          <span className="text-xs text-muted-foreground">More</span>
        </div>
      </div>
    </div>
  );
}

const COMP_METRICS = [
  { key: "followers", label: "Followers" },
  { key: "engagement", label: "Eng. Rate (%)" },
  { key: "reach", label: "Reach" },
  { key: "posts", label: "Posts / Month" },
];

function CompetitorChart() {
  const data = useMemo(generateCompetitorData, []);
  const [metric, setMetric] = useState("followers");

  const metricLabel = COMP_METRICS.find(m => m.key === metric)?.label ?? metric;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Compare your brand against competitors across key metrics</p>
        <Select value={metric} onValueChange={setMetric}>
          <SelectTrigger className="w-[160px] bg-background text-xs h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {COMP_METRICS.map(m => (
              <SelectItem key={m.key} value={m.key}>{m.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="h-[280px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
            <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
            <YAxis
              stroke="hsl(var(--muted-foreground))"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              tickFormatter={v => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}
            />
            <Tooltip
              contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))", borderRadius: "8px" }}
              itemStyle={{ color: "hsl(var(--foreground))" }}
              formatter={(value: any) => [metric === "engagement" ? `${value}%` : value.toLocaleString(), metricLabel]}
            />
            <Bar dataKey={metric} radius={[6, 6, 0, 0]}>
              {data.map((entry, index) => (
                <Cell key={index} fill={entry.color} fillOpacity={entry.name === "Your Brand" ? 1 : 0.65} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2 border-t border-border">
        {data.map(d => (
          <div key={d.name} className="space-y-1">
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }} />
              <span className="text-xs text-muted-foreground">{d.name}</span>
            </div>
            <p className="text-sm font-semibold pl-4">
              {metric === "engagement" ? `${d[metric as keyof typeof d]}%` : (d[metric as keyof typeof d] as number).toLocaleString()}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Analytics() {
  const { workspaceId } = useStore();
  const [period, setPeriod] = useState<"7d" | "30d" | "90d">("30d");

  const { data: overview, isLoading: overviewLoading } = useGetAnalyticsOverview(
    { workspaceId, period },
    { query: { enabled: !!workspaceId, queryKey: getGetAnalyticsOverviewQueryKey({ workspaceId, period }) } }
  );

  const { data: timeline, isLoading: timelineLoading } = useGetEngagementTimeline(
    { workspaceId, period },
    { query: { enabled: !!workspaceId, queryKey: getGetEngagementTimelineQueryKey({ workspaceId, period }) } }
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
          <p className="text-muted-foreground mt-2">Measure your performance and growth.</p>
        </div>
        <Select value={period} onValueChange={(v: any) => setPeriod(v)}>
          <SelectTrigger className="w-[180px] bg-card">
            <SelectValue placeholder="Select period" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">Last 7 Days</SelectItem>
            <SelectItem value="30d">Last 30 Days</SelectItem>
            <SelectItem value="90d">Last 90 Days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {overviewLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32 w-full" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard title="Total Audience" value={overview?.totalFollowers.toLocaleString() || "0"} trend={overview?.followerGrowth || 0} icon={Users} />
          <MetricCard title="Total Reach" value={overview?.totalReach.toLocaleString() || "0"} trend={overview?.reachGrowth || 0} icon={Eye} />
          <MetricCard title="Total Engagement" value={overview?.totalEngagement.toLocaleString() || "0"} trend={overview?.engagementGrowth || 0} icon={MousePointerClick} />
          <MetricCard title="Posts Published" value={overview?.totalPosts.toString() || "0"} trend={overview?.postsGrowth || 0} icon={FileText} />
        </div>
      )}

      <Tabs defaultValue="timeline" className="space-y-4">
        <TabsList className="bg-card border border-border">
          <TabsTrigger value="timeline">Engagement Timeline</TabsTrigger>
          <TabsTrigger value="heatmap">Post Timing Heatmap</TabsTrigger>
          <TabsTrigger value="competitors">Competitor Analysis</TabsTrigger>
        </TabsList>

        <TabsContent value="timeline">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle>Audience & Engagement Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              {timelineLoading ? (
                <Skeleton className="w-full h-[400px]" />
              ) : timeline?.length === 0 ? (
                <div className="h-[400px] flex items-center justify-center text-muted-foreground">
                  Not enough data to display chart.
                </div>
              ) : (
                <div className="h-[400px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={timeline} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorReach" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                      <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false}
                        tickFormatter={val => { const d = new Date(val); return `${d.getMonth() + 1}/${d.getDate()}`; }} />
                      <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false}
                        tickFormatter={v => v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v} />
                      <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))", borderRadius: "8px" }}
                        itemStyle={{ color: "hsl(var(--foreground))" }} />
                      <Area type="monotone" dataKey="reach" stroke="hsl(var(--primary))" strokeWidth={2} fillOpacity={1} fill="url(#colorReach)" name="Reach" />
                      <Line type="monotone" dataKey="engagement" stroke="hsl(var(--chart-2))" strokeWidth={2} dot={false} name="Engagement" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="heatmap">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle>Best Times to Post</CardTitle>
              <p className="text-sm text-muted-foreground">Engagement intensity by day of week and hour</p>
            </CardHeader>
            <CardContent>
              <HeatmapChart />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="competitors">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle>Competitor Benchmarking</CardTitle>
            </CardHeader>
            <CardContent>
              <CompetitorChart />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function MetricCard({ title, value, trend, icon: Icon }: any) {
  return (
    <Card className="bg-card border-border">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-muted-foreground">{title}</span>
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="text-2xl font-bold">{value}</div>
        {trend !== undefined && (
          <div className={`flex items-center text-xs mt-2 font-medium ${trend > 0 ? "text-green-400" : trend < 0 ? "text-red-400" : "text-muted-foreground"}`}>
            {trend > 0 && <ArrowUpRight className="w-3 h-3 mr-1" />}
            {trend < 0 && <ArrowUpRight className="w-3 h-3 mr-1 rotate-90" />}
            {Math.abs(trend)}% from previous period
          </div>
        )}
      </CardContent>
    </Card>
  );
}
