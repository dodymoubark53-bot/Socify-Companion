import { useState, useMemo } from "react";
import { useStore } from "@/store/use-store";
import { useListLeads, getListLeadsQueryKey, useUpdateLead } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, GripVertical, Users, X, Mail, Phone, Building2, Globe, Star, TrendingUp, MessageSquare, Calendar, Tag, Clock, ArrowUpRight, CheckCircle2, AlertCircle, Zap } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow, format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";

const STAGES = [
  { id: "new", label: "New Lead", color: "bg-blue-500/10 text-blue-500 border-blue-500/20" },
  { id: "contacted", label: "Contacted", color: "bg-purple-500/10 text-purple-500 border-purple-500/20" },
  { id: "qualified", label: "Qualified", color: "bg-amber-500/10 text-amber-500 border-amber-500/20" },
  { id: "proposal", label: "Proposal", color: "bg-orange-500/10 text-orange-500 border-orange-500/20" },
  { id: "won", label: "Won", color: "bg-green-500/10 text-green-500 border-green-500/20" },
];

type ActivityType = "note" | "email" | "call" | "stage_change" | "score_update" | "meeting";

interface ActivityEvent {
  id: number;
  type: ActivityType;
  title: string;
  description?: string;
  createdAt: string;
}

function generateTimeline(lead: any): ActivityEvent[] {
  const events: ActivityEvent[] = [];
  const createdAt = new Date(lead.createdAt ?? new Date()).toISOString();
  
  events.push({ id: 1, type: "stage_change", title: "Lead created", description: `Added to ${STAGES.find(s => s.id === "new")?.label} pipeline`, createdAt });

  if (lead.stage !== "new") {
    const stageOrder = ["new", "contacted", "qualified", "proposal", "won"];
    const currentIdx = stageOrder.indexOf(lead.stage);
    for (let i = 1; i <= currentIdx; i++) {
      const stageLabel = STAGES.find(s => s.id === stageOrder[i])?.label;
      const hoursAgo = (currentIdx - i + 1) * 24;
      const t = new Date(Date.now() - hoursAgo * 3600000).toISOString();
      events.push({ id: i + 1, type: "stage_change", title: `Moved to ${stageLabel}`, createdAt: t });
    }
  }

  if (lead.score > 60) {
    events.push({ id: 100, type: "score_update", title: `Lead score updated to ${lead.score}`, description: "High engagement detected from social activity", createdAt: new Date(Date.now() - 3600000).toISOString() });
  }

  if (lead.platform) {
    events.push({ id: 101, type: "email", title: "First contact initiated", description: `via ${lead.platform}`, createdAt: new Date(Date.now() - 7200000).toISOString() });
  }

  return events.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

const activityIcons: Record<ActivityType, { icon: React.ElementType; color: string }> = {
  note: { icon: MessageSquare, color: "text-blue-400 bg-blue-400/10" },
  email: { icon: Mail, color: "text-purple-400 bg-purple-400/10" },
  call: { icon: Phone, color: "text-green-400 bg-green-400/10" },
  stage_change: { icon: ArrowUpRight, color: "text-amber-400 bg-amber-400/10" },
  score_update: { icon: TrendingUp, color: "text-indigo-400 bg-indigo-400/10" },
  meeting: { icon: Calendar, color: "text-pink-400 bg-pink-400/10" },
};

function LeadModal({ lead, onClose, onMove }: { lead: any; onClose: () => void; onMove: (id: number, stage: string) => void }) {
  const [newNote, setNewNote] = useState("");
  const [notes, setNotes] = useState<ActivityEvent[]>([]);
  const stage = STAGES.find(s => s.id === lead.stage);
  const timeline = useMemo(() => [...generateTimeline(lead), ...notes].sort((a, b) =>
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  ), [lead, notes]);

  const addNote = () => {
    if (!newNote.trim()) return;
    setNotes(prev => [{
      id: Date.now(), type: "note", title: "Note added",
      description: newNote.trim(), createdAt: new Date().toISOString()
    }, ...prev]);
    setNewNote("");
  };

  return (
    <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-card border-border">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-3">
          <Avatar className="w-10 h-10 border border-border">
            <AvatarImage src={lead.avatar || undefined} />
            <AvatarFallback>{lead.name[0]}</AvatarFallback>
          </Avatar>
          <div>
            <div className="text-lg font-semibold">{lead.name}</div>
            <div className="text-sm text-muted-foreground font-normal">{lead.company || "Independent"}</div>
          </div>
        </DialogTitle>
      </DialogHeader>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-2">
        {/* Left column – details */}
        <div className="space-y-4">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Stage</p>
            <Badge variant="outline" className={`${stage?.color}`}>{stage?.label}</Badge>
          </div>

          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Move to Stage</p>
            <div className="flex flex-col gap-1.5">
              {STAGES.filter(s => s.id !== lead.stage).map(s => (
                <Button key={s.id} variant="ghost" size="sm" className="justify-start h-7 text-xs" onClick={() => onMove(lead.id, s.id)}>
                  <ArrowUpRight className="w-3 h-3 mr-1.5" />
                  {s.label}
                </Button>
              ))}
            </div>
          </div>

          <Separator />

          <div className="space-y-3">
            {lead.email && (
              <div className="flex items-center gap-2 text-sm">
                <Mail className="w-4 h-4 text-muted-foreground" />
                <span className="truncate">{lead.email}</span>
              </div>
            )}
            {lead.phone && (
              <div className="flex items-center gap-2 text-sm">
                <Phone className="w-4 h-4 text-muted-foreground" />
                <span>{lead.phone}</span>
              </div>
            )}
            {lead.company && (
              <div className="flex items-center gap-2 text-sm">
                <Building2 className="w-4 h-4 text-muted-foreground" />
                <span>{lead.company}</span>
              </div>
            )}
            {lead.platform && (
              <div className="flex items-center gap-2 text-sm">
                <Globe className="w-4 h-4 text-muted-foreground" />
                <span className="capitalize">{lead.platform}</span>
              </div>
            )}
          </div>

          <Separator />

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Score</span>
              <div className="flex items-center gap-1 font-semibold">
                <Star className="w-3 h-3 text-amber-400" />
                {lead.score}/100
              </div>
            </div>
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all" style={{ width: `${lead.score}%` }} />
            </div>
          </div>

          {lead.estimatedValue > 0 && (
            <div className="flex justify-between text-sm pt-1">
              <span className="text-muted-foreground">Est. Value</span>
              <span className="font-semibold text-green-400">${lead.estimatedValue.toLocaleString()}</span>
            </div>
          )}
        </div>

        {/* Right column – timeline */}
        <div className="md:col-span-2 space-y-4">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-3">Add Note</p>
            <div className="flex gap-2">
              <Textarea
                value={newNote}
                onChange={e => setNewNote(e.target.value)}
                placeholder="Add a note about this lead..."
                className="min-h-[60px] text-sm resize-none"
                onKeyDown={e => { if (e.key === "Enter" && e.metaKey) addNote(); }}
              />
              <Button size="sm" onClick={addNote} disabled={!newNote.trim()} className="self-end">
                Add
              </Button>
            </div>
          </div>

          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-3">Activity Timeline</p>
            <div className="relative">
              <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />
              <div className="space-y-4">
                {timeline.map((event, idx) => {
                  const { icon: Icon, color } = activityIcons[event.type];
                  return (
                    <div key={event.id} className="flex gap-3 relative pl-2">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 z-10 border border-border ${color}`}>
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <div className="flex-1 min-w-0 pb-4">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-medium leading-tight">{event.title}</p>
                          <span className="text-[10px] text-muted-foreground whitespace-nowrap flex-shrink-0">
                            {formatDistanceToNow(new Date(event.createdAt), { addSuffix: true })}
                          </span>
                        </div>
                        {event.description && (
                          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{event.description}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </DialogContent>
  );
}

export default function CRM() {
  const { workspaceId } = useStore();
  const queryClient = useQueryClient();
  const [selectedLead, setSelectedLead] = useState<any | null>(null);

  const { data: leads, isLoading } = useListLeads(
    { workspaceId },
    { query: { enabled: !!workspaceId, queryKey: getListLeadsQueryKey({ workspaceId }) } }
  );

  const updateLead = useUpdateLead();

  const leadsByStage = useMemo(() => {
    const grouped: Record<string, any[]> = {};
    STAGES.forEach(s => grouped[s.id] = []);
    if (leads) {
      leads.forEach(lead => {
        if (grouped[lead.stage]) grouped[lead.stage].push(lead);
        else { if (!grouped["new"]) grouped["new"] = []; grouped["new"].push(lead); }
      });
    }
    return grouped;
  }, [leads]);

  const moveLead = (leadId: number, newStage: string) => {
    updateLead.mutate({ leadId, data: { stage: newStage } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListLeadsQueryKey({ workspaceId }) });
        if (selectedLead?.id === leadId) {
          setSelectedLead((prev: any) => prev ? { ...prev, stage: newStage } : null);
        }
      }
    });
  };

  return (
    <div className="h-full flex flex-col gap-6 animate-in fade-in duration-300">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">CRM Pipeline</h1>
          <p className="text-muted-foreground mt-2">Track leads originating from social channels.</p>
        </div>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Add Lead
        </Button>
      </div>

      <div className="flex-1 flex gap-4 overflow-x-auto pb-4">
        {isLoading ? (
          STAGES.map(stage => (
            <div key={stage.id} className="w-[300px] flex-shrink-0 flex flex-col gap-3">
              <div className="h-10 bg-muted/50 rounded-lg flex items-center px-4 font-semibold text-sm">{stage.label}</div>
              <Skeleton className="h-32 w-full rounded-xl" />
              <Skeleton className="h-32 w-full rounded-xl" />
            </div>
          ))
        ) : (
          STAGES.map(stage => (
            <div key={stage.id} className="w-[320px] flex-shrink-0 flex flex-col gap-3 bg-muted/10 rounded-xl p-3 border border-border/50 h-full overflow-hidden">
              <div className="flex items-center justify-between px-2 mb-2">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-sm">{stage.label}</h3>
                  <Badge variant="secondary" className="text-[10px] h-5 px-1.5">{leadsByStage[stage.id]?.length || 0}</Badge>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                {leadsByStage[stage.id]?.length === 0 ? (
                  <div className="h-24 border border-dashed border-border/50 rounded-lg flex items-center justify-center text-muted-foreground text-xs p-4 text-center">
                    No leads in this stage
                  </div>
                ) : (
                  leadsByStage[stage.id]?.map(lead => (
                    <Card
                      key={lead.id}
                      className="bg-card border-border cursor-pointer hover:border-primary/50 transition-colors"
                      onClick={() => setSelectedLead(lead)}
                    >
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start mb-3">
                          <Badge variant="outline" className={`text-[10px] ${stage.color}`}>
                            Score: {lead.score}
                          </Badge>
                          <GripVertical className="w-4 h-4 text-muted-foreground/50" />
                        </div>
                        <div className="flex items-center gap-3 mb-3">
                          <Avatar className="w-10 h-10 border border-border">
                            <AvatarImage src={lead.avatar || undefined} />
                            <AvatarFallback>{lead.name[0]}</AvatarFallback>
                          </Avatar>
                          <div className="overflow-hidden">
                            <p className="text-sm font-semibold truncate">{lead.name}</p>
                            <p className="text-xs text-muted-foreground truncate">{lead.company || "No company"}</p>
                          </div>
                        </div>
                        {lead.estimatedValue > 0 && (
                          <div className="text-sm font-medium mt-3 pt-3 border-t border-border flex justify-between items-center">
                            <span className="text-muted-foreground">Value</span>
                            <span className="text-green-400">${lead.estimatedValue.toLocaleString()}</span>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </div>
          ))
        )}
      </div>

      <Dialog open={!!selectedLead} onOpenChange={open => !open && setSelectedLead(null)}>
        {selectedLead && (
          <LeadModal lead={selectedLead} onClose={() => setSelectedLead(null)} onMove={moveLead} />
        )}
      </Dialog>
    </div>
  );
}
