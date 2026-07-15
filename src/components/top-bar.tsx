import { SidebarTrigger } from "@/components/ui/sidebar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ROLES, useApp } from "@/context/app-context";
import { ChevronDown, UserCog } from "lucide-react";

export function TopBar() {
  const { conference, conferences, setConferenceId, role, setRole } = useApp();

  const statusColor =
    conference.status === "Live"
      ? "bg-success"
      : conference.status === "Planning"
        ? "bg-warning"
        : "bg-muted-foreground";

  return (
    <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b bg-background/80 px-3 backdrop-blur sm:px-4">
      <SidebarTrigger />

      <Select value={conference.id} onValueChange={setConferenceId}>
        <SelectTrigger className="h-9 w-[180px] sm:w-[240px]">
          <div className="flex items-center gap-2 truncate">
            <span className={`h-2 w-2 shrink-0 rounded-full ${statusColor}`} />
            <SelectValue />
          </div>
        </SelectTrigger>
        <SelectContent>
          {conferences.map((c) => (
            <SelectItem key={c.id} value={c.id}>
              {c.acronym} · {c.location}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Badge variant="secondary" className="hidden sm:inline-flex">
        {conference.status}
      </Badge>

      <div className="ml-auto flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-sm hover:bg-muted">
            <UserCog className="h-4 w-4 text-primary" />
            <span className="hidden font-medium sm:inline">{role}</span>
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>Viewing as (simulated)</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {ROLES.map((r) => (
              <DropdownMenuItem key={r} onClick={() => setRole(r)}>
                {r}
                {r === role && <span className="ml-auto text-primary">✓</span>}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <Avatar className="h-8 w-8">
          <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
            EM
          </AvatarFallback>
        </Avatar>
      </div>
    </header>
  );
}
