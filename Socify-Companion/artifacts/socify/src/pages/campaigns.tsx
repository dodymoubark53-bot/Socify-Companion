import { useState } from "react";
import { useStore } from "@/store/use-store";
import { useListCampaigns, getListCampaignsQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Target, TrendingUp, Calendar, DollarSign, Activity } from "lucide-react";
import { format } from "date-fns";

export default function Campaigns() {
  const { workspaceId } = useStore();
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data: campaigns, isLoading } = useListCampaigns(
    { workspaceId, status: statusFilter === "all" ? undefined : statusFilter },
    { query: { enabled: !!workspaceId, queryKey: getListCampaignsQueryKey({ workspaceId, status: statusFilter === "all" ? undefined : statusFilter }) } }
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Campaigns</h1>
          <p className="text-muted-foreground mt-2">Manage your cross-platform marketing campaigns.</p>
        </div>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Create Campaign
        </Button>
      </div>

      <div className="flex gap-2 border-b border-border pb-4">
        {["all", "active", "draft", "completed"].map(status => (
          <Button 
            key={status} 
            variant={statusFilter === status ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter(status)}
            className="capitalize"
          >
            {status}
          </Button>
        ))}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <Card key={i} className="bg-card">
              <CardHeader>
                <Skeleton className="h-6 w-3/4 mb-2" />
                <Skeleton className="h-4 w-1/2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-24 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : campaigns?.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 text-center text-muted-foreground border border-dashed border-border rounded-xl">
          <Target className="w-12 h-12 mb-4 opacity-50" />
          <h3 className="font-semibold text-lg text-foreground">No campaigns found</h3>
          <p className="text-sm mt-1">Create your first campaign to start tracking cross-platform performance.</p>
          <Button className="mt-4">
            <Plus className="w-4 h-4 mr-2" />
            Create Campaign
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {campaigns?.map(campaign => (
            <Card key={campaign.id} className="bg-card border-border hover:border-primary/50 transition-colors">
              <CardHeader className="pb-4">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded bg-primary/20 flex items-center justify-center text-primary" style={{ backgroundColor: campaign.color ? `${campaign.color}20` : undefined, color: campaign.color || undefined }}>
                      <Target className="w-4 h-4" />
                    </div>
                    <Badge variant={campaign.status === "active" ? "default" : "secondary"} className="capitalize">
                      {campaign.status}
                    </Badge>
                  </div>
                </div>
                <CardTitle className="mt-4 text-xl">{campaign.name}</CardTitle>
                {campaign.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{campaign.description}</p>
                )}
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="space-y-1">
                      <div className="flex items-center text-muted-foreground">
                        <Calendar className="w-4 h-4 mr-2" />
                        Start Date
                      </div>
                      <p className="font-medium">{campaign.startDate ? format(new Date(campaign.startDate), "MMM d, yyyy") : "TBD"}</p>
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center text-muted-foreground">
                        <DollarSign className="w-4 h-4 mr-2" />
                        Budget
                      </div>
                      <p className="font-medium">{campaign.budget ? `$${campaign.budget.toLocaleString()}` : "No budget"}</p>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-border grid grid-cols-3 gap-2 text-center text-sm">
                    <div>
                      <p className="text-muted-foreground text-xs mb-1">Posts</p>
                      <p className="font-bold">{campaign.postsCount}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs mb-1">Reach</p>
                      <p className="font-bold">{(campaign.totalReach / 1000).toFixed(1)}k</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs mb-1">Engagement</p>
                      <p className="font-bold">{(campaign.totalEngagement / 1000).toFixed(1)}k</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
