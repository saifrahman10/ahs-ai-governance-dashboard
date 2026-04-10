"use client"

import { useMemo, useState } from "react"
import {
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Info,
  Clock,
  Database,
  ChevronDown,
  ChevronRight,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { useDataset } from "@/lib/dataset-context"
import { GovernanceTrafficStrip } from "@/components/dashboard/governance-traffic-strip"
import { MetricHelpPopover, SectionLabelWithHelp } from "@/components/dashboard/metric-help-popover"
import {
  rollupGovernanceCategories,
  executiveSummaryLine,
  findWorstRecall,
} from "@/lib/governance-ui-helpers"
import { DEFAULT_THRESHOLDS } from "@/lib/types"
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts"

const tooltipStyle = {
  background: "var(--color-card)",
  border: "1px solid var(--color-border)",
  borderRadius: "6px",
  fontSize: "12px",
}

export function GovernanceDecisionPanel() {
  const { computedMetrics, viewMetrics, status, thresholds, parsedDataset } = useDataset()
  const [howToOpen, setHowToOpen] = useState(false)

  const isCustomThresholds = useMemo(
    () => (Object.keys(thresholds) as (keyof typeof thresholds)[]).some((k) => thresholds[k] !== DEFAULT_THRESHOLDS[k]),
    [thresholds]
  )

  const categoryRollup = useMemo(() => {
    if (!viewMetrics) return []
    return rollupGovernanceCategories(viewMetrics.governance.checks)
  }, [viewMetrics])

  const execLine = useMemo(() => {
    if (!viewMetrics) return ""
    const g = viewMetrics.governance
    return executiveSummaryLine(g.decision, g.failCount, g.warnCount)
  }, [viewMetrics])

  const worstRecall = useMemo(() => {
    if (!viewMetrics) return null
    return findWorstRecall(viewMetrics.subgroups)
  }, [viewMetrics])

  const failedChecks = useMemo(() => {
    if (!viewMetrics) return []
    return viewMetrics.governance.checks.filter((c) => c.status === "fail")
  }, [viewMetrics])

  const sparkData = useMemo(() => {
    if (!viewMetrics?.timeSeries || viewMetrics.timeSeries.length < 2) return []
    return viewMetrics.timeSeries.map((p) => ({
      period: p.period,
      recall: p.metrics.recall,
    }))
  }, [viewMetrics])

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

  const { governance } = viewMetrics
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
    <div className="flex flex-col gap-3">
      <Card className="border-border bg-card">
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1">
              <CardTitle className="text-sm font-medium text-foreground flex items-center gap-2 flex-wrap">
                <ShieldAlert className="size-4 text-primary" />
                <span className="flex items-center gap-1.5">
                  Governance Decision Summary
                  <MetricHelpPopover title="Governance decision summary">
                    <>
                      <p>
                        The overall PASS / NEEDS REVIEW / FAIL outcome is computed from all metric checks below, using
                        your configured thresholds (header → Thresholds).
                      </p>
                      <p>It supports oversight—not a substitute for institutional validation or clinical judgment.</p>
                    </>
                  </MetricHelpPopover>
                </span>
              </CardTitle>
              {parsedDataset && (
                <p className="text-[11px] text-muted-foreground">
                  Dataset: <span className="font-medium text-foreground">{parsedDataset.fileName}</span> ·{" "}
                  {parsedDataset.rowCount.toLocaleString()} rows
                </p>
              )}
              {isCustomThresholds && (
                <p className="text-[11px] text-warning">
                  Using non-default thresholds — adjust via the <span className="font-medium">Thresholds</span> button in
                  the header.
                </p>
              )}
            </div>
            <div className="flex items-center gap-1.5 text-muted-foreground shrink-0">
              <Clock className="size-3" />
              <span className="text-[10px]">{decisionDate}</span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Category health</span>
            <MetricHelpPopover title="Category health">
              <>
                <p>
                  Rolls up checks into four themes: fairness (FNR/PPV/recall), calibration (ECE), drift (PSI, prediction
                  KS, target shift), and sample size (smallest subgroup n).
                </p>
                <p>Fail overrides warning; this is a quick read before the detailed table.</p>
              </>
            </MetricHelpPopover>
          </div>
          <GovernanceTrafficStrip categories={categoryRollup} />
          <div className="flex items-start gap-2">
            <p className="text-sm text-foreground leading-relaxed border-l-2 border-primary/40 pl-3 flex-1">{execLine}</p>
            <MetricHelpPopover title="Executive summary" side="left" align="end" className="shrink-0 mt-0.5">
              <p>Plain-language interpretation of the current decision for stakeholders—derived from pass/warn/fail counts, not new calculations.</p>
            </MetricHelpPopover>
          </div>

          {/* Overall Decision */}
          <div className={`rounded-lg border-2 p-4 ${colors.border}`}>
            <div className="flex items-center justify-between mb-3 gap-2">
              <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                Current Decision
                <MetricHelpPopover title="Current decision">
                  <p>Shows the formal outcome, pass/warn/fail counts, and engine-generated reasoning lines from the metrics run.</p>
                </MetricHelpPopover>
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

          {failedChecks.length > 0 && (
            <div className="rounded-md border border-destructive/25 bg-destructive/5 px-3 py-2.5">
              <div className="mb-2">
                <SectionLabelWithHelp
                  helpTitle="Failed checks"
                  helpContent={
                    <p>Lists checks with FAIL status. Compare the observed value to the threshold—remediate or justify before production use.</p>
                  }
                >
                  Failed checks (address first)
                </SectionLabelWithHelp>
              </div>
              <ul className="space-y-1.5">
                {failedChecks.map((c) => (
                  <li key={c.name} className="flex items-start justify-between gap-2 text-xs">
                    <span className="text-foreground font-medium">{c.name}</span>
                    <span className="font-mono tabular-nums text-muted-foreground shrink-0">
                      {c.value} vs {c.threshold}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {worstRecall && (
            <div className="rounded-md border border-border bg-secondary/30 px-3 py-2.5">
              <div className="mb-1">
                <SectionLabelWithHelp
                  helpTitle="Lowest subgroup recall"
                  helpContent={
                    <p>
                      Across all subgroup splits, the subgroup with the smallest recall (among groups with at least one
                      positive). Highlights where the model may miss the most cases.
                    </p>
                  }
                >
                  Lowest subgroup recall
                </SectionLabelWithHelp>
              </div>
              <p className="text-xs text-foreground">
                <span className="font-mono tabular-nums">{(worstRecall.recall * 100).toFixed(1)}%</span>
                <span className="text-muted-foreground"> — {worstRecall.label}</span>
              </p>
            </div>
          )}

          {sparkData.length > 1 && (
            <div className="rounded-md border border-border bg-card px-3 py-2">
              <div className="flex items-center gap-1.5 mb-2">
                <SectionLabelWithHelp
                  helpTitle="Recall trend"
                  helpContent={
                    <p>
                      Mini time series of overall recall when your data has a mapped service month with two or more
                      distinct periods. For trend interpretation, use the Drift tab.
                    </p>
                  }
                >
                  Overall recall trend (by service month)
                </SectionLabelWithHelp>
              </div>
              <div className="h-14 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={sparkData} margin={{ top: 2, right: 4, left: -28, bottom: 0 }}>
                    <XAxis dataKey="period" tick={{ fontSize: 9 }} hide={sparkData.length > 8} />
                    <YAxis domain={[0, 1]} tick={{ fontSize: 9 }} width={32} tickFormatter={(v) => `${(v * 100).toFixed(0)}%`} />
                    <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [`${(v * 100).toFixed(1)}%`, "Recall"]} />
                    <Line type="monotone" dataKey="recall" stroke="var(--color-chart-1)" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          <Collapsible open={howToOpen} onOpenChange={setHowToOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full justify-between px-2 h-9 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  How to read this dashboard
                  <MetricHelpPopover title="Dashboard overview">
                    <p>Same tips as the expandable section—open the row below for the full short guide to each tab.</p>
                  </MetricHelpPopover>
                </span>
                {howToOpen ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="rounded-md border border-border bg-secondary/40 px-3 py-3 text-xs text-muted-foreground space-y-2 leading-relaxed">
              <p>
                Each tab focuses on one part of model oversight: <strong className="text-foreground">Overview</strong>{" "}
                for the decision, <strong className="text-foreground">Fairness</strong> for subgroup gaps,{" "}
                <strong className="text-foreground">Drift</strong> for changes over time and between reference/current
                data, and <strong className="text-foreground">Model performance</strong> for calibration and
                subgroup metrics.
              </p>
              <p>
                Green / amber / red on checks reflect whether values meet your configured governance thresholds—not
                clinical diagnosis.
              </p>
            </CollapsibleContent>
          </Collapsible>

          {/* Metric breakdown */}
          <div className="flex flex-col gap-1.5">
            <div className="mb-1">
              <SectionLabelWithHelp
                helpTitle="Metric breakdown"
                helpContent={
                  <p>
                    Each row is one governance check: observed value, threshold string, and pass / review / fail. These
                    are the same inputs used to compute the overall decision.
                  </p>
                }
              >
                Metric Breakdown
              </SectionLabelWithHelp>
            </div>
            {governance.checks.map((check) => (
              <div
                key={check.name}
                className="flex items-center justify-between rounded-md bg-secondary/50 border border-border px-3 py-2"
              >
                <div className="flex items-center gap-2 min-w-0">
                  {check.status === "pass" && <CheckCircle2 className="size-3.5 text-success shrink-0" />}
                  {check.status === "warning" && <AlertTriangle className="size-3.5 text-warning shrink-0" />}
                  {check.status === "fail" && <XCircle className="size-3.5 text-destructive shrink-0" />}
                  <span className="text-xs text-foreground truncate">{check.name}</span>
                </div>
                <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                  <span className="text-xs font-mono text-foreground tabular-nums">{check.value}</span>
                  <span className="text-[10px] text-muted-foreground hidden sm:inline">({check.threshold})</span>
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
        </CardContent>
      </Card>
    </div>
  )
}
