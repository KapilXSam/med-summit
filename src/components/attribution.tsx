import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, ShieldAlert, ShieldQuestion } from "lucide-react";

/** Confidence score badge (1-10 scale or 0-100 percent). */
export function ConfidenceBadge({
  score,
  scale = 10,
  className,
}: {
  score: number;
  scale?: 10 | 100;
  className?: string;
}) {
  const pct = scale === 100 ? score : score * 10;
  const level = pct >= 80 ? "high" : pct >= 70 ? "mid" : "low";
  const Icon =
    level === "high" ? ShieldCheck : level === "mid" ? ShieldQuestion : ShieldAlert;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium tabular-nums",
        level === "high" && "border-success/30 bg-success/10 text-success",
        level === "mid" && "border-warning/30 bg-warning/10 text-warning",
        level === "low" && "border-destructive/30 bg-destructive/10 text-destructive",
        className,
      )}
    >
      <Icon className="h-3 w-3" />
      {scale === 100 ? `${score}%` : `${score}/10`}
    </span>
  );
}

/** Source attribution chip — quote, page, and origin. */
export function SourceChip({
  quote,
  page,
}: {
  quote: string;
  page: number;
}) {
  return (
    <div className="rounded-md border border-dashed bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
      <div className="mb-1 flex items-center gap-2 font-medium text-foreground/70">
        <Badge variant="outline" className="h-5 rounded-sm px-1.5 text-[10px]">
          Source · p.{page}
        </Badge>
      </div>
      <span className="italic">“{quote}”</span>
    </div>
  );
}

export function ExtractionMark() {
  return (
    <Badge
      variant="outline"
      className="h-5 rounded-sm border-success/30 bg-success/10 px-1.5 text-[10px] font-medium text-success"
    >
      direct extraction
    </Badge>
  );
}
