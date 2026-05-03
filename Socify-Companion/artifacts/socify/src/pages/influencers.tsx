import { useState } from "react";
import { Search, Plus, Star, Instagram, Twitter, Youtube, ExternalLink, Filter, TrendingUp, Users, Heart, Eye } from "lucide-react";
import { useStore } from "@/store/use-store";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { customFetch } from "@workspace/api-client-react/src/custom-fetch";

interface Influencer {
  id: number; workspaceId: number; name: string; handle: string; platform: string;
  avatar: string | null; bio: string | null; email: string | null; category: string;
  tier: string; followers: number; avgLikes: number; avgComments: number;
  engagementRate: number | null; avgReach: number; location: string | null;
  status: string; tags: string[]; notes: string | null; lastContactedAt: string | null; createdAt: string;
}

const PLATFORM_ICONS: Record<string, React.ReactNode> = {
  instagram: <Instagram className="w-3.5 h-3.5" />,
  twitter: <Twitter className="w-3.5 h-3.5" />,
  youtube: <Youtube className="w-3.5 h-3.5" />,
  tiktok: <span className="text-xs font-bold">TK</span>,
};

const PLATFORM_COLORS: Record<string, string> = {
  instagram: "bg-pink-500/10 text-pink-400 border-pink-500/20",
  twitter: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  youtube: "bg-red-500/10 text-red-400 border-red-500/20",
  tiktok: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  linkedin: "bg-blue-600/10 text-blue-300 border-blue-600/20",
};

const TIER_COLORS: Record<string, string> = {
  nano: "bg-gray-500/10 text-gray-400 border-gray-500/20",
  micro: "bg-green-500/10 text-green-400 border-green-500/20",
  mid: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  macro: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  mega: "bg-purple-500/10 text-purple-400 border-purple-500/20",
};

const STATUS_COLORS: Record<string, string> = {
  prospect: "bg-zinc-500/10 text-zinc-400",
  contacted: "bg-blue-500/10 text-blue-400",
  negotiating: "bg-yellow-500/10 text-yellow-400",
  active: "bg-green-500/10 text-green-400",
  completed: "bg-indigo-500/10 text-indigo-400",
};

