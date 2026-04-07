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
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ReferenceLine,
  Tooltip,
  ResponsiveContainer,
  Legend,
  BarChart,
  Bar,
  Cell,
} from "recharts"
import { useDataset } from "@/lib/dataset-context"

const CHART_COLORS = [
  "var(--color-chart-1)",
  "var(--color-chart-2)",
  "var(--color-chart-3)",
  "var(--color-chart-4)",
  "var(--color-chart-5)",
]

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

export function DriftDetectionTab() {
  const { computedMetrics, status, columnMapping } = useDataset()
  const [selectedSubgroupCol, setSelectedSubgroupCol] = useState<string>("")

  const groupColumns = useMemo(() => {
    if (!computedMetrics) return []
    return Object.keys(computedMetrics.subgroupTimeSeries)
  }, [computedMetrics])

  const activeSubgroupCol = selectedSubgroupCol || groupColumns[0] || ""

  const featureDrift = computedMetrics?.featureDrift ?? []
  const predictionDrift = computedMetrics?.predictionDrift
  const targetDrift = computedMetrics?.targetDrift
  const dataQuality = computedMetrics?.dataQuality
  const timeSeries = computedMetrics?.timeSeries ?? []
  const subgroupTimeSeries = computedMetrics?.subgroupTimeSeries ?? {}

  const subgroupTimeData = subgroupTimeSeries[activeSubgroupCol] ?? []

  const subgroupNames = useMemo(() => {
    if (subgroupTimeData.length === 0) return []
    const keys = Object.keys(subgroupTimeData[0]?.metrics ?? {})
    return [...new Set(keys.filter((k) => k.endsWith("_fnr")).map((k) => k.replace("_fnr", "")))]
  }, [subgroupTimeData])

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

  if (status !== "ready" || !computedMetrics || !predictionDrift || !targetDrift || !dataQuality) {
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

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Activity className="size-5 text-primary" />
          Model Stability Monitoring
        </h2>
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

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Feature PSI bar chart */}
        {featureDriftBarData.length > 0 && (
          <Card className="border-border bg-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-foreground">Feature Drift (PSI)</CardTitle>
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

        {/* Performance trend over time */}
        {timeSeries.length > 1 && (
          <Card className="border-border bg-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-foreground">Performance Over Time</CardTitle>
              <CardDescription className="text-xs">Recall and FNR trends by service month</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={timeSeries} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                  <XAxis dataKey="period" tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }} axisLine={{ stroke: "var(--color-border)" }} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} axisLine={false} tickLine={false} domain={[0, 1]} tickFormatter={(v: number) => `${(v * 100).toFixed(0)}%`} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v: number, name: string) => [`${(v * 100).toFixed(1)}%`, name]} />
                  <Legend wrapperStyle={{ fontSize: "11px" }} />
                  <Line type="monotone" dataKey="metrics.recall" name="Recall" stroke="var(--color-chart-1)" strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="metrics.fnr" name="FNR" stroke="var(--color-chart-2)" strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="metrics.ece" name="ECE" stroke="var(--color-chart-3)" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>

      {/* FNR by subgroup over time */}
      {subgroupTimeData.length > 1 && subgroupNames.length > 0 && (
        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-medium text-foreground">FNR Drift by Subgroup</CardTitle>
                <CardDescription className="text-xs">Performance degradation tracking per subgroup</CardDescription>
              </div>
              {groupColumns.length > 1 && (
                <Select value={activeSubgroupCol} onValueChange={setSelectedSubgroupCol}>
                  <SelectTrigger className="w-44 h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {groupColumns.map((col) => (
                      <SelectItem key={col} value={col}>{col}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={subgroupTimeData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                <XAxis dataKey="period" tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }} axisLine={{ stroke: "var(--color-border)" }} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} axisLine={false} tickLine={false} domain={[0, "auto"]} tickFormatter={(v: number) => `${(v * 100).toFixed(0)}%`} />
                <ReferenceLine y={0.08} stroke="var(--color-destructive)" strokeDasharray="4 4" strokeWidth={1} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [`${(v * 100).toFixed(1)}%`, ""]} />
                <Legend wrapperStyle={{ fontSize: "11px" }} />
                {subgroupNames.map((name, i) => (
                  <Line key={name} type="monotone" dataKey={`metrics.${name}_fnr`} name={name} stroke={CHART_COLORS[i % CHART_COLORS.length]} strokeWidth={1.5} dot={false} />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Feature drift table */}
      {featureDrift.length > 0 && (
        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-foreground">Feature Drift Detail</CardTitle>
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

      {/* Recommended Actions */}
      {actions.length > 0 && (
        <Card className="border-primary/20 bg-primary/[0.02]">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-foreground flex items-center gap-2">
              <Wrench className="size-4 text-primary" />
              Recommended Actions
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
