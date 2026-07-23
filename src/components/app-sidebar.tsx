import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  CalendarSearch,
  CalendarRange,
  
  ListChecks,
  BellRing,
  Target,
  Lightbulb,
  Radio,
  Camera,
  Sparkles,
  MessagesSquare,
  FileStack,
  Table2,
  Combine,
  FileOutput,
  Activity,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

const groups = [
  {
    label: "Overview",
    items: [
      { title: "Portfolio", url: "/", icon: LayoutDashboard, exact: true },
      { title: "Conference Dashboard", url: "/dashboard", icon: Activity },
    ],
  },
  {
    label: "Module A · Pre-Conference",
    items: [
      { title: "Conference Calendar", url: "/pre/extraction", icon: CalendarRange },
      { title: "Session Planner", url: "/pre/planner", icon: CalendarSearch },
      { title: "LBA Monitor", url: "/pre/lba", icon: BellRing },
      { title: "KIT / KIQ Builder", url: "/pre/kitkiq", icon: ListChecks },
      { title: "Hypothesis Engine", url: "/pre/hypotheses", icon: Lightbulb },
    ],
  },
  {
    label: "Module B · During",
    items: [
      { title: "Live Dashboard", url: "/live/dashboard", icon: Radio },
      { title: "Evidence Capture", url: "/live/capture", icon: Camera },
      { title: "Live AI Insights", url: "/live/insights", icon: Sparkles },
      { title: "Collaboration", url: "/live/collab", icon: MessagesSquare },
      { title: "KIQ Tracker", url: "/live/kiq", icon: Target },
    ],
  },
  {
    label: "Module C · Post-Conference",
    items: [
      { title: "Bulk Summarization", url: "/post/summaries", icon: FileStack },
      { title: "Endpoint Extractor", url: "/post/endpoints", icon: Table2 },
      { title: "Insight Synthesis", url: "/post/synthesis", icon: Combine },
      { title: "Deliverables", url: "/post/deliverables", icon: FileOutput },
    ],
  },
];

export function AppSidebar() {
  const currentPath = useRouterState({ select: (r) => r.location.pathname });
  const isActive = (url: string, exact?: boolean) =>
    exact ? currentPath === url : currentPath === url || currentPath.startsWith(url + "/");

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="px-3 py-4">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
            <span className="font-display text-sm font-bold">V</span>
          </div>
          <div className="flex flex-col leading-none group-data-[collapsible=icon]:hidden">
            <span className="font-display text-base font-bold tracking-tight text-sidebar-foreground">
              Pharma<span className="text-sidebar-primary">lix</span>
            </span>
            <span className="text-[10px] uppercase tracking-widest text-sidebar-foreground/50">
              Conference Intelligence
            </span>
          </div>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        {groups.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive(item.url, item.exact)}
                      tooltip={item.title}
                    >
                      <Link to={item.url} className="flex items-center gap-2">
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
    </Sidebar>
  );
}
