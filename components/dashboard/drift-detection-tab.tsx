"use client"

import { useMemo, useState } from "react"
import { Activity, AlertTriangle, Wrench, Database } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ReferenceLine,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
} from "recharts"
import { useDataset } from "@/lib/dataset-context"
import type { TimeSeriesPoint } from "@/lib/types"
import { MetricHelpPopover } from "@/components/dashboard/metric-help-popover"

const CHART_COLORS = [
  "var(--color-chart-1)",
  "var(--color-chart-2)",
  "var(--color-chart-3)",
  "var(--color-chart-4)",
  "var(--color-chart-5)",
]

const MAX_TIME_POINTS = 24
const TOP_SUBGROUP_LINES = 5

const tooltipStyle = {
  background: "var(--color-card)",
  border: "1px solid var(--color-border)",
  borderRadius: "6px",
  fontSize: "12px",
}

function statusColor(status: string) {
  if (status === "stable") return "bg-success/10 text-success border-success/20"
  if (status === "investigate") return "bg-warning/10 text-warning border-warning/20"
  return "bg-destructive/10 text-destructive border-destructive/20"
}

function downsamplePeriods<T extends { period: string }>(points: T[], maxPoints: number): T[] {
  if (points.length <= maxPoints) return points
  const step = (points.length - 1) / (maxPoints - 1)
  const out: T[] = []
  for (let i = 0; i < maxPoints; i++) {
    const idx = Math.min(points.length - 1, Math.round(i * step))
    out.push(points[idx])
  }
  return out
}

function topSubgroupNamesByMaxFnr(
  subgroupTimeData: TimeSeriesPoint[],
  allNames: string[],
  topN: number
): string[] {
  if (allNames.length <= topN) return allNames
  const maxFnr = new Map<string, number>()
  for (const name of allNames) maxFnr.set(name, 0)
  for (const pt of subgroupTimeData) {
    for (const name of allNames) {
      const v = pt.metrics[`${name}_fnr`] as number | undefined
      if (v !== undefined) maxFnr.set(name, Math.max(maxFnr.get(name)!, v))
    }
  }
  return [...allNames].sort((a, b) => (maxFnr.get(b)! - maxFnr.get(a)!)).slice(0, topN)
}

