import { useState, useCallback, useRef } from "react";
import { useStore } from "@/store/use-store";
import { useListAutomations, getListAutomationsQueryKey, useUpdateAutomation } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Workflow, Plus, Zap, ArrowRight, Clock, X, GripVertical, ChevronDown, Check, MessageSquare, Mail, Bell, Tag, Users, Star } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { useToast } from "@/hooks/use-toast";

const TRIGGERS = [
  { id: "new_follower", label: "New Follower", icon: Users, description: "When someone follows your account" },
  { id: "mention", label: "Mention", icon: MessageSquare, description: "When your brand is mentioned" },
  { id: "dm_received", label: "DM Received", icon: Mail, description: "When a direct message arrives" },
  { id: "comment_received", label: "Comment", icon: MessageSquare, description: "When someone comments on a post" },
  { id: "post_published", label: "Post Published", icon: Zap, description: "When a scheduled post goes live" },
  { id: "lead_score_threshold", label: "Lead Score Threshold", icon: Star, description: "When a lead score crosses a value" },
];

const ACTIONS = [
  { id: "send_dm", label: "Send DM", icon: Mail, description: "Send a direct message" },
  { id: "send_email", label: "Send Email", icon: Mail, description: "Send an email via SMTP" },
  { id: "add_tag", label: "Add Tag", icon: Tag, description: "Tag the lead or contact" },
  { id: "notify_team", label: "Notify Team", icon: Bell, description: "Send Slack or in-app notification" },
  { id: "move_lead_stage", label: "Move Lead Stage", icon: ArrowRight, description: "Update lead pipeline stage" },
  { id: "assign_to_member", label: "Assign to Member", icon: Users, description: "Assign to a team member" },
];

interface WorkflowNode {
  id: string;
  type: "trigger" | "action";
  nodeType: string;
  label: string;
  config: Record<string, string>;
}

