import { useState, useRef } from "react";
import { useStore } from "@/store/use-store";
import { useCreatePost, useGenerateCaption, useSuggestHashtags } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Image as ImageIcon, Wand2, Hash, Plus, Check, Link, Upload, X, ExternalLink } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const PLATFORMS = [
  { id: "twitter", label: "Twitter", color: "bg-blue-400" },
  { id: "linkedin", label: "LinkedIn", color: "bg-blue-600" },
  { id: "instagram", label: "Instagram", color: "bg-pink-600" },
  { id: "facebook", label: "Facebook", color: "bg-blue-700" },
];

interface UTMParams {
  source: string;
  medium: string;
  campaign: string;
  content: string;
}

function buildUTMUrl(baseUrl: string, params: UTMParams): string {
  if (!baseUrl) return "";
  try {
    const url = new URL(baseUrl.startsWith("http") ? baseUrl : `https://${baseUrl}`);
    if (params.source) url.searchParams.set("utm_source", params.source);
    if (params.medium) url.searchParams.set("utm_medium", params.medium);
    if (params.campaign) url.searchParams.set("utm_campaign", params.campaign);
    if (params.content) url.searchParams.set("utm_content", params.content);
    return url.toString();
  } catch {
    return baseUrl;
  }
}

function UTMBuilder({ onApply }: { onApply: (url: string) => void }) {
  const [baseUrl, setBaseUrl] = useState("");
  const [utm, setUtm] = useState<UTMParams>({ source: "", medium: "social", campaign: "", content: "" });
  const [copied, setCopied] = useState(false);

  const generatedUrl = buildUTMUrl(baseUrl, utm);

  const handleCopy = () => {
    if (!generatedUrl) return;
    navigator.clipboard.writeText(generatedUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const setField = (field: keyof UTMParams) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setUtm(prev => ({ ...prev, [field]: e.target.value }));

  return (
    <div className="space-y-4">
      <div>
        <Label className="text-xs">Destination URL</Label>
        <Input
          value={baseUrl}
          onChange={e => setBaseUrl(e.target.value)}
          placeholder="https://yourwebsite.com/page"
          className="mt-1.5 font-mono text-xs"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">Source <span className="text-muted-foreground">(e.g. instagram)</span></Label>
          <Input value={utm.source} onChange={setField("source")} placeholder="instagram" className="mt-1.5 text-xs" />
        </div>
        <div>
          <Label className="text-xs">Medium <span className="text-muted-foreground">(e.g. social)</span></Label>
          <Input value={utm.medium} onChange={setField("medium")} placeholder="social" className="mt-1.5 text-xs" />
        </div>
        <div>
          <Label className="text-xs">Campaign</Label>
          <Input value={utm.campaign} onChange={setField("campaign")} placeholder="summer_launch" className="mt-1.5 text-xs" />
        </div>
        <div>
          <Label className="text-xs">Content</Label>
          <Input value={utm.content} onChange={setField("content")} placeholder="cta_button" className="mt-1.5 text-xs" />
        </div>
      </div>
      {generatedUrl && (
        <div className="bg-[#09090B] border border-border rounded-lg p-3">
          <p className="text-[10px] text-muted-foreground mb-1.5 uppercase tracking-wide">Generated URL</p>
          <p className="text-xs font-mono break-all text-[#6366F1] leading-relaxed">{generatedUrl}</p>
        </div>
      )}
      <div className="flex gap-2">
        <Button variant="outline" size="sm" className="flex-1 text-xs gap-1.5" onClick={handleCopy} disabled={!generatedUrl}>
          {copied ? <Check className="w-3 h-3" /> : <ExternalLink className="w-3 h-3" />}
          {copied ? "Copied!" : "Copy URL"}
        </Button>
        <Button size="sm" className="flex-1 text-xs gap-1.5" onClick={() => generatedUrl && onApply(generatedUrl)} disabled={!generatedUrl}>
          <Plus className="w-3 h-3" /> Add to Caption
        </Button>
      </div>
    </div>
  );
}

export default function Composer() {
  const { workspaceId } = useStore();
  const { toast } = useToast();
  
  const [caption, setCaption] = useState("");
  const [platforms, setPlatforms] = useState<string[]>(["twitter", "linkedin"]);
  const [scheduledAt, setScheduledAt] = useState("");
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const createPost = useCreatePost();
  const generateCaption = useGenerateCaption();
  const suggestHashtags = useSuggestHashtags();

  const [aiTopic, setAiTopic] = useState("");
  const [aiTone, setAiTone] = useState("professional");

  const togglePlatform = (id: string) => {
    setPlatforms(prev => prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]);
  };

  const handleGenerateCaption = () => {
    if (!aiTopic) { toast({ title: "Please enter a topic", variant: "destructive" }); return; }
    generateCaption.mutate({ data: { topic: aiTopic, platform: platforms[0] || "general", tone: aiTone, includeHashtags: true } }, {
      onSuccess: (data) => {
        setCaption(data.caption);
        toast({ title: "Caption generated!" });
      }
    });
  };

  const handleSuggestHashtags = () => {
    if (!caption) { toast({ title: "Please write a caption first", variant: "destructive" }); return; }
    suggestHashtags.mutate({ data: { caption, platform: platforms[0] || "general" } }, {
      onSuccess: (data) => {
        setCaption(prev => `${prev}\n\n${data.hashtags.join(" ")}`);
        toast({ title: "Hashtags added!" });
      }
    });
  };

  const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;
    setUploadingMedia(true);
    try {
      for (const file of Array.from(files)) {
        const formData = new FormData();
        formData.append("file", file);
        const token = localStorage.getItem("socify_token");
        const res = await fetch("/api/upload", {
          method: "POST",
          body: formData,
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!res.ok) throw new Error("Upload failed");
        const result = await res.json();
        setMediaUrls(prev => [...prev, result.url]);
      }
      toast({ title: "Media uploaded!" });
    } catch {
      toast({ title: "Upload failed", variant: "destructive" });
    } finally {
      setUploadingMedia(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSubmit = (status: "draft" | "scheduled" | "published" = "draft") => {
    if (!caption) { toast({ title: "Caption is required", variant: "destructive" }); return; }
    if (platforms.length === 0) { toast({ title: "Select at least one platform", variant: "destructive" }); return; }
    
    createPost.mutate({
      data: {
        workspaceId,
        caption,
        platforms,
        mediaType: mediaUrls.length > 0 ? "image" : "text",
        mediaUrls: mediaUrls.length > 0 ? mediaUrls : undefined,
        status,
        scheduledAt: status === "scheduled" ? (scheduledAt ? new Date(scheduledAt).toISOString() : new Date().toISOString()) : null,
      }
    }, {
      onSuccess: () => {
        toast({ title: `Post ${status === "scheduled" ? "scheduled" : status === "draft" ? "saved as draft" : "published"} successfully!` });
        setCaption("");
        setMediaUrls([]);
        setScheduledAt("");
      }
    });
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in duration-300">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Create Post</h1>
        <p className="text-muted-foreground mt-2">Write, optimize, and schedule your social media content.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          {/* Platform Selector */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-lg">1. Select Platforms</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3">
                {PLATFORMS.map(p => (
                  <Button
                    key={p.id}
                    variant={platforms.includes(p.id) ? "default" : "outline"}
                    className={platforms.includes(p.id) ? p.color : ""}
                    onClick={() => togglePlatform(p.id)}
                  >
                    {platforms.includes(p.id) && <Check className="w-4 h-4 mr-2" />}
                    {p.label}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Caption Editor */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-lg flex items-center justify-between">
                <span>2. Write Caption</span>
                <span className="text-xs font-normal text-muted-foreground">{caption.length} / 2200</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea 
                placeholder="What do you want to share?"
                className="min-h-[200px] text-base"
                value={caption}
                onChange={e => setCaption(e.target.value)}
              />
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={handleSuggestHashtags} disabled={suggestHashtags.isPending || !caption}>
                  <Hash className="w-4 h-4 mr-2" />
                  {suggestHashtags.isPending ? "Generating..." : "Suggest Hashtags"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-dashed"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingMedia}
                >
                  {uploadingMedia ? (
                    <><Upload className="w-4 h-4 mr-2 animate-spin" />Uploading...</>
                  ) : (
                    <><ImageIcon className="w-4 h-4 mr-2" />Add Media</>
                  )}
                </Button>
                <input ref={fileInputRef} type="file" accept="image/*,video/*" multiple className="hidden" onChange={handleMediaUpload} />
              </div>
              {mediaUrls.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {mediaUrls.map((url, i) => (
                    <div key={i} className="relative group">
                      <div className="w-20 h-20 rounded-lg overflow-hidden border border-border bg-muted flex items-center justify-center">
                        {url.match(/\.(jpg|jpeg|png|gif|webp)/) ? (
                          <img src={url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <ImageIcon className="w-8 h-8 text-muted-foreground" />
                        )}
                      </div>
                      <button
                        className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => setMediaUrls(prev => prev.filter((_, j) => j !== i))}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* AI Magic */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Wand2 className="w-5 h-5 text-primary" />
                AI Magic
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-3">
                <div className="flex-1 space-y-2">
                  <Label>Topic</Label>
                  <Input placeholder="e.g. 5 tips for better remote work" value={aiTopic} onChange={e => setAiTopic(e.target.value)} />
                </div>
                <div className="w-1/3 space-y-2">
                  <Label>Tone</Label>
                  <Select value={aiTone} onValueChange={setAiTone}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="professional">Professional</SelectItem>
                      <SelectItem value="casual">Casual</SelectItem>
                      <SelectItem value="funny">Funny</SelectItem>
                      <SelectItem value="informative">Informative</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end">
                  <Button onClick={handleGenerateCaption} disabled={generateCaption.isPending}>
                    {generateCaption.isPending ? "Writing..." : "Generate"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* UTM Builder */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Link className="w-5 h-5 text-primary" />
                UTM Link Builder
              </CardTitle>
            </CardHeader>
            <CardContent>
              <UTMBuilder onApply={(url) => setCaption(prev => prev ? `${prev}\n\n${url}` : url)} />
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="bg-card border-border sticky top-6">
            <CardHeader>
              <CardTitle className="text-lg">Publish Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <Label>Schedule Date & Time</Label>
                <Input type="datetime-local" value={scheduledAt} onChange={e => setScheduledAt(e.target.value)} />
              </div>
              <div className="pt-4 border-t border-border space-y-3">
                <Button className="w-full" onClick={() => handleSubmit(scheduledAt ? "scheduled" : "published")} disabled={createPost.isPending}>
                  {createPost.isPending ? "Processing..." : scheduledAt ? "Schedule Post" : "Publish Now"}
                </Button>
                <Button variant="outline" className="w-full" onClick={() => handleSubmit("draft")} disabled={createPost.isPending}>
                  Save as Draft
                </Button>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-lg text-muted-foreground">Preview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-background rounded-md p-4 border border-border min-h-[150px]">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-full bg-muted" />
                  <div className="space-y-1">
                    <div className="h-2 w-24 bg-muted rounded" />
                    <div className="h-2 w-16 bg-muted rounded" />
                  </div>
                </div>
                {caption ? (
                  <p className="text-sm whitespace-pre-wrap">{caption}</p>
                ) : (
                  <p className="text-sm text-muted-foreground italic">Your post preview will appear here...</p>
                )}
                {mediaUrls.length > 0 && (
                  <div className="mt-3 flex gap-1 flex-wrap">
                    {mediaUrls.slice(0, 4).map((url, i) => (
                      <div key={i} className="w-16 h-16 rounded bg-muted border border-border overflow-hidden flex items-center justify-center">
                        {url.match(/\.(jpg|jpeg|png|gif|webp)/) ? (
                          <img src={url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <ImageIcon className="w-6 h-6 text-muted-foreground" />
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
