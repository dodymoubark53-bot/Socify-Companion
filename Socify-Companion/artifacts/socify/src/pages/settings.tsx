import { useState, useEffect } from "react";
import { useStore } from "@/store/use-store";
import { useGetWorkspace, getGetWorkspaceQueryKey, useListSocialAccounts, getListSocialAccountsQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Settings as SettingsIcon, Link as LinkIcon, Users, CreditCard, Shield, Plus,
  Check, Zap, BarChart2, Workflow, Globe, UserMinus, Mail, Crown, ChevronRight,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";

const PLANS = [
  {
    id: "free",
    name: "Free",
    price: "$0",
    description: "For individuals getting started",
    color: "border-border",
    badge: "bg-zinc-800 text-zinc-300",
    features: ["3 social accounts", "30 posts/month", "Basic analytics", "1 team member", "Email support"],
    limits: { posts: 30, accounts: 3, members: 1 },
  },
  {
    id: "pro",
    name: "Pro",
    price: "$49",
    description: "For growing brands and creators",
    color: "border-primary/40",
    badge: "bg-primary/20 text-primary",
    popular: true,
    features: ["10 social accounts", "300 posts/month", "Advanced analytics", "5 team members", "Automations", "Priority support"],
    limits: { posts: 300, accounts: 10, members: 5 },
  },
  {
    id: "agency",
    name: "Agency",
    price: "$129",
    description: "For agencies managing multiple brands",
    color: "border-purple-500/30",
    badge: "bg-purple-500/20 text-purple-400",
    features: ["Unlimited accounts", "Unlimited posts", "Full analytics suite", "25 team members", "White-label reports", "Dedicated support"],
    limits: { posts: 9999, accounts: 9999, members: 25 },
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: "Custom",
    description: "For large organisations",
    color: "border-amber-500/20",
    badge: "bg-amber-500/10 text-amber-400",
    features: ["Everything in Agency", "Custom integrations", "SSO / SAML", "Unlimited members", "SLA guarantee", "Onboarding & training"],
    limits: { posts: 9999, accounts: 9999, members: 9999 },
  },
];

const ROLE_COLORS: Record<string, string> = {
  owner:   "bg-amber-500/10 text-amber-400 border-amber-500/20",
  admin:   "bg-purple-500/10 text-purple-400 border-purple-500/20",
  editor:  "bg-blue-500/10 text-blue-400 border-blue-500/20",
  analyst: "bg-green-500/10 text-green-400 border-green-500/20",
  viewer:  "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
};

interface Member {
  id: number;
  userId: number;
  role: string;
  joinedAt: string;
  name: string;
  email: string;
  avatar: string | null;
}

export default function Settings() {
  const { workspaceId, user, token } = useStore();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("editor");
  const [inviting, setInviting] = useState(false);
  const [members, setMembers] = useState<Member[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [savingWorkspace, setSavingWorkspace] = useState(false);
  const [wsName, setWsName] = useState("");
  const [wsSlug, setWsSlug] = useState("");

  const { data: workspace, isLoading: workspaceLoading } = useGetWorkspace(
    workspaceId,
    { query: { enabled: !!workspaceId, queryKey: getGetWorkspaceQueryKey(workspaceId) } }
  );

  const { data: accounts, isLoading: accountsLoading } = useListSocialAccounts(
    { workspaceId },
    { query: { enabled: !!workspaceId, queryKey: getListSocialAccountsQueryKey({ workspaceId }) } }
  );

  useEffect(() => {
    if (workspace) { setWsName(workspace.name); setWsSlug(workspace.slug); }
  }, [workspace]);

  useEffect(() => {
    if (!workspaceId || !token) return;
    setMembersLoading(true);
    fetch(`/api/workspaces/${workspaceId}/members`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(setMembers)
      .catch(() => {})
      .finally(() => setMembersLoading(false));
  }, [workspaceId, token]);

  const handleSaveWorkspace = async () => {
    setSavingWorkspace(true);
    try {
      await fetch(`/api/workspaces/${workspaceId}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ name: wsName, slug: wsSlug }),
      });
      queryClient.invalidateQueries({ queryKey: getGetWorkspaceQueryKey(workspaceId) });
      toast({ title: "Workspace saved" });
    } catch {
      toast({ title: "Failed to save", variant: "destructive" });
    } finally {
      setSavingWorkspace(false);
    }
  };

  const handleInvite = async () => {
    if (!inviteEmail) return;
    setInviting(true);
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/invite`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      });
      const data = await res.json();
      if (!res.ok) { toast({ title: data.message ?? "Invite failed", variant: "destructive" }); return; }
      toast({ title: data.message ?? "Invitation sent!" });
      setInviteOpen(false);
      setInviteEmail("");
      // Refresh members
      const updated = await fetch(`/api/workspaces/${workspaceId}/members`, {
        headers: { Authorization: `Bearer ${token}` },
      }).then(r => r.json());
      setMembers(updated);
    } catch {
      toast({ title: "Network error", variant: "destructive" });
    } finally {
      setInviting(false);
    }
  };

  const handleRemoveMember = async (targetUserId: number, name: string) => {
    if (targetUserId === user?.id) { toast({ title: "You can't remove yourself", variant: "destructive" }); return; }
    await fetch(`/api/workspaces/${workspaceId}/members/${targetUserId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    setMembers(m => m.filter(x => x.userId !== targetUserId));
    toast({ title: `${name} removed from workspace` });
  };

  const currentPlan = workspace?.plan ?? "free";

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in duration-300">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-2">Manage your workspace, team, and billing.</p>
      </div>

      <Tabs defaultValue="general" className="w-full">
        <TabsList className="grid w-full grid-cols-4 lg:w-[600px]">
          <TabsTrigger value="general"><SettingsIcon className="w-4 h-4 mr-2" /> General</TabsTrigger>
          <TabsTrigger value="accounts"><LinkIcon className="w-4 h-4 mr-2" /> Accounts</TabsTrigger>
          <TabsTrigger value="team"><Users className="w-4 h-4 mr-2" /> Team</TabsTrigger>
          <TabsTrigger value="billing"><CreditCard className="w-4 h-4 mr-2" /> Billing</TabsTrigger>
        </TabsList>

        {/* ───── GENERAL ───── */}
        <TabsContent value="general" className="mt-6 space-y-6">
          <Card className="bg-card">
            <CardHeader>
              <CardTitle>Workspace Profile</CardTitle>
              <CardDescription>Update your workspace name and URL slug.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {workspaceLoading ? <Skeleton className="h-48 w-full" /> : (
                <>
                  <div className="flex items-center gap-6">
                    <Avatar className="w-20 h-20 border border-border">
                      <AvatarImage src={workspace?.logo || undefined} />
                      <AvatarFallback className="text-2xl">{workspace?.name[0]}</AvatarFallback>
                    </Avatar>
                    <div>
                      <Button variant="outline" size="sm">Change Logo</Button>
                      <p className="text-xs text-muted-foreground mt-1">PNG or JPG, max 2MB</p>
                    </div>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Workspace Name</Label>
                      <Input value={wsName} onChange={e => setWsName(e.target.value)} className="bg-input/50" />
                    </div>
                    <div className="space-y-2">
                      <Label>URL Slug</Label>
                      <div className="flex items-center gap-0">
                        <span className="h-9 px-3 flex items-center bg-muted border border-r-0 border-border rounded-l-md text-muted-foreground text-sm">socify.app/</span>
                        <Input value={wsSlug} onChange={e => setWsSlug(e.target.value)} className="bg-input/50 rounded-l-none" />
                      </div>
                    </div>
                  </div>
                  <div className="pt-2 flex justify-end">
                    <Button onClick={handleSaveWorkspace} disabled={savingWorkspace}>
                      {savingWorkspace ? "Saving…" : "Save Changes"}
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card className="bg-card border-destructive/30">
            <CardHeader>
              <CardTitle className="text-destructive flex items-center gap-2"><Shield className="w-4 h-4" /> Danger Zone</CardTitle>
              <CardDescription>These actions are permanent and cannot be undone.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Delete Workspace</h4>
                  <p className="text-sm text-muted-foreground">Permanently delete this workspace and all its data.</p>
                </div>
                <Button variant="destructive">Delete Workspace</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ───── ACCOUNTS ───── */}
        <TabsContent value="accounts" className="mt-6">
          <Card className="bg-card">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Connected Accounts</CardTitle>
                <CardDescription>Social media profiles linked to this workspace.</CardDescription>
              </div>
              <Button size="sm"><Plus className="w-4 h-4 mr-2" /> Connect Account</Button>
            </CardHeader>
            <CardContent>
              {accountsLoading ? (
                <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-20 w-full" />)}</div>
              ) : (
                <div className="space-y-3">
                  {accounts?.map(account => (
                    <div key={account.id} className="flex items-center justify-between p-4 border border-border rounded-xl bg-background/50">
                      <div className="flex items-center gap-4">
                        <Avatar className="w-12 h-12">
                          <AvatarImage src={account.avatar || undefined} />
                          <AvatarFallback>{account.name[0]}</AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold">{account.name}</h4>
                            <Badge variant="outline" className="uppercase text-[10px]">{account.platform}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">@{account.handle} · {account.followers.toLocaleString()} followers</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant={account.isActive ? "default" : "secondary"} className={account.isActive ? "bg-green-500/10 text-green-400 border-green-500/20" : ""}>
                          {account.isActive ? "Active" : "Disconnected"}
                        </Badge>
                        <Button variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10 hover:text-destructive">Disconnect</Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ───── TEAM ───── */}
        <TabsContent value="team" className="mt-6 space-y-6">
          <Card className="bg-card">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Team Members</CardTitle>
                <CardDescription>
                  {members.length} member{members.length !== 1 ? "s" : ""} in this workspace
                </CardDescription>
              </div>
              <Button size="sm" onClick={() => setInviteOpen(true)}>
                <Plus className="w-4 h-4 mr-2" /> Invite Member
              </Button>
            </CardHeader>
            <CardContent className="space-y-2">
              {membersLoading ? (
                <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-16 w-full" />)}</div>
              ) : members.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">No team members yet. Invite someone to get started.</p>
                </div>
              ) : (
                members.map(member => (
                  <div key={member.id} className="flex items-center justify-between p-4 border border-border rounded-xl bg-background/50 group">
                    <div className="flex items-center gap-3">
                      <Avatar className="w-9 h-9">
                        <AvatarImage src={member.avatar || undefined} />
                        <AvatarFallback className="text-xs">{member.name[0]}</AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold">{member.name}</span>
                          {member.userId === user?.id && <span className="text-xs text-muted-foreground">(You)</span>}
                        </div>
                        <p className="text-xs text-muted-foreground">{member.email} · joined {formatDistanceToNow(new Date(member.joinedAt), { addSuffix: true })}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className={`text-xs capitalize ${ROLE_COLORS[member.role] ?? ""}`}>
                        {member.role === "owner" && <Crown className="w-3 h-3 mr-1" />}
                        {member.role}
                      </Badge>
                      {member.userId !== user?.id && member.role !== "owner" && (
                        <button
                          onClick={() => handleRemoveMember(member.userId, member.name)}
                          className="opacity-0 group-hover:opacity-100 p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all"
                          title="Remove member"
                        >
                          <UserMinus className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card className="bg-card">
            <CardHeader>
              <CardTitle>Role Permissions</CardTitle>
              <CardDescription>What each role can do in your workspace.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-2 pr-4 text-muted-foreground font-medium">Permission</th>
                      {["Owner","Admin","Editor","Analyst","Viewer"].map(r => (
                        <th key={r} className="py-2 px-3 text-center text-muted-foreground font-medium">{r}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {[
                      ["Create & publish posts",    true, true, true, false, false],
                      ["View analytics",            true, true, true, true, true],
                      ["Manage automations",        true, true, false, false, false],
                      ["Manage team members",       true, true, false, false, false],
                      ["Billing & plan changes",    true, false, false, false, false],
                      ["Delete workspace",          true, false, false, false, false],
                    ].map(([label, ...perms]) => (
                      <tr key={label as string}>
                        <td className="py-2.5 pr-4 text-muted-foreground">{label}</td>
                        {(perms as boolean[]).map((allowed, i) => (
                          <td key={i} className="py-2.5 px-3 text-center">
                            {allowed
                              ? <Check className="w-3.5 h-3.5 text-green-400 mx-auto" />
                              : <span className="w-3.5 h-3.5 block mx-auto text-center text-muted-foreground/30">—</span>
                            }
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ───── BILLING ───── */}
        <TabsContent value="billing" className="mt-6 space-y-6">
          <Card className="bg-card">
            <CardHeader>
              <CardTitle>Current Plan</CardTitle>
              <CardDescription>You are on the <strong className="text-foreground capitalize">{currentPlan}</strong> plan.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-3 text-center mb-6">
                {[
                  { label: "Posts this month", value: workspace?.postsThisMonth ?? 0, icon: Zap },
                  { label: "Social accounts", value: workspace?.socialAccountsCount ?? 0, icon: Globe },
                  { label: "Team members", value: workspace?.membersCount ?? 0, icon: Users },
                ].map(({ label, value, icon: Icon }) => (
                  <div key={label} className="p-4 rounded-xl bg-muted/30 border border-border">
                    <Icon className="w-5 h-5 text-primary mx-auto mb-2" />
                    <div className="text-2xl font-bold">{value}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {PLANS.map(plan => {
              const isCurrent = plan.id === currentPlan;
              return (
                <div
                  key={plan.id}
                  className={`relative flex flex-col p-5 rounded-2xl border bg-card transition-all ${isCurrent ? "border-primary ring-1 ring-primary/30 shadow-lg shadow-primary/10" : plan.color + " hover:border-opacity-60"}`}
                >
                  {plan.popular && !isCurrent && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <Badge className="bg-primary text-primary-foreground text-[10px] px-2">Popular</Badge>
                    </div>
                  )}
                  {isCurrent && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <Badge className="bg-green-500/80 text-white text-[10px] px-2">Current Plan</Badge>
                    </div>
                  )}
                  <div className="mb-3">
                    <Badge variant="outline" className={`text-[10px] mb-2 ${plan.badge}`}>{plan.name}</Badge>
                    <div className="text-2xl font-bold">{plan.price}<span className="text-sm font-normal text-muted-foreground">{plan.price !== "Custom" ? "/mo" : ""}</span></div>
                    <p className="text-xs text-muted-foreground mt-1">{plan.description}</p>
                  </div>
                  <ul className="space-y-1.5 flex-1 mb-4">
                    {plan.features.map(f => (
                      <li key={f} className="flex items-start gap-2 text-xs text-muted-foreground">
                        <Check className="w-3.5 h-3.5 text-green-400 flex-shrink-0 mt-0.5" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  {isCurrent ? (
                    <Button variant="outline" size="sm" disabled className="w-full">Current plan</Button>
                  ) : plan.id === "enterprise" ? (
                    <Button variant="outline" size="sm" className="w-full">
                      <Mail className="w-3.5 h-3.5 mr-1.5" /> Contact Sales
                    </Button>
                  ) : (
                    <Button size="sm" className="w-full">
                      Upgrade <ChevronRight className="w-3.5 h-3.5 ml-1" />
                    </Button>
                  )}
                </div>
              );
            })}
          </div>

          <Card className="bg-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><BarChart2 className="w-4 h-4 text-primary" /> Usage This Month</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { label: "Posts published", used: workspace?.postsThisMonth ?? 0, limit: PLANS.find(p => p.id === currentPlan)?.limits.posts ?? 30 },
                { label: "Social accounts", used: workspace?.socialAccountsCount ?? 0, limit: PLANS.find(p => p.id === currentPlan)?.limits.accounts ?? 3 },
                { label: "Team members", used: workspace?.membersCount ?? 0, limit: PLANS.find(p => p.id === currentPlan)?.limits.members ?? 1 },
              ].map(({ label, used, limit }) => {
                const pct = Math.min((used / Math.max(limit, 1)) * 100, 100);
                const color = pct >= 90 ? "bg-red-500" : pct >= 70 ? "bg-amber-500" : "bg-primary";
                return (
                  <div key={label}>
                    <div className="flex justify-between text-sm mb-1.5">
                      <span>{label}</span>
                      <span className="text-muted-foreground">{used} / {limit >= 9999 ? "∞" : limit}</span>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Invite Member Dialog */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="sm:max-w-md bg-card border-border">
          <DialogHeader>
            <DialogTitle>Invite Team Member</DialogTitle>
            <DialogDescription>Send an invitation email to add someone to your workspace.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Email Address</Label>
              <Input
                type="email"
                placeholder="colleague@company.com"
                value={inviteEmail}
                onChange={e => setInviteEmail(e.target.value)}
                className="bg-input/50"
                autoFocus
                onKeyDown={e => e.key === "Enter" && handleInvite()}
              />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={inviteRole} onValueChange={setInviteRole}>
                <SelectTrigger className="bg-input/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin — full access except billing</SelectItem>
                  <SelectItem value="editor">Editor — create and publish posts</SelectItem>
                  <SelectItem value="analyst">Analyst — view-only + analytics</SelectItem>
                  <SelectItem value="viewer">Viewer — read-only access</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteOpen(false)}>Cancel</Button>
            <Button onClick={handleInvite} disabled={inviting || !inviteEmail}>
              <Mail className="w-4 h-4 mr-2" />
              {inviting ? "Sending…" : "Send Invitation"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
