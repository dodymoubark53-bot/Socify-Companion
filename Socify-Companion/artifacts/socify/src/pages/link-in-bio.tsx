import { useState } from "react";
import { Plus, Link2, ExternalLink, Trash2, Globe, Eye, Copy, ToggleLeft, ToggleRight, Pencil, GripVertical } from "lucide-react";
import { useStore } from "@/store/use-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { customFetch } from "@workspace/api-client-react/src/custom-fetch";
import { Badge } from "@/components/ui/badge";

interface LIBLink { id: number; title: string; url: string; icon: string | null; isActive: boolean; clicks: number; sortOrder: number; }
interface LIBPage { id: number; workspaceId: number; userId: number; slug: string; title: string; bio: string | null; avatar: string | null; backgroundColor: string; accentColor: string; fontStyle: string; isPublished: boolean; totalClicks: number; createdAt: string; links: LIBLink[]; }

export default function LinkInBio() {
  const { workspaceId } = useStore();
  const qc = useQueryClient();
  const [selectedPage, setSelectedPage] = useState<LIBPage | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAddLinkModal, setShowAddLinkModal] = useState(false);
  const [pageForm, setPageForm] = useState({ title: "", bio: "", accentColor: "#6366F1" });
  const [linkForm, setLinkForm] = useState({ title: "", url: "", icon: "" });

  const { data: pages, isLoading } = useQuery<LIBPage[]>({
    queryKey: ["lib-pages", workspaceId],
    queryFn: () => customFetch(`/api/link-in-bio?workspaceId=${workspaceId}`),
    enabled: !!workspaceId,
  });

  const createPage = useMutation({
    mutationFn: (data: typeof pageForm) => customFetch("/api/link-in-bio", {
      method: "POST",
      body: JSON.stringify({ workspaceId, ...data }),
    }),
    onSuccess: (newPage: LIBPage) => {
      qc.invalidateQueries({ queryKey: ["lib-pages"] });
      setShowCreateModal(false);
      setSelectedPage(newPage);
      setPageForm({ title: "", bio: "", accentColor: "#6366F1" });
    },
  });

  const togglePublish = useMutation({
    mutationFn: ({ id, isPublished }: { id: number; isPublished: boolean }) =>
      customFetch(`/api/link-in-bio/${id}`, { method: "PATCH", body: JSON.stringify({ isPublished }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["lib-pages"] }),
  });

  const addLink = useMutation({
    mutationFn: (data: typeof linkForm) => customFetch(`/api/link-in-bio/${selectedPage!.id}/links`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["lib-pages"] });
      setShowAddLinkModal(false);
      setLinkForm({ title: "", url: "", icon: "" });
    },
  });

  const deleteLink = useMutation({
    mutationFn: ({ pageId, linkId }: { pageId: number; linkId: number }) =>
      customFetch(`/api/link-in-bio/${pageId}/links/${linkId}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["lib-pages"] }),
  });

  const deletePage = useMutation({
    mutationFn: (id: number) => customFetch(`/api/link-in-bio/${id}`, { method: "DELETE" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["lib-pages"] }); setSelectedPage(null); },
  });

  const currentPage = selectedPage ? pages?.find(p => p.id === selectedPage.id) ?? selectedPage : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Link in Bio</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Create and manage your branded link pages</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)} className="gap-2"><Plus className="w-4 h-4" /> New Page</Button>
      </div>

      <div className="grid grid-cols-[280px_1fr] gap-6">
        {/* Pages list */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide px-1 mb-3">Your Pages</p>
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)
          ) : !pages?.length ? (
            <div className="bg-card border border-dashed border-border rounded-xl p-6 text-center">
              <Link2 className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No pages yet</p>
              <Button variant="outline" size="sm" className="mt-3 gap-2" onClick={() => setShowCreateModal(true)}><Plus className="w-3.5 h-3.5" /> Create Page</Button>
            </div>
          ) : pages.map(page => (
            <button key={page.id} onClick={() => setSelectedPage(page)}
              className={`w-full text-left p-3.5 rounded-xl border transition-all ${currentPage?.id === page.id ? "bg-accent border-primary/30" : "bg-card border-border hover:border-border/80"}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{page.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">socify.app/{page.slug}</p>
                </div>
                <Badge variant={page.isPublished ? "default" : "secondary"} className="text-xs flex-shrink-0">
                  {page.isPublished ? "Live" : "Draft"}
                </Badge>
              </div>
              <div className="flex items-center gap-3 mt-2">
                <span className="text-xs text-muted-foreground">{page.links.length} links</span>
                <span className="text-xs text-muted-foreground">{page.totalClicks} clicks</span>
              </div>
            </button>
          ))}
        </div>

        {/* Editor */}
        {!currentPage ? (
          <div className="bg-card border border-dashed border-border rounded-xl flex flex-col items-center justify-center py-24 text-center">
            <Globe className="w-12 h-12 text-muted-foreground/30 mb-4" />
            <p className="text-base font-medium text-foreground mb-1">Select a page to edit</p>
            <p className="text-sm text-muted-foreground">Or create a new page to get started</p>
          </div>
        ) : (
          <div className="grid grid-cols-[1fr_320px] gap-6">
            {/* Links editor */}
            <div className="space-y-4">
              <div className="bg-card border border-border rounded-xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-foreground">Page Settings</h3>
                  <div className="flex items-center gap-2">
                    <button onClick={() => togglePublish.mutate({ id: currentPage.id, isPublished: !currentPage.isPublished })}
                      className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md border transition-colors ${currentPage.isPublished ? "bg-green-500/10 border-green-500/20 text-green-400" : "bg-zinc-500/10 border-zinc-700 text-zinc-400"}`}>
                      {currentPage.isPublished ? <ToggleRight className="w-3.5 h-3.5" /> : <ToggleLeft className="w-3.5 h-3.5" />}
                      {currentPage.isPublished ? "Published" : "Draft"}
                    </button>
                    <Button variant="ghost" size="icon" className="w-7 h-7 text-muted-foreground hover:text-destructive" onClick={() => deletePage.mutate(currentPage.id)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label className="text-xs">Page URL</Label><div className="mt-1.5 flex items-center gap-2 px-3 py-2 bg-background border border-border rounded-md text-sm text-muted-foreground">socify.app/{currentPage.slug}</div></div>
                  <div><Label className="text-xs">Total Clicks</Label><div className="mt-1.5 px-3 py-2 bg-background border border-border rounded-md text-sm text-foreground">{currentPage.totalClicks.toLocaleString()}</div></div>
                </div>
              </div>

              <div className="bg-card border border-border rounded-xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-foreground">Links ({currentPage.links.length})</h3>
                  <Button size="sm" variant="outline" className="gap-2 text-xs" onClick={() => setShowAddLinkModal(true)}>
                    <Plus className="w-3.5 h-3.5" /> Add Link
                  </Button>
                </div>
                {currentPage.links.length === 0 ? (
                  <div className="text-center py-8">
                    <Link2 className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">No links yet. Add your first link.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {currentPage.links.map(link => (
                      <div key={link.id} className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${link.isActive ? "bg-background border-border" : "bg-background/50 border-border/50 opacity-60"}`}>
                        <GripVertical className="w-4 h-4 text-muted-foreground/40 cursor-grab flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{link.title}</p>
                          <p className="text-xs text-muted-foreground truncate">{link.url}</p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="text-xs text-muted-foreground">{link.clicks} clicks</span>
                          <Button variant="ghost" size="icon" className="w-6 h-6 text-muted-foreground hover:text-destructive"
                            onClick={() => deleteLink.mutate({ pageId: currentPage.id, linkId: link.id })}>
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Preview */}
            <div className="sticky top-0">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">Preview</p>
              <div className="rounded-2xl overflow-hidden border border-border shadow-xl" style={{ backgroundColor: currentPage.backgroundColor }}>
                <div className="p-6 flex flex-col items-center text-center">
                  <div className="w-16 h-16 rounded-full border-2 flex items-center justify-center mb-3 text-xl font-bold" style={{ borderColor: currentPage.accentColor, color: currentPage.accentColor }}>
                    {currentPage.title[0]}
                  </div>
                  <h2 className="text-base font-bold text-white mb-1">{currentPage.title}</h2>
                  {currentPage.bio && <p className="text-xs text-white/60 mb-4">{currentPage.bio}</p>}
                  <div className="w-full space-y-2.5 mt-3">
                    {currentPage.links.filter(l => l.isActive).map(link => (
                      <div key={link.id} className="w-full py-2.5 px-4 rounded-xl text-sm font-medium text-white text-center transition-all cursor-pointer hover:opacity-90"
                        style={{ backgroundColor: currentPage.accentColor }}>
                        {link.title}
                      </div>
                    ))}
                    {currentPage.links.filter(l => l.isActive).length === 0 && (
                      <div className="w-full py-2.5 px-4 rounded-xl text-sm text-white/40 text-center border border-white/10">
                        Your links will appear here
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Create Page Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="bg-[#111113] border-[#27272A] max-w-md">
          <DialogHeader><DialogTitle>Create Link in Bio Page</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-2">
            <div><Label>Page Title</Label><Input value={pageForm.title} onChange={e => setPageForm(f => ({...f, title: e.target.value}))} placeholder="My Links" className="mt-1.5" /></div>
            <div><Label>Bio / Tagline</Label><Input value={pageForm.bio} onChange={e => setPageForm(f => ({...f, bio: e.target.value}))} placeholder="A short description..." className="mt-1.5" /></div>
            <div>
              <Label>Accent Color</Label>
              <div className="flex items-center gap-3 mt-1.5">
                <input type="color" value={pageForm.accentColor} onChange={e => setPageForm(f => ({...f, accentColor: e.target.value}))} className="w-10 h-10 rounded-lg cursor-pointer border-0 bg-transparent" />
                <Input value={pageForm.accentColor} onChange={e => setPageForm(f => ({...f, accentColor: e.target.value}))} className="flex-1 font-mono text-sm" />
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setShowCreateModal(false)}>Cancel</Button>
              <Button className="flex-1" onClick={() => createPage.mutate(pageForm)} disabled={!pageForm.title || createPage.isPending}>
                {createPage.isPending ? "Creating..." : "Create Page"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Link Modal */}
      <Dialog open={showAddLinkModal} onOpenChange={setShowAddLinkModal}>
        <DialogContent className="bg-[#111113] border-[#27272A] max-w-md">
          <DialogHeader><DialogTitle>Add Link</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-2">
            <div><Label>Label</Label><Input value={linkForm.title} onChange={e => setLinkForm(f => ({...f, title: e.target.value}))} placeholder="My Website" className="mt-1.5" /></div>
            <div><Label>URL</Label><Input value={linkForm.url} onChange={e => setLinkForm(f => ({...f, url: e.target.value}))} placeholder="https://..." className="mt-1.5" /></div>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setShowAddLinkModal(false)}>Cancel</Button>
              <Button className="flex-1" onClick={() => addLink.mutate(linkForm)} disabled={!linkForm.title || !linkForm.url || addLink.isPending}>
                {addLink.isPending ? "Adding..." : "Add Link"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
