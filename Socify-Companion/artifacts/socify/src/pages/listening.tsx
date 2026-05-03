import { useState } from "react";
import { useStore } from "@/store/use-store";
import { useListMentions, getListMentionsQueryKey, useGetListeningStats, getGetListeningStatsQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Ear, TrendingUp, AlertTriangle, MessageSquare, ThumbsUp, ThumbsDown, Minus } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";

export default function Listening() {
  const { workspaceId } = useStore();
  const [sentimentFilter, setSentimentFilter] = useState<string>("all");

  const { data: stats, isLoading: statsLoading } = useGetListeningStats(
    { workspaceId },
    { query: { enabled: !!workspaceId, queryKey: getGetListeningStatsQueryKey({ workspaceId }) } }
  );

  const { data: mentions, isLoading: mentionsLoading } = useListMentions(
    { workspaceId, sentiment: sentimentFilter === "all" ? undefined : sentimentFilter },
    { query: { enabled: !!workspaceId, queryKey: getListMentionsQueryKey({ workspaceId, sentiment: sentimentFilter === "all" ? undefined : sentimentFilter }) } }
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Social Listening</h1>
          <p className="text-muted-foreground mt-2">Monitor brand mentions and sentiment across the web.</p>
        </div>
      </div>

      {statsLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32 w-full rounded-xl" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex justify-between">
                Total Mentions
                <MessageSquare className="w-4 h-4" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalMentions.toLocaleString()}</div>
              <p className="text-xs text-success flex items-center mt-1">
                <TrendingUp className="w-3 h-3 mr-1" />
                +{stats?.mentionsGrowth}% this week
              </p>
            </CardContent>
          </Card>
          <Card className="bg-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex justify-between">
                Positive Sentiment
                <ThumbsUp className="w-4 h-4 text-success" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-success">{stats?.positivePercent}%</div>
              <div className="w-full bg-muted rounded-full h-2 mt-2 overflow-hidden">
                <div className="bg-success h-2 rounded-full" style={{ width: `${stats?.positivePercent}%` }} />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex justify-between">
                Negative Sentiment
                <ThumbsDown className="w-4 h-4 text-danger" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-danger">{stats?.negativePercent}%</div>
              <div className="w-full bg-muted rounded-full h-2 mt-2 overflow-hidden">
                <div className="bg-danger h-2 rounded-full" style={{ width: `${stats?.negativePercent}%` }} />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex justify-between">
                Spike Alerts
                <AlertTriangle className="w-4 h-4 text-warning" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-warning">{stats?.spikeAlerts}</div>
              <p className="text-xs text-muted-foreground mt-1">Unusual activity detected</p>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="flex gap-6 mt-8">
        <div className="w-full max-w-sm hidden lg:block space-y-4">
           <Card className="bg-card">
             <CardHeader>
               <CardTitle className="text-lg">Keywords</CardTitle>
             </CardHeader>
             <CardContent className="space-y-2">
               {/* Mock keywords since we don't have the API hooked up for the list in this view, using static for design */}
               <div className="flex items-center justify-between p-2 rounded bg-primary/10 border border-primary/20 text-primary text-sm font-medium cursor-pointer">
                 <span>socify</span>
                 <Badge variant="secondary">1.2k</Badge>
               </div>
               <div className="flex items-center justify-between p-2 rounded hover:bg-muted/50 text-foreground text-sm font-medium cursor-pointer">
                 <span>social media tool</span>
                 <Badge variant="secondary">842</Badge>
               </div>
               <div className="flex items-center justify-between p-2 rounded hover:bg-muted/50 text-foreground text-sm font-medium cursor-pointer">
                 <span>#marketing</span>
                 <Badge variant="secondary">4.5k</Badge>
               </div>
             </CardContent>
           </Card>
        </div>

        <div className="flex-1 space-y-4">
          <div className="flex gap-2 border-b border-border pb-4">
            {[
              { id: "all", label: "All Mentions" },
              { id: "positive", label: "Positive", icon: ThumbsUp, color: "text-success" },
              { id: "negative", label: "Negative", icon: ThumbsDown, color: "text-danger" },
              { id: "neutral", label: "Neutral", icon: Minus, color: "text-muted-foreground" },
            ].map(filter => (
              <Badge 
                key={filter.id} 
                variant={sentimentFilter === filter.id ? "default" : "outline"}
                className={`cursor-pointer px-3 py-1 text-sm rounded-full ${sentimentFilter !== filter.id ? filter.color : ""}`}
                onClick={() => setSentimentFilter(filter.id)}
              >
                {filter.icon && <filter.icon className="w-3 h-3 mr-1.5" />}
                {filter.label}
              </Badge>
            ))}
          </div>

          {mentionsLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <Card key={i} className="bg-card">
                  <CardContent className="p-4 flex gap-4">
                    <Skeleton className="w-12 h-12 rounded-full" />
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-4 w-1/4" />
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-3/4" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : mentions?.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground border border-dashed border-border rounded-xl">
              <Ear className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No mentions found for the selected filters.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {mentions?.map(mention => (
                <Card key={mention.id} className="bg-card border-border overflow-hidden">
                  {mention.isSpike && (
                    <div className="bg-warning/20 text-warning px-4 py-1 text-xs font-medium flex items-center">
                      <AlertTriangle className="w-3 h-3 mr-1" /> Spike Alert: High engagement velocity
                    </div>
                  )}
                  <CardContent className="p-5">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-3">
                        <Avatar className="w-10 h-10 border border-border">
                          <AvatarImage src={mention.authorAvatar || undefined} />
                          <AvatarFallback>{mention.authorName[0]}</AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">{mention.authorName}</span>
                            <span className="text-muted-foreground text-sm">@{mention.authorHandle}</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                            <span className="uppercase font-medium text-foreground">{mention.platform}</span>
                            <span>•</span>
                            <span>{formatDistanceToNow(new Date(mention.publishedAt), { addSuffix: true })}</span>
                            <span>•</span>
                            <span>{mention.authorFollowers.toLocaleString()} followers</span>
                          </div>
                        </div>
                      </div>
                      <Badge variant={mention.sentiment === "positive" ? "default" : mention.sentiment === "negative" ? "destructive" : "secondary"}>
                        {mention.sentiment}
                      </Badge>
                    </div>
                    
                    <p className="text-sm mt-3">{mention.content}</p>
                    
                    <div className="flex items-center gap-4 mt-4 pt-4 border-t border-border text-sm text-muted-foreground">
                      <div className="flex items-center gap-1.5 hover:text-foreground cursor-pointer">
                        <MessageSquare className="w-4 h-4" /> {mention.comments}
                      </div>
                      <div className="flex items-center gap-1.5 hover:text-foreground cursor-pointer">
                        <ThumbsUp className="w-4 h-4" /> {mention.likes}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