export function DriftDetectionTab() {
  const { viewMetrics, status, columnMapping } = useDataset()
  const [selectedSubgroupCol, setSelectedSubgroupCol] = useState<string>("")
  const [perfMetric, setPerfMetric] = useState<"recall" | "fnr" | "ece">("recall")
  const [perfView, setPerfView] = useState<"chart" | "table">("chart")
  const [showAllSubgroupLines, setShowAllSubgroupLines] = useState(false)

  const groupColumns = useMemo(() => {
    if (!viewMetrics) return []
    return Object.keys(viewMetrics.subgroupTimeSeries)
  }, [viewMetrics])

  const activeSubgroupCol = selectedSubgroupCol || groupColumns[0] || ""

  const featureDrift = viewMetrics?.featureDrift ?? []
  const predictionDrift = viewMetrics?.predictionDrift
  const targetDrift = viewMetrics?.targetDrift
  const dataQuality = viewMetrics?.dataQuality
  const rawTimeSeries = viewMetrics?.timeSeries ?? []
  const subgroupTimeSeries = viewMetrics?.subgroupTimeSeries ?? {}

  const subgroupTimeData = subgroupTimeSeries[activeSubgroupCol] ?? []

  const subgroupNames = useMemo(() => {
    if (subgroupTimeData.length === 0) return []
    const keys = Object.keys(subgroupTimeData[0]?.metrics ?? {})
    return [...new Set(keys.filter((k) => k.endsWith("_fnr")).map((k) => k.replace("_fnr", "")))]
  }, [subgroupTimeData])

  const visibleSubgroupNames = useMemo(() => {
    if (showAllSubgroupLines) return subgroupNames
    return topSubgroupNamesByMaxFnr(subgroupTimeData, subgroupNames, TOP_SUBGROUP_LINES)
  }, [subgroupTimeData, subgroupNames, showAllSubgroupLines])

  const perfChartData = useMemo(() => {
    const sampled = downsamplePeriods(rawTimeSeries, MAX_TIME_POINTS)
    return sampled.map((p) => ({
      period: p.period,
      recall: p.metrics.recall,
      fnr: p.metrics.fnr,
      ece: p.metrics.ece,
    }))
  }, [rawTimeSeries])

  const perfDataKey = perfMetric === "recall" ? "recall" : perfMetric === "fnr" ? "fnr" : "ece"
  const perfLabel = perfMetric === "recall" ? "Recall" : perfMetric === "fnr" ? "False negative rate" : "ECE"

  const actions = useMemo(() => {
    if (!targetDrift) return []
    const result: { trigger: string; action: string; severity: "critical" | "warning" }[] = []
    for (const d of featureDrift) {
      if (d.status === "severe") {
        result.push({ trigger: `${d.feature} PSI > 0.2`, action: "Trigger retraining discussion with clinical team", severity: "critical" })
      } else if (d.status === "investigate") {
        result.push({ trigger: `${d.feature} PSI ${d.psi.toFixed(2)}`, action: "Investigate root cause of distribution shift", severity: "warning" })
      }
    }
    if (targetDrift.status !== "stable") {
      result.push({ trigger: `Target drift ${(targetDrift.absoluteShift * 100).toFixed(1)}%`, action: "Investigate root cause of label shift", severity: targetDrift.status === "severe" ? "critical" : "warning" })
    }
    return result.slice(0, 5)
  }, [featureDrift, targetDrift])

  if (status !== "ready" || !viewMetrics || !predictionDrift || !targetDrift || !dataQuality) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
        <Database className="size-10 mb-3" />
        <p className="text-sm font-medium">No Data Loaded</p>
        <p className="text-xs mt-1">Upload a dataset to view drift detection</p>
      </div>
    )
  }

  const driftCards = [
    {
      label: featureDrift.length > 0 ? `PSI (${featureDrift[0].feature})` : "PSI Max",
      value: featureDrift.length > 0 ? featureDrift[0].psi.toFixed(3) : "—",
      status: featureDrift.length > 0 ? featureDrift[0].status : "stable",
      action: featureDrift.length > 0 && featureDrift[0].status === "severe" ? "RETRAIN" : null,
    },
    {
      label: "Prediction Drift (KS)",
      value: predictionDrift.ksStatistic.toFixed(3),
      status: predictionDrift.status,
      action: null,
    },
    {
      label: "Target Drift",
      value: `${(targetDrift.absoluteShift * 100).toFixed(2)}%`,
      status: targetDrift.status,
      action: null,
    },
    {
      label: "Missing Data",
      value: `${(dataQuality.overallMissingness * 100).toFixed(1)}%`,
      status: dataQuality.overallMissingness < 0.05 ? "stable" : dataQuality.overallMissingness < 0.15 ? "investigate" : "severe",
      action: null,
    },
  ]

  const featureDriftBarData = featureDrift.slice(0, 15).map((d) => ({
    feature: d.feature.length > 20 ? d.feature.slice(0, 18) + "…" : d.feature,
    psi: d.psi,
    ks: d.ksStatistic,
    status: d.status,
    fill: d.status === "severe" ? "var(--color-chart-2)" : d.status === "investigate" ? "var(--color-chart-3)" : "var(--color-chart-1)",
  }))

  const serviceMonthHint =
    columnMapping?.serviceMonth
      ? `Trend charts need at least two distinct values in ${columnMapping.serviceMonth}.`
      : "Map a Service Month / time column to enable trend charts."

  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="flex items-center gap-2 flex-wrap">
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Activity className="size-5 text-primary" />
            Model Stability Monitoring
          </h2>
          <MetricHelpPopover title="Drift detection tab">
            <>
              <p>
                Compares reference vs current data where your CSV defines periods. PSI and KS describe input and score
                shifts; time charts need a mapped service month with multiple values.
              </p>
              <p>Use one metric at a time on performance-over-time charts to reduce clutter.</p>
            </>
          </MetricHelpPopover>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          Feature distribution drift, performance drift by subgroup, and calibration monitoring
        </p>
      </div>

      {/* Drift metric cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {driftCards.map((m) => (
          <Card key={m.label} className="border-border bg-card">
            <CardContent className="pt-4 pb-4 px-4">
              <p className="text-xs text-muted-foreground mb-1">{m.label}</p>
              <div className="flex items-end gap-2 mb-2">
                <span className="text-xl font-semibold font-mono text-foreground tabular-nums">{m.value}</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className={`text-[10px] px-1.5 py-0 font-medium ${statusColor(m.status)}`}>
                  {m.status.toUpperCase()}
                </Badge>
                {m.action && (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-medium bg-destructive/10 text-destructive border-destructive/20">
                    {m.action}
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <p className="text-xs text-muted-foreground rounded-md border border-border bg-secondary/40 px-3 py-2">{serviceMonthHint}</p>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {featureDriftBarData.length > 0 && (
          <Card className="border-border bg-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-foreground flex items-center gap-1.5">
                Feature Drift (PSI)
                <MetricHelpPopover title="Feature drift (PSI)">
                  <p>
                    Horizontal bars: PSI measures how each feature’s distribution shifted between reference and current.
                    Dashed lines mark common investigation thresholds (0.1, 0.2).
                  </p>
                </MetricHelpPopover>
              </CardTitle>
              <CardDescription className="text-xs">Top features by Population Stability Index</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={featureDriftBarData} layout="vertical" margin={{ top: 5, right: 10, left: 5, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="feature" width={120} tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }} axisLine={false} tickLine={false} />
                  <ReferenceLine x={0.1} stroke="var(--color-warning)" strokeDasharray="4 4" strokeWidth={1} />
                  <ReferenceLine x={0.2} stroke="var(--color-destructive)" strokeDasharray="4 4" strokeWidth={1} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [v.toFixed(4), "PSI"]} />
                  <Bar dataKey="psi" radius={[0, 4, 4, 0]} maxBarSize={20}>
                    {featureDriftBarData.map((entry, idx) => (
                      <Cell key={idx} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {rawTimeSeries.length > 1 && (
          <Card className="border-border bg-card">
            <CardHeader className="pb-2 space-y-3">
              <div>
                <CardTitle className="text-sm font-medium text-foreground flex items-center gap-1.5 flex-wrap">
                  Performance Over Time
                  <MetricHelpPopover title="Performance over time">
                    <>
                      <p>
                        Y-axis is 0–100%. Pick Recall, FNR, or ECE; reference lines mark common governance cutoffs for
                        recall and FNR.
                      </p>
                      <p>Table view shows the same data as numbers. Periods come from your service month column.</p>
                    </>
                  </MetricHelpPopover>
                </CardTitle>
                <CardDescription className="text-xs">
                  One metric at a time · up to {MAX_TIME_POINTS} points for readability
                  {rawTimeSeries.length > MAX_TIME_POINTS ? ` (${rawTimeSeries.length} periods sampled)` : ""}
                </CardDescription>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <Tabs value={perfMetric} onValueChange={(v) => setPerfMetric(v as typeof perfMetric)} className="w-full sm:w-auto">
                  <TabsList className="h-8 w-full sm:w-auto">
                    <TabsTrigger value="recall" className="text-xs px-2">
                      Recall
                    </TabsTrigger>
                    <TabsTrigger value="fnr" className="text-xs px-2">
                      FNR
                    </TabsTrigger>
                    <TabsTrigger value="ece" className="text-xs px-2">
                      ECE
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
                <div className="flex items-center gap-2">
                  <Switch id="perf-table" checked={perfView === "table"} onCheckedChange={(c) => setPerfView(c ? "table" : "chart")} />
                  <Label htmlFor="perf-table" className="text-xs text-muted-foreground cursor-pointer">
                    Table view
                  </Label>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {perfView === "chart" ? (
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={perfChartData} margin={{ top: 8, right: 12, left: 4, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} strokeOpacity={0.5} />
                    <XAxis dataKey="period" tick={{ fontSize: 9, fill: "var(--color-muted-foreground)" }} axisLine={{ stroke: "var(--color-border)" }} tickLine={false} interval="preserveStartEnd" />
                    <YAxis domain={[0, 1]} tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `${(v * 100).toFixed(0)}%`} width={40} />
                    {perfMetric === "recall" && <ReferenceLine y={0.85} stroke="var(--color-destructive)" strokeDasharray="4 4" strokeWidth={1} />}
                    {perfMetric === "fnr" && <ReferenceLine y={0.08} stroke="var(--color-destructive)" strokeDasharray="4 4" strokeWidth={1} />}
                    <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [`${(v * 100).toFixed(1)}%`, perfLabel]} />
                    <Line type="monotone" dataKey={perfDataKey} name={perfLabel} stroke="var(--color-chart-1)" strokeWidth={2.5} dot={{ r: 3 }} isAnimationActive={false} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="max-h-[260px] overflow-auto rounded-md border border-border">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="text-xs">Period</TableHead>
                        <TableHead className="text-xs text-right">Recall</TableHead>
                        <TableHead className="text-xs text-right">FNR</TableHead>
                        <TableHead className="text-xs text-right">ECE</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {downsamplePeriods(perfChartData, 48).map((row) => (
                        <TableRow key={row.period}>
                          <TableCell className="text-xs font-mono">{row.period}</TableCell>
                          <TableCell className="text-xs text-right tabular-nums">{(row.recall * 100).toFixed(1)}%</TableCell>
                          <TableCell className="text-xs text-right tabular-nums">{(row.fnr * 100).toFixed(1)}%</TableCell>
                          <TableCell className="text-xs text-right tabular-nums">{row.ece.toFixed(3)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {subgroupTimeData.length > 1 && subgroupNames.length > 0 && (
        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <CardTitle className="text-sm font-medium text-foreground flex items-center gap-1.5 flex-wrap">
                  FNR by Subgroup Over Time
                  <MetricHelpPopover title="FNR by subgroup over time">
                    <>
                      <p>Each line is one subgroup value’s false negative rate across service months for the selected demographic column.</p>
                      <p>By default only the top {TOP_SUBGROUP_LINES} subgroups by peak FNR are shown—enable “Show all groups” to compare everyone.</p>
                    </>
                  </MetricHelpPopover>
                </CardTitle>
                <CardDescription className="text-xs">
                  Showing up to {TOP_SUBGROUP_LINES} subgroups with highest peak FNR
                  {showAllSubgroupLines ? ` (all ${subgroupNames.length} groups)` : ""}
                </CardDescription>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                {groupColumns.length > 1 && (
                  <Select value={activeSubgroupCol} onValueChange={setSelectedSubgroupCol}>
                    <SelectTrigger className="w-44 h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {groupColumns.map((col) => (
                        <SelectItem key={col} value={col}>
                          {col}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                <div className="flex items-center gap-2">
                  <Switch id="all-sub" checked={showAllSubgroupLines} onCheckedChange={setShowAllSubgroupLines} />
                  <Label htmlFor="all-sub" className="text-xs text-muted-foreground cursor-pointer whitespace-nowrap">
                    Show all groups
                  </Label>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={downsamplePeriods(subgroupTimeData, MAX_TIME_POINTS)} margin={{ top: 8, right: 8, left: 4, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} strokeOpacity={0.5} />
                <XAxis dataKey="period" tick={{ fontSize: 9, fill: "var(--color-muted-foreground)" }} axisLine={{ stroke: "var(--color-border)" }} tickLine={false} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }} axisLine={false} tickLine={false} domain={[0, "auto"]} tickFormatter={(v: number) => `${(v * 100).toFixed(0)}%`} width={40} />
                <ReferenceLine y={0.08} stroke="var(--color-destructive)" strokeDasharray="4 4" strokeWidth={1} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number, name: string) => [`${(v * 100).toFixed(1)}%`, name]} />
                {visibleSubgroupNames.map((name, i) => (
                  <Line
                    key={name}
                    type="monotone"
                    dataKey={`metrics.${name}_fnr`}
                    name={name}
                    stroke={CHART_COLORS[i % CHART_COLORS.length]}
                    strokeWidth={visibleSubgroupNames.length > 8 ? 1 : 1.75}
                    dot={false}
                    isAnimationActive={false}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {featureDrift.length > 0 && (
        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-foreground flex items-center gap-1.5">
              Feature Drift Detail
              <MetricHelpPopover title="Feature drift detail">
                <p>Full table of PSI and KS for every monitored feature. Status uses the same bands as the governance engine.</p>
              </MetricHelpPopover>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-xs text-muted-foreground font-medium">Feature</TableHead>
                  <TableHead className="text-xs text-muted-foreground font-medium">PSI</TableHead>
                  <TableHead className="text-xs text-muted-foreground font-medium">KS Statistic</TableHead>
                  <TableHead className="text-xs text-muted-foreground font-medium text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {featureDrift.map((d) => (
                  <TableRow key={d.feature}>
                    <TableCell className="text-xs text-foreground">{d.feature}</TableCell>
                    <TableCell className="text-xs font-mono text-foreground tabular-nums">{d.psi.toFixed(4)}</TableCell>
                    <TableCell className="text-xs font-mono text-foreground tabular-nums">{d.ksStatistic.toFixed(4)}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant="outline" className={`text-[10px] px-1.5 py-0 font-medium ${statusColor(d.status)}`}>
                        {d.status.toUpperCase()}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {actions.length > 0 && (
        <Card className="border-primary/20 bg-primary/[0.02]">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-foreground flex items-center gap-2 flex-wrap">
              <Wrench className="size-4 text-primary shrink-0" />
              <span className="flex items-center gap-1.5">
                Recommended Actions
                <MetricHelpPopover title="Recommended actions">
                  <p>Suggested follow-ups from severe drift and notable target shift—operational guidance, not automated ticketing.</p>
                </MetricHelpPopover>
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {actions.map((a, i) => (
              <div key={i} className="flex items-start gap-3 rounded-md bg-card border border-border px-4 py-3">
                <AlertTriangle className={`size-4 shrink-0 mt-0.5 ${a.severity === "critical" ? "text-destructive" : "text-warning"}`} />
                <div className="flex flex-col gap-0.5">
                  <p className="text-xs font-medium text-foreground">{a.trigger}</p>
                  <p className="text-xs text-muted-foreground">{a.action}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
