import { useState, useMemo } from "react";
import { useStore } from "@/store/use-store";
import { useGetCalendarPosts, getGetCalendarPostsQueryKey } from "@workspace/api-client-react";
import { format, addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, isToday } from "date-fns";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { useLocation } from "wouter";

export default function Calendar() {
  const { workspaceId } = useStore();
  const [, setLocation] = useLocation();
  const [currentDate, setCurrentDate] = useState(new Date());

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  const { data: posts, isLoading } = useGetCalendarPosts(
    { workspaceId, startDate: startDate.toISOString(), endDate: endDate.toISOString() },
    { query: { enabled: !!workspaceId, queryKey: getGetCalendarPostsQueryKey({ workspaceId, startDate: startDate.toISOString(), endDate: endDate.toISOString() }) } }
  );

  const days = eachDayOfInterval({ start: startDate, end: endDate });

  const postsByDate = useMemo(() => {
    if (!posts) return {};
    const map: Record<string, any[]> = {};
    posts.forEach(post => {
      if (!post.scheduledAt && !post.publishedAt) return;
      const dateStr = format(new Date(post.scheduledAt || post.publishedAt!), "yyyy-MM-dd");
      if (!map[dateStr]) map[dateStr] = [];
      map[dateStr].push(post);
    });
    return map;
  }, [posts]);

  return (
    <div className="h-full flex flex-col space-y-6 animate-in fade-in duration-300">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Content Calendar</h1>
          <p className="text-muted-foreground mt-2">Plan and visualize your publishing schedule.</p>
        </div>
        <Button onClick={() => setLocation("/composer")}>
          <Plus className="w-4 h-4 mr-2" />
          New Post
        </Button>
      </div>

      <Card className="flex-1 bg-card border-border flex flex-col overflow-hidden">
        <div className="p-4 border-b border-border flex items-center justify-between bg-muted/10">
          <h2 className="text-xl font-semibold">{format(currentDate, "MMMM yyyy")}</h2>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date())}>Today</Button>
            <Button variant="outline" size="icon" onClick={() => setCurrentDate(subMonths(currentDate, 1))}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={() => setCurrentDate(addMonths(currentDate, 1))}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-7 border-b border-border bg-muted/20">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(day => (
            <div key={day} className="p-3 text-center text-sm font-medium text-muted-foreground">
              {day}
            </div>
          ))}
        </div>

        <div className="flex-1 grid grid-cols-7 grid-rows-5 overflow-hidden">
          {isLoading ? (
            Array.from({ length: 35 }).map((_, i) => (
              <div key={i} className="border-r border-b border-border p-2 min-h-[120px]">
                <Skeleton className="h-4 w-6 mb-2" />
                <Skeleton className="h-12 w-full mb-1" />
              </div>
            ))
          ) : (
            days.map((day, idx) => {
              const dateKey = format(day, "yyyy-MM-dd");
              const dayPosts = postsByDate[dateKey] || [];
              
              return (
                <div 
                  key={day.toISOString()} 
                  className={cn(
                    "border-border p-2 min-h-[120px] transition-colors overflow-y-auto",
                    "border-r border-b",
                    idx % 7 === 6 && "border-r-0",
                    !isSameMonth(day, monthStart) && "bg-muted/5 opacity-50",
                    isToday(day) && "bg-primary/5"
                  )}
                >
                  <div className={cn(
                    "text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full mb-2",
                    isToday(day) ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                  )}>
                    {format(day, "d")}
                  </div>
                  
                  <div className="space-y-1">
                    {dayPosts.map((post, i) => (
                      <div 
                        key={post.id} 
                        className={cn(
                          "text-xs p-1.5 rounded truncate border cursor-pointer hover:opacity-80 transition-opacity",
                          post.status === "published" ? "bg-muted/50 border-border text-muted-foreground" :
                          post.status === "scheduled" ? "bg-primary/10 border-primary/20 text-foreground" :
                          "bg-background border-border"
                        )}
                        onClick={() => setLocation(`/composer?post=${post.id}`)}
                      >
                        <span className="font-semibold mr-1">{format(new Date(post.scheduledAt || post.publishedAt), "HH:mm")}</span>
                        {post.caption || "Draft post"}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </Card>
    </div>
  );
}
