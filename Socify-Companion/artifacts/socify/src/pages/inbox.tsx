import { useState, useEffect } from "react";
import { useStore } from "@/store/use-store";
import { useListInboxMessages, getListInboxMessagesQueryKey, useUpdateInboxMessage, useReplyToMessage, useGetInboxStats, getGetInboxStatsQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Inbox, CheckCircle2, MessageSquare, Star, Clock, AlertCircle, CornerDownRight, Wifi, WifiOff } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useSocket } from "@/hooks/useSocket";
import { cn } from "@/lib/utils";

export default function SmartInbox() {
  const { workspaceId } = useStore();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const [selectedStatus, setSelectedStatus] = useState<string | undefined>("unread");
  const [selectedMessageId, setSelectedMessageId] = useState<number | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const [liveActivity, setLiveActivity] = useState<string | null>(null);

  const { socket, connected } = useSocket(workspaceId ?? 0);

  const { data: stats } = useGetInboxStats({ workspaceId }, { query: { enabled: !!workspaceId, queryKey: getGetInboxStatsQueryKey({ workspaceId }) } });
  
  const { data: messagesResponse, isLoading } = useListInboxMessages(
    { workspaceId, status: selectedStatus },
    { query: { enabled: !!workspaceId, queryKey: getListInboxMessagesQueryKey({ workspaceId, status: selectedStatus }) } }
  );

  const updateMessage = useUpdateInboxMessage();
  const replyToMessage = useReplyToMessage();

  const selectedMessage = messagesResponse?.messages.find(m => m.id === selectedMessageId);

  useEffect(() => {
    if (!socket) return;

    const onMessageUpdated = (data: { messageId: number }) => {
      queryClient.invalidateQueries({ queryKey: getListInboxMessagesQueryKey({ workspaceId, status: selectedStatus }) });
      queryClient.invalidateQueries({ queryKey: getGetInboxStatsQueryKey({ workspaceId }) });
      setLiveActivity("Inbox updated");
      setTimeout(() => setLiveActivity(null), 3000);
    };

    const onReplySent = (data: { messageId: number }) => {
      queryClient.invalidateQueries({ queryKey: getListInboxMessagesQueryKey({ workspaceId, status: selectedStatus }) });
      queryClient.invalidateQueries({ queryKey: getGetInboxStatsQueryKey({ workspaceId }) });
      setLiveActivity("New reply received");
      setTimeout(() => setLiveActivity(null), 3000);
    };

    socket.on("inbox:message_updated", onMessageUpdated);
    socket.on("inbox:reply_sent", onReplySent);

    return () => {
      socket.off("inbox:message_updated", onMessageUpdated);
      socket.off("inbox:reply_sent", onReplySent);
    };
  }, [socket, workspaceId, selectedStatus, queryClient]);

  const handleStatusChange = (status: string | undefined) => {
    setSelectedStatus(status);
    setSelectedMessageId(null);
  };

  const handleMarkAsDone = (id: number) => {
    updateMessage.mutate({ messageId: id, data: { status: "done" } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListInboxMessagesQueryKey({ workspaceId, status: selectedStatus }) });
        queryClient.invalidateQueries({ queryKey: getGetInboxStatsQueryKey({ workspaceId }) });
        if (selectedMessageId === id) setSelectedMessageId(null);
        toast({ title: "Message resolved" });
      }
    });
  };

  const handleReply = () => {
    if (!selectedMessageId || !replyContent.trim()) return;
    replyToMessage.mutate({ messageId: selectedMessageId, data: { content: replyContent } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListInboxMessagesQueryKey({ workspaceId, status: selectedStatus }) });
        setReplyContent("");
        toast({ title: "Reply sent successfully" });
        handleMarkAsDone(selectedMessageId);
      }
    });
  };

  const platformColors: Record<string, string> = {
    twitter: "bg-sky-500/10 text-sky-400 border-sky-500/20",
    instagram: "bg-pink-500/10 text-pink-400 border-pink-500/20",
    facebook: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    linkedin: "bg-blue-600/10 text-blue-500 border-blue-600/20",
    tiktok: "bg-zinc-500/10 text-zinc-300 border-zinc-500/20",
  };

  const sentimentColors: Record<string, string> = {
    positive: "text-green-400",
    negative: "text-red-400",
    neutral: "text-zinc-400",
  };

  return (
    <div className="h-full flex flex-col gap-6 animate-in fade-in duration-300">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight">Smart Inbox</h1>
            <div className={cn("flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full border", connected ? "border-green-500/30 bg-green-500/10 text-green-400" : "border-zinc-600/30 bg-zinc-800/50 text-zinc-500")}>
              {connected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
              {connected ? "Live" : "Offline"}
            </div>
            {liveActivity && (
              <span className="text-xs text-primary animate-in fade-in duration-300 bg-primary/10 px-2 py-0.5 rounded-full border border-primary/20">
                ⚡ {liveActivity}
              </span>
            )}
          </div>
          <p className="text-muted-foreground mt-2">Manage all your social conversations in one place.</p>
        </div>
        <div className="flex gap-2">
          <Button variant={selectedStatus === "unread" ? "default" : "outline"} onClick={() => handleStatusChange("unread")}>
            Unread <Badge variant="secondary" className="ml-2">{stats?.unread || 0}</Badge>
          </Button>
          <Button variant={selectedStatus === "in_progress" ? "default" : "outline"} onClick={() => handleStatusChange("in_progress")}>
            In Progress
          </Button>
          <Button variant={selectedStatus === "done" ? "default" : "outline"} onClick={() => handleStatusChange("done")}>
            Done
          </Button>
          <Button variant={!selectedStatus ? "default" : "outline"} onClick={() => handleStatusChange(undefined)}>
            All
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 overflow-hidden min-h-[600px]">
        {/* Message List */}
        <Card className="lg:col-span-1 flex flex-col h-full overflow-hidden bg-card border-border">
          <div className="p-4 border-b border-border">
            <Input placeholder="Search messages..." className="bg-input/50" />
          </div>
          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="p-4 space-y-4">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="flex gap-4">
                    <Skeleton className="w-10 h-10 rounded-full" />
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-4 w-1/2" />
                      <Skeleton className="h-3 w-full" />
                      <Skeleton className="h-3 w-3/4" />
                    </div>
                  </div>
                ))}
              </div>
            ) : messagesResponse?.messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground p-8">
                <CheckCircle2 className="w-12 h-12 mb-4 text-muted-foreground/50" />
                <h3 className="font-semibold text-lg text-foreground">Inbox zero</h3>
                <p className="text-sm">You're all caught up with your messages.</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {messagesResponse?.messages.map(msg => (
                  <div
                    key={msg.id}
                    className={cn(
                      "p-4 cursor-pointer transition-colors hover:bg-muted/50",
                      selectedMessageId === msg.id ? "bg-muted/80 border-l-2 border-l-primary" : "border-l-2 border-l-transparent",
                    )}
                    onClick={() => setSelectedMessageId(msg.id)}
                  >
                    <div className="flex items-start gap-3">
                      <Avatar className="w-9 h-9 flex-shrink-0">
                        <AvatarImage src={msg.avatar || undefined} />
                        <AvatarFallback className="text-xs">{msg.senderName[0]}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-sm font-semibold truncate">{msg.senderName}</span>
                          <span className="text-xs text-muted-foreground ml-2 flex-shrink-0">{formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true })}</span>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2">{msg.content}</p>
                        <div className="flex items-center gap-2 mt-1.5">
                          <Badge variant="outline" className={cn("text-[10px] h-4 px-1.5 border", platformColors[msg.platform] || "")}>
                            {msg.platform}
                          </Badge>
                          {msg.sentiment && (
                            <span className={cn("text-[10px] flex items-center gap-0.5", sentimentColors[msg.sentiment] || "text-zinc-400")}>
                              {msg.sentiment === "positive" ? "😊" : msg.sentiment === "negative" ? "😞" : "😐"}
                              {msg.sentiment}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>

        {/* Message Detail */}
        <Card className="lg:col-span-2 flex flex-col h-full overflow-hidden bg-card border-border">
          {!selectedMessage ? (
            <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground p-8">
              <MessageSquare className="w-16 h-16 mb-4 text-muted-foreground/30" />
              <h3 className="font-semibold text-lg text-foreground">Select a message</h3>
              <p className="text-sm">Click a conversation to read and reply</p>
            </div>
          ) : (
            <>
              <CardHeader className="flex-row items-center justify-between border-b border-border space-y-0 pb-4">
                <div className="flex items-center gap-3">
                  <Avatar className="w-10 h-10">
                    <AvatarImage src={selectedMessage.avatar || undefined} />
                    <AvatarFallback>{selectedMessage.senderName[0]}</AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle className="text-base">{selectedMessage.senderName}</CardTitle>
                    <p className="text-xs text-muted-foreground">{selectedMessage.platform} • {formatDistanceToNow(new Date(selectedMessage.createdAt), { addSuffix: true })}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {selectedMessage.status !== "done" && (
                    <>
                      <Button variant="outline" size="sm" onClick={() => updateMessage.mutate({ messageId: selectedMessage.id, data: { status: "in_progress" } }, { onSuccess: () => queryClient.invalidateQueries({ queryKey: getListInboxMessagesQueryKey({ workspaceId, status: selectedStatus }) }) })}>
                        <Clock className="w-3.5 h-3.5 mr-1.5" /> In Progress
                      </Button>
                      <Button variant="outline" size="sm" className="text-green-400 border-green-500/30 hover:bg-green-500/10" onClick={() => handleMarkAsDone(selectedMessage.id)}>
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" /> Resolve
                      </Button>
                    </>
                  )}
                </div>
              </CardHeader>

              <CardContent className="flex-1 overflow-y-auto p-6">
                <div className="space-y-4">
                  <div className="flex gap-4">
                    <Avatar className="w-9 h-9 flex-shrink-0">
                      <AvatarImage src={selectedMessage.avatar || undefined} />
                      <AvatarFallback className="text-xs">{selectedMessage.senderName[0]}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 bg-muted/50 rounded-xl p-4">
                      <p className="text-sm leading-relaxed">{selectedMessage.content}</p>
                      <div className="flex items-center gap-3 mt-3 pt-3 border-t border-border">
                        <Badge variant="outline" className={cn("text-[10px]", platformColors[selectedMessage.platform] || "")}>
                          {selectedMessage.platform}
                        </Badge>
                        {selectedMessage.sentiment && (
                          <Badge variant="outline" className={cn("text-[10px]", sentimentColors[selectedMessage.sentiment] || "text-zinc-400")}>
                            {selectedMessage.sentiment} sentiment
                          </Badge>
                        )}
                        {selectedMessage.isStarred && (
                          <Badge variant="outline" className="text-[10px] text-amber-400 border-amber-500/30">
                            <Star className="w-2.5 h-2.5 mr-1" /> Starred
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>

              <div className="p-4 border-t border-border space-y-3">
                <Textarea
                  placeholder="Write a reply..."
                  value={replyContent}
                  onChange={e => setReplyContent(e.target.value)}
                  className="resize-none bg-input/50 min-h-[80px]"
                  onKeyDown={e => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleReply(); }}
                />
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">Cmd+Enter to send</p>
                  <Button onClick={handleReply} disabled={!replyContent.trim() || replyToMessage.isPending}>
                    <CornerDownRight className="w-4 h-4 mr-2" />
                    {replyToMessage.isPending ? "Sending…" : "Send Reply"}
                  </Button>
                </div>
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