function NodeCard({ node, onRemove, isFirst }: { node: WorkflowNode; onRemove: () => void; isFirst: boolean }) {
  const isTrigger = node.type === "trigger";
  const source = isTrigger ? TRIGGERS.find(t => t.id === node.nodeType) : ACTIONS.find(a => a.id === node.nodeType);
  const Icon = source?.icon ?? Zap;

  return (
    <div className="flex flex-col items-center">
      {!isFirst && (
        <div className="flex flex-col items-center my-1">
          <div className="w-px h-6 bg-border" />
          <ArrowRight className="w-4 h-4 text-muted-foreground rotate-90" />
          <div className="w-px h-1 bg-border" />
        </div>
      )}
      <div className={`w-full rounded-xl border p-4 relative group transition-all ${
        isTrigger
          ? "bg-amber-500/5 border-amber-500/30"
          : "bg-indigo-500/5 border-indigo-500/30"
      }`}>
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-lg ${isTrigger ? "bg-amber-500/20 text-amber-400" : "bg-indigo-500/20 text-indigo-400"}`}>
            <Icon className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <Badge variant="outline" className={`text-[10px] h-4 px-1.5 ${isTrigger ? "border-amber-500/30 text-amber-400" : "border-indigo-500/30 text-indigo-400"}`}>
                {isTrigger ? "TRIGGER" : "ACTION"}
              </Badge>
            </div>
            <p className="text-sm font-semibold">{node.label}</p>
            <p className="text-xs text-muted-foreground">{source?.description}</p>
          </div>
          <button
            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-destructive/20 text-muted-foreground hover:text-destructive"
            onClick={onRemove}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

function WorkflowBuilder({ onClose }: { onClose: () => void }) {
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [nodes, setNodes] = useState<WorkflowNode[]>([]);
  const [addingType, setAddingType] = useState<"trigger" | "action" | null>(null);

  const addNode = (type: "trigger" | "action", nodeType: string, label: string) => {
    setNodes(prev => [...prev, {
      id: `${type}-${Date.now()}`,
      type, nodeType, label, config: {}
    }]);
    setAddingType(null);
  };

  const removeNode = (id: string) => setNodes(prev => prev.filter(n => n.id !== id));

  const hasTrigger = nodes.some(n => n.type === "trigger");

  const handleSave = () => {
    if (!name.trim()) { toast({ title: "Give your workflow a name", variant: "destructive" }); return; }
    if (!hasTrigger) { toast({ title: "Add at least one trigger", variant: "destructive" }); return; }
    if (nodes.filter(n => n.type === "action").length === 0) { toast({ title: "Add at least one action", variant: "destructive" }); return; }
    toast({ title: "Workflow saved!", description: `"${name}" is now active.` });
    onClose();
  };

  return (
    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-card border-border">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Workflow className="w-5 h-5 text-primary" />
          Visual Workflow Builder
        </DialogTitle>
      </DialogHeader>

      <div className="space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-xs">Workflow Name</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Welcome new followers" className="mt-1.5" />
          </div>
          <div>
            <Label className="text-xs">Description</Label>
            <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="What does this do?" className="mt-1.5" />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-3">
            <Label className="text-xs uppercase tracking-wide">Workflow Canvas</Label>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="h-7 text-xs border-amber-500/30 text-amber-400 hover:bg-amber-500/10" onClick={() => setAddingType("trigger")}>
                <Zap className="w-3 h-3 mr-1.5" /> Add Trigger
              </Button>
              <Button variant="outline" size="sm" className="h-7 text-xs border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/10" onClick={() => setAddingType("action")}>
                <Plus className="w-3 h-3 mr-1.5" /> Add Action
              </Button>
            </div>
          </div>

          {nodes.length === 0 ? (
            <div className="border-2 border-dashed border-border rounded-xl p-10 flex flex-col items-center text-center text-muted-foreground">
              <Workflow className="w-12 h-12 mb-3 opacity-30" />
              <p className="text-sm font-medium">Start building your workflow</p>
              <p className="text-xs mt-1">Add a trigger and actions to automate your social media tasks</p>
              <div className="flex gap-2 mt-4">
                <Button variant="outline" size="sm" className="text-xs border-amber-500/30 text-amber-400" onClick={() => setAddingType("trigger")}>
                  Add Trigger
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-0 bg-background/50 rounded-xl p-4 border border-border">
              {nodes.map((node, idx) => (
                <NodeCard key={node.id} node={node} isFirst={idx === 0} onRemove={() => removeNode(node.id)} />
              ))}
            </div>
          )}
        </div>

        {addingType && (
          <div className="border border-border rounded-xl overflow-hidden">
            <div className={`px-4 py-2.5 text-xs font-semibold uppercase tracking-wide ${addingType === "trigger" ? "bg-amber-500/10 text-amber-400 border-b border-amber-500/20" : "bg-indigo-500/10 text-indigo-400 border-b border-indigo-500/20"}`}>
              Select a {addingType}
            </div>
            <div className="grid grid-cols-2 gap-2 p-3 bg-card">
              {(addingType === "trigger" ? TRIGGERS : ACTIONS).map(item => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    className="flex items-start gap-3 p-3 rounded-lg text-left hover:bg-muted/50 transition-colors border border-transparent hover:border-border"
                    onClick={() => addNode(addingType, item.id, item.label)}
                  >
                    <div className={`p-1.5 rounded ${addingType === "trigger" ? "bg-amber-500/20 text-amber-400" : "bg-indigo-500/20 text-indigo-400"}`}>
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{item.label}</p>
                      <p className="text-xs text-muted-foreground">{item.description}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <DialogFooter className="mt-2">
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button onClick={handleSave} disabled={nodes.length === 0}>
          <Check className="w-4 h-4 mr-2" />
          Save & Activate
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

export default function Automations() {
  const { workspaceId } = useStore();
  const queryClient = useQueryClient();
  const [showBuilder, setShowBuilder] = useState(false);

  const { data: automations, isLoading } = useListAutomations(
    { workspaceId },
    { query: { enabled: !!workspaceId, queryKey: getListAutomationsQueryKey({ workspaceId }) } }
  );

  const updateAutomation = useUpdateAutomation();

  const toggleStatus = (id: number, currentStatus: boolean) => {
    updateAutomation.mutate({ automationId: id, data: { isActive: !currentStatus } }, {
      onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListAutomationsQueryKey({ workspaceId }) }); }
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Automations</h1>
          <p className="text-muted-foreground mt-2">Build workflows to automate repetitive tasks.</p>
        </div>
        <Button onClick={() => setShowBuilder(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Create Workflow
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <Card key={i} className="bg-card"><CardContent className="p-6"><Skeleton className="w-full h-20" /></CardContent></Card>
          ))}
        </div>
      ) : automations?.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-16 text-center text-muted-foreground border border-dashed border-border rounded-xl">
          <Workflow className="w-16 h-16 mb-4 opacity-50" />
          <h3 className="font-semibold text-xl text-foreground">No automations active</h3>
          <p className="mt-2 max-w-md">Save hours every week by automating replies, lead generation, and team notifications.</p>
          <Button className="mt-6" size="lg" onClick={() => setShowBuilder(true)}>
            <Zap className="w-4 h-4 mr-2" />
            Build your first workflow
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {automations?.map(automation => (
            <Card key={automation.id} className={`bg-card border-border transition-colors ${!automation.isActive ? "opacity-75 bg-muted/10" : ""}`}>
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="flex-1 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${automation.isActive ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"}`}>
                          <Workflow className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold">{automation.name}</h3>
                          <p className="text-sm text-muted-foreground">{automation.description}</p>
                        </div>
                      </div>
                      <div className="md:hidden">
                        <Switch checked={automation.isActive} onCheckedChange={() => toggleStatus(automation.id, automation.isActive)} />
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-sm bg-background/50 p-3 rounded-md border border-border">
                      <div className="flex items-center gap-1.5 font-medium px-2 py-1 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded text-xs">
                        <Zap className="w-3.5 h-3.5" />
                        {automation.triggerType}
                      </div>
                      <ArrowRight className="w-4 h-4 text-muted-foreground" />
                      {automation.actionTypes.map((action, idx) => (
                        <div key={idx} className="flex items-center gap-1.5">
                          <div className="font-medium px-2 py-1 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded text-xs">
                            {action}
                          </div>
                          {idx < automation.actionTypes.length - 1 && (
                            <ArrowRight className="w-4 h-4 text-muted-foreground" />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-8 md:border-l md:border-border md:pl-8">
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Runs</p>
                      <p className="font-semibold text-lg">{automation.runCount.toLocaleString()}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Last Run</p>
                      <p className="text-sm font-medium flex items-center">
                        <Clock className="w-3 h-3 mr-1" />
                        {automation.lastRunAt ? formatDistanceToNow(new Date(automation.lastRunAt), { addSuffix: true }) : "Never"}
                      </p>
                    </div>
                    <div className="hidden md:block">
                      <Switch checked={automation.isActive} onCheckedChange={() => toggleStatus(automation.id, automation.isActive)} />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showBuilder} onOpenChange={setShowBuilder}>
        <WorkflowBuilder onClose={() => setShowBuilder(false)} />
      </Dialog>
    </div>
  );
}
