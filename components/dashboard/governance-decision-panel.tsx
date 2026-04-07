"use client"

import {
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Info,
  Clock,
  Database,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useDataset } from "@/lib/dataset-context"

export function GovernanceDecisionPanel() {
  const { computedMetrics, status } = useDataset()

  if (status !== "ready" || !computedMetrics) {
    return (
      <Card className="border-border bg-card">
        <CardContent className="py-12">
          <div className="flex flex-col items-center gap-3 text-muted-foreground">
            <Database className="size-8" />
            <div className="text-center">
              <p className="text-sm font-medium">No Data Loaded</p>
              <p className="text-xs mt-1">Upload a dataset to see governance decisions</p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  const { governance } = computedMetrics
  const decisionDate = new Date(governance.timestamp).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })

  const decisionColors = {
    PASS: {
      border: "border-success/30 bg-success/5",
      badge: "bg-success text-success-foreground",
    },
    NEEDS_REVIEW: {
      border: "border-warning/30 bg-warning/5",
      badge: "bg-warning text-warning-foreground",
    },
    FAIL: {
      border: "border-destructive/30 bg-destructive/5",
      badge: "bg-destructive text-destructive-foreground",
    },
  }

  const colors = decisionColors[governance.decision]

  return (
    <Card className="border-border bg-card">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-foreground flex items-center gap-2">
            <ShieldAlert className="size-4 text-primary" />
            Governance Decision Summary
          </CardTitle>
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Clock className="size-3" />
            <span className="text-[10px]">{decisionDate}</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {/* Overall Decision */}
        <div className={`rounded-lg border-2 p-4 ${colors.border}`}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
              Current Decision
            </span>
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <CheckCircle2 className="size-3 text-success" />
                {governance.passCount}
              </span>
              <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <AlertTriangle className="size-3 text-warning" />
                {governance.warnCount}
              </span>
              <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <XCircle className="size-3 text-destructive" />
                {governance.failCount}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3 mb-3">
            <Badge className={`px-3 py-1 text-sm font-semibold border-0 ${colors.badge}`}>
              {governance.decision.replace("_", " ")}
            </Badge>
          </div>
          <div className="flex flex-col gap-1.5">
            {governance.reasoning.map((r, i) => (
              <div key={i} className="flex items-start gap-2">
                <Info className="size-3.5 text-primary shrink-0 mt-0.5" />
                <p className="text-xs text-foreground leading-relaxed">{r}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Metric breakdown */}
        <div className="flex flex-col gap-1.5">
          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1">
            Metric Breakdown
          </p>
          {governance.checks.map((check) => (
            <div
              key={check.name}
              className="flex items-center justify-between rounded-md bg-secondary/50 border border-border px-3 py-2"
            >
              <div className="flex items-center gap-2">
                {check.status === "pass" && <CheckCircle2 className="size-3.5 text-success" />}
                {check.status === "warning" && <AlertTriangle className="size-3.5 text-warning" />}
                {check.status === "fail" && <XCircle className="size-3.5 text-destructive" />}
                <span className="text-xs text-foreground">{check.name}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs font-mono text-foreground tabular-nums">{check.value}</span>
                <span className="text-[10px] text-muted-foreground">({check.threshold})</span>
                <Badge
                  variant="outline"
                  className={`text-[10px] px-1.5 py-0 font-medium ${
                    check.status === "pass"
                      ? "bg-success/10 text-success border-success/20"
                      : check.status === "warning"
                      ? "bg-warning/10 text-warning border-warning/20"
                      : "bg-destructive/10 text-destructive border-destructive/20"
                  }`}
                >
                  {check.status === "pass" ? "PASS" : check.status === "warning" ? "REVIEW" : "FAIL"}
                </Badge>
              </div>
            </div>
          ))}
        </div>

        {/* Decision logic */}
        <div className="rounded-md bg-secondary/50 border border-border px-3 py-2.5">
          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-2">
            Decision Logic
          </p>
          <div className="flex flex-col gap-1">
            <p className="text-[11px] text-muted-foreground font-mono">
              All pass {"&"} n{"\u2265"}50 {"→"} PASS
            </p>
            <p className="text-[11px] text-muted-foreground font-mono">
              1 metric {"<"}20% over OR n{"<"}50 {"→"} NEEDS REVIEW
            </p>
            <p className="text-[11px] text-muted-foreground font-mono">
              {"\u2265"}20% over OR 2+ fail {"→"} FAIL
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