function formatNumber(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

export default function Influencers() {
  const { workspaceId } = useStore();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [filterPlatform, setFilterPlatform] = useState("all");
  const [filterTier, setFilterTier] = useState("all");
  const [showAddModal, setShowAddModal] = useState(false);
  const [form, setForm] = useState({ name: "", handle: "", platform: "instagram", tier: "micro", category: "lifestyle", followers: "", email: "" });

  const { data: influencers, isLoading } = useQuery<Influencer[]>({
    queryKey: ["influencers", workspaceId, filterPlatform, filterTier],
    queryFn: () => {
      let url = `/api/influencers?workspaceId=${workspaceId}`;
      if (filterPlatform !== "all") url += `&platform=${filterPlatform}`;
      if (filterTier !== "all") url += `&tier=${filterTier}`;
      return customFetch(url);
    },
    enabled: !!workspaceId,
  });

  const addMutation = useMutation({
    mutationFn: (data: typeof form) => customFetch("/api/influencers", {
      method: "POST",
      body: JSON.stringify({ workspaceId, ...data, followers: parseInt(data.followers) || 0 }),
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["influencers"] }); setShowAddModal(false); setForm({ name: "", handle: "", platform: "instagram", tier: "micro", category: "lifestyle", followers: "", email: "" }); },
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      customFetch(`/api/influencers/${id}`, { method: "PATCH", body: JSON.stringify({ status }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["influencers"] }),
  });

  const filtered = influencers?.filter(i =>
    !search || i.name.toLowerCase().includes(search.toLowerCase()) || i.handle.toLowerCase().includes(search.toLowerCase())
  ) ?? [];

  const stats = {
    total: influencers?.length ?? 0,
    active: influencers?.filter(i => i.status === "active").length ?? 0,
    totalReach: influencers?.reduce((sum, i) => sum + i.followers, 0) ?? 0,
    avgEngagement: influencers?.length ? (influencers.reduce((sum, i) => sum + (i.engagementRate ?? 3.2), 0) / influencers.length) : 0,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Influencers</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Discover, track, and manage influencer partnerships</p>
        </div>
        <Button onClick={() => setShowAddModal(true)} className="gap-2">
          <Plus className="w-4 h-4" /> Add Influencer
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Total Influencers", value: stats.total, icon: Users, color: "text-indigo-400" },
          { label: "Active Partners", value: stats.active, icon: Star, color: "text-green-400" },
          { label: "Combined Reach", value: formatNumber(stats.totalReach), icon: Eye, color: "text-blue-400" },
          { label: "Avg Engagement", value: `${stats.avgEngagement.toFixed(1)}%`, icon: Heart, color: "text-pink-400" },
        ].map(stat => (
          <div key={stat.label} className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-muted-foreground">{stat.label}</span>
              <stat.icon className={`w-4 h-4 ${stat.color}`} />
            </div>
            <div className="text-2xl font-semibold text-foreground">{isLoading ? <Skeleton className="h-7 w-16" /> : stat.value}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search influencers..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={filterPlatform} onValueChange={setFilterPlatform}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Platform" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Platforms</SelectItem>
            <SelectItem value="instagram">Instagram</SelectItem>
            <SelectItem value="twitter">Twitter</SelectItem>
            <SelectItem value="tiktok">TikTok</SelectItem>
            <SelectItem value="youtube">YouTube</SelectItem>
            <SelectItem value="linkedin">LinkedIn</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterTier} onValueChange={setFilterTier}>
          <SelectTrigger className="w-32"><SelectValue placeholder="Tier" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Tiers</SelectItem>
            <SelectItem value="nano">Nano (1K-10K)</SelectItem>
            <SelectItem value="micro">Micro (10K-100K)</SelectItem>
            <SelectItem value="mid">Mid (100K-500K)</SelectItem>
            <SelectItem value="macro">Macro (500K-1M)</SelectItem>
            <SelectItem value="mega">Mega (1M+)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="divide-y divide-border">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 p-4">
                <Skeleton className="w-10 h-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <Skeleton className="h-6 w-16" />
                <Skeleton className="h-6 w-20" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Users className="w-12 h-12 text-muted-foreground/30 mb-4" />
            <p className="text-base font-medium text-foreground mb-1">{search ? "No results found" : "No influencers yet"}</p>
            <p className="text-sm text-muted-foreground mb-4">{search ? "Try a different search term" : "Add your first influencer to start tracking partnerships"}</p>
            {!search && <Button onClick={() => setShowAddModal(true)} variant="outline" size="sm" className="gap-2"><Plus className="w-3.5 h-3.5" /> Add Influencer</Button>}
          </div>
        ) : (
          <div>
            <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr_auto] gap-4 px-4 py-3 text-xs font-medium text-muted-foreground border-b border-border uppercase tracking-wide">
              <span>Influencer</span><span>Platform</span><span>Tier</span><span>Followers</span><span>Engagement</span><span>Status</span><span></span>
            </div>
            <div className="divide-y divide-border">
              {filtered.map(inf => (
                <div key={inf.id} className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr_auto] gap-4 items-center px-4 py-3.5 hover:bg-accent/30 transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-accent flex items-center justify-center text-sm font-semibold text-foreground flex-shrink-0">
                      {inf.avatar ? <img src={inf.avatar} alt="" className="w-9 h-9 rounded-full object-cover" /> : inf.name[0]}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{inf.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{inf.handle}</p>
                    </div>
                  </div>
                  <div>
                    <span className={`inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded border ${PLATFORM_COLORS[inf.platform] ?? "bg-zinc-500/10 text-zinc-400 border-zinc-500/20"}`}>
                      {PLATFORM_ICONS[inf.platform] ?? null} {inf.platform}
                    </span>
                  </div>
                  <div>
                    <span className={`inline-flex items-center text-xs px-2 py-0.5 rounded border capitalize ${TIER_COLORS[inf.tier] ?? ""}`}>
                      {inf.tier}
                    </span>
                  </div>
                  <div className="text-sm font-medium text-foreground">{formatNumber(inf.followers)}</div>
                  <div className="text-sm text-foreground">{inf.engagementRate ? `${inf.engagementRate}%` : "—"}</div>
                  <div>
                    <select
                      value={inf.status}
                      onChange={e => updateStatus.mutate({ id: inf.id, status: e.target.value })}
                      className={`text-xs px-2 py-1 rounded-md border-0 cursor-pointer focus:outline-none focus:ring-1 focus:ring-ring ${STATUS_COLORS[inf.status] ?? ""} bg-transparent`}
                    >
                      {["prospect","contacted","negotiating","active","completed"].map(s => <option key={s} value={s} className="bg-[#18181B] text-[#FAFAFA]">{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                    </select>
                  </div>
                  <Button variant="ghost" size="icon" className="w-7 h-7">
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Add Modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="bg-[#111113] border-[#27272A] max-w-md">
          <DialogHeader><DialogTitle>Add Influencer</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Name</Label><Input value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} placeholder="Full name" className="mt-1.5" /></div>
              <div><Label>Handle</Label><Input value={form.handle} onChange={e => setForm(f => ({...f, handle: e.target.value}))} placeholder="@handle" className="mt-1.5" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Platform</Label>
                <Select value={form.platform} onValueChange={v => setForm(f => ({...f, platform: v}))}>
                  <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                  <SelectContent>{["instagram","twitter","tiktok","youtube","linkedin"].map(p => <SelectItem key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Tier</Label>
                <Select value={form.tier} onValueChange={v => setForm(f => ({...f, tier: v}))}>
                  <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                  <SelectContent>{["nano","micro","mid","macro","mega"].map(t => <SelectItem key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Followers</Label><Input type="number" value={form.followers} onChange={e => setForm(f => ({...f, followers: e.target.value}))} placeholder="50000" className="mt-1.5" /></div>
              <div><Label>Email</Label><Input type="email" value={form.email} onChange={e => setForm(f => ({...f, email: e.target.value}))} placeholder="email@..." className="mt-1.5" /></div>
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setShowAddModal(false)}>Cancel</Button>
              <Button className="flex-1" onClick={() => addMutation.mutate(form)} disabled={!form.name || !form.handle || addMutation.isPending}>
                {addMutation.isPending ? "Adding..." : "Add Influencer"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
