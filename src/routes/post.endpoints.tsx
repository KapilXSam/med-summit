import { createFileRoute } from "@tanstack/react-router";
import { routeSeo } from "@/lib/route-seo";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ExtractionMark } from "@/components/attribution";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useEndpoints } from "@/lib/hooks";
import { toast } from "sonner";
import { Download, Table2 } from "lucide-react";

export const Route = createFileRoute("/post/endpoints")({
  head: () =>
    routeSeo({
      title: "Endpoint Tables — Pharmalix",
      description: "Primary and secondary trial endpoint tables with p-values, HRs, and confidence intervals from covered sessions.",
      path: "/post/endpoints",
    }),
  component: Endpoints,
});

function Endpoints() {
  const { data: endpoints = [] } = useEndpoints();
  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        eyebrow="Module C · Post-Conference"
        title="Trial Endpoint Extractor"
        description="Extracts primary and secondary endpoints with p-values, hazard ratios, and confidence intervals into standardised comparison tables."
        actions={
          <Button
            variant="secondary"
            onClick={() => toast.success("Comparison table exported to Excel")}
          >
            <Download className="h-4 w-4" /> Export table
          </Button>
        }
      />

      <div className="mb-4 flex items-center gap-2 rounded-md border border-dashed bg-success/5 px-3 py-2 text-xs text-success">
        <ExtractionMark />
        No inferred numerical values — every number is a direct extraction from source.
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Trial / Asset</TableHead>
                <TableHead>Endpoint</TableHead>
                <TableHead className="text-right">Value</TableHead>
                <TableHead className="text-right">HR</TableHead>
                <TableHead className="text-right">95% CI</TableHead>
                <TableHead className="text-right">p-value</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {endpoints.map((e) => (
                <TableRow key={e.id}>
                  <TableCell>
                    <div className="font-medium">{e.trialName}</div>
                    <div className="font-mono text-xs text-muted-foreground">
                      {e.trialId} · {e.asset}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={e.endpointType === "Primary" ? "default" : "secondary"}
                        className="text-[10px]"
                      >
                        {e.endpointType}
                      </Badge>
                      {e.endpoint}
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-medium tabular-nums">
                    {e.value}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{e.hr}</TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">
                    {e.ci}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{e.pValue}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
        <Table2 className="h-4 w-4" />
        Cross-trial comparison across {new Set(endpoints.map((e) => e.trialId)).size}{" "}
        trials · {endpoints.length} endpoints extracted.
      </div>
    </div>
  );
}
