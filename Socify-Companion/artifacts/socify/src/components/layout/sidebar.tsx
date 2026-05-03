import { Link, useLocation } from "wouter";
import { useStore } from "@/store/use-store";
import { 
  LayoutDashboard, 
  Inbox, 
  PenSquare, 
  CalendarDays, 
  LineChart, 
  Users, 
  Target, 
  Ear, 
  Workflow, 
  Settings,
  LogOut,
  Command,
  UserCheck,
  Link2,
  Shield,
  Bell,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useGetWorkspace, useListNotifications, getListNotificationsQueryKey } from "@workspace/api-client-react";

const navSections = [
  {
    label: "Publish",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/inbox", label: "Inbox", icon: Inbox },
      { href: "/composer", label: "Composer", icon: PenSquare },
      { href: "/calendar", label: "Calendar", icon: CalendarDays },
    ],
  },
  {
    label: "Grow",
    items: [
      { href: "/analytics", label: "Analytics", icon: LineChart },
      { href: "/listening", label: "Listening", icon: Ear },
      { href: "/influencers", label: "Influencers", icon: UserCheck },
    ],
  },
  {
    label: "Convert",
    items: [
      { href: "/crm", label: "CRM", icon: Users },
      { href: "/campaigns", label: "Campaigns", icon: Target },
      { href: "/link-in-bio", label: "Link in Bio", icon: Link2 },
    ],
  },
  {
    label: "Manage",
    items: [
      { href: "/automations", label: "Automations", icon: Workflow },
      { href: "/notifications", label: "Notifications", icon: Bell },
      { href: "/settings", label: "Settings", icon: Settings },
      { href: "/admin", label: "Admin", icon: Shield },
    ],
  },
];

export function Sidebar() {
  const [location] = useLocation();
  const { workspaceId, user, logout } = useStore();
  const { data: workspace } = useGetWorkspace(workspaceId);
  const { data: notifications } = useListNotifications(
    { workspaceId, unreadOnly: true },
    { query: { enabled: !!workspaceId, queryKey: getListNotificationsQueryKey({ workspaceId, unreadOnly: true }) } }
  );
  const unreadCount = notifications?.length ?? 0;

  return (
    <aside className="w-64 border-r border-border bg-sidebar text-sidebar-foreground flex flex-col">
      <div className="p-4 flex items-center gap-3 border-b border-sidebar-border">
        <div className="bg-primary text-primary-foreground p-1.5 rounded-md">
          <Command className="w-5 h-5" />
        </div>
        <div className="flex flex-col">
          <span className="font-bold text-sm tracking-wide text-foreground">SOCIFY</span>
          <span className="text-xs text-muted-foreground">{workspace?.name || "Workspace"}</span>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto p-3 space-y-4">
        {navSections.map((section) => (
          <div key={section.label}>
            <p className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-widest px-3 mb-1">
              {section.label}
            </p>
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const Icon = item.icon;
                const isActive = location === item.href || location.startsWith(item.href + "/");
                const badge = item.href === "/notifications" && unreadCount > 0 ? unreadCount : null;
                return (
                  <Link key={item.href} href={item.href}>
                    <div
                      className={cn(
                        "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer",
                        isActive
                          ? "bg-sidebar-accent text-sidebar-accent-foreground"
                          : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                      )}
                    >
                      <Icon className="w-4 h-4" />
                      <span className="flex-1">{item.label}</span>
                      {badge !== null && (
                        <span className="min-w-4 h-4 px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center leading-none">
                          {badge > 99 ? "99+" : badge}
                        </span>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="p-4 border-t border-sidebar-border flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Avatar className="w-8 h-8">
            <AvatarImage src={user?.avatar || undefined} />
            <AvatarFallback>{user?.name?.[0] || "U"}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col overflow-hidden">
            <span className="text-sm font-medium truncate">{user?.name}</span>
            <span className="text-xs text-muted-foreground truncate">{user?.email}</span>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={() => logout()} className="text-muted-foreground hover:text-foreground">
          <LogOut className="w-4 h-4" />
        </Button>
      </div>
    </aside>
  );
}
