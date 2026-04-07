"use client"

import { useMemo, useState } from "react"
import { Target, Info, AlertTriangle, CheckCircle2, XCircle, Database } from "lucide-react"
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
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ReferenceLine,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LineChart,
  Line,
  Legend,
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

function colorForMetric(value: number, threshold: number, above: boolean) {
  if (above ? value >= threshold : value <= threshold) return "var(--color-chart-1)"
  if (above ? value >= threshold * 0.9 : value <= threshold * 1.1) return "var(--color-chart-3)"
  return "var(--color-chart-2)"
}

const decisionRules = [
  { condition: "All metrics pass", result: "PASS", icon: CheckCircle2, iconColor: "text-success", resultColor: "bg-success/10 text-success border-success/20" },
  { condition: "1 metric <20% over threshold", result: "NEEDS REVIEW", icon: AlertTriangle, iconColor: "text-warning", resultColor: "bg-warning/10 text-warning border-warning/20" },
  { condition: "1 metric ≥20% over OR 2+ exceed", result: "FAIL", icon: XCircle, iconColor: "text-destructive", resultColor: "bg-destructive/10 text-destructive border-destructive/20" },
  { condition: "Any subgroup n < 50", result: "NEEDS REVIEW", icon: AlertTriangle, iconColor: "text-warning", resultColor: "bg-warning/10 text-warning border-warning/20" },
  { condition: "Calibration ECE >0.10 any group", result: "FAIL", icon: XCircle, iconColor: "text-destructive", resultColor: "bg-destructive/10 text-destructive border-destructive/20" },
]

export function ModelPerformanceTab() {
  const { computedMetrics, status } = useDataset()
  const [selectedGroup, setSelectedGroup] = useState<string>("")

  const groupColumns = useMemo(() => {
    if (!computedMetrics) return []
    return Object.keys(computedMetrics.subgroups)
  }, [computedMetrics])

  const activeGroup = selectedGroup || groupColumns[0] || ""
  const subgroupData = computedMetrics?.subgroups[activeGroup] ?? []

  if (status !== "ready" || !computedMetrics) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
        <Database className="size-10 mb-3" />
        <p className="text-sm font-medium">No Data Loaded</p>
        <p className="text-xs mt-1">Upload a dataset to view model performance</p>
      </div>
    )
  }

  const recallData = subgroupData.map((s) => ({
    group: s.groupValue,
    recall: s.metrics.recall,
    fill: colorForMetric(s.metrics.recall, 0.85, true),
  }))

  const ppvData = subgroupData.map((s) => ({
    group: s.groupValue,
    ppv: s.metrics.precision,
    fill: colorForMetric(s.metrics.precision, 0.7, true),
  }))

  const minRecall = Math.min(...subgroupData.map((s) => s.metrics.recall))
  const maxRecall = Math.max(...subgroupData.map((s) => s.metrics.recall))
  const ppvValues = subgroupData.map((s) => s.metrics.precision).filter((v) => v > 0)
  const ppvDisparity = ppvValues.length > 0 ? Math.max(...ppvValues) - Math.min(...ppvValues) : 0

  const recallCheck = computedMetrics.governance.checks.find((c) => c.name === "Min Recall")
  const ppvCheck = computedMetrics.governance.checks.find((c) => c.name === "PPV Disparity")

  // Calibration curve
  const calibData = computedMetrics.calibrationCurve.map((c) => ({
    predicted: c.predicted,
    observed: c.observed,
    count: c.count,
  }))

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Target className="size-5 text-primary" />
            Recall and PPV per Subgroup
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Core model performance stratified by subgroup for governance review
          </p>
        </div>
        {groupColumns.length > 1 && (
          <Select value={activeGroup} onValueChange={setSelectedGroup}>
            <SelectTrigger className="w-48 h-8 text-xs">
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

      {/* Note */}
      <div className="flex items-start gap-2 rounded-md border border-border bg-secondary/50 px-4 py-3">
        <Info className="size-4 text-primary shrink-0 mt-0.5" />
        <p className="text-xs text-muted-foreground leading-relaxed">
          <span className="font-medium text-foreground">Note:</span> AUC-ROC and F1 are not reported. These aggregate metrics
          are not appropriate for clinical governance decisions where subgroup-level
          safety is the primary concern.
        </p>
      </div>

      {/* Performance thresholds */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Card className="border-border bg-card">
          <CardContent className="pt-4 pb-4 px-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Recall Requirement</p>
                <p className="text-lg font-semibold text-foreground mt-1">{"\u2265"}85% minimum</p>
              </div>
              <Badge variant="outline" className={`text-[10px] px-2 py-0 font-medium ${recallCheck?.status === "pass" ? "bg-success/10 text-success border-success/20" : "bg-destructive/10 text-destructive border-destructive/20"}`}>
                {recallCheck?.status === "pass" ? "PASS" : "FAIL"}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Current minimum: {(minRecall * 100).toFixed(1)}%
              {recallCheck?.details ? ` (${recallCheck.details})` : ""}
            </p>
          </CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardContent className="pt-4 pb-4 px-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">PPV Disparity</p>
                <p className="text-lg font-semibold text-foreground mt-1">{"\u2264"}12% disparity</p>
              </div>
              <Badge variant="outline" className={`text-[10px] px-2 py-0 font-medium ${ppvCheck?.status === "pass" ? "bg-success/10 text-success border-success/20" : "bg-destructive/10 text-destructive border-destructive/20"}`}>
                {ppvCheck?.status === "pass" ? "PASS" : "FAIL"}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Current disparity: {(ppvDisparity * 100).toFixed(1)}% (max − min)
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-foreground">Recall per Subgroup</CardTitle>
            <CardDescription className="text-xs">Grouped by: {activeGroup} · Minimum 85% required</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={recallData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                <XAxis dataKey="group" tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }} axisLine={{ stroke: "var(--color-border)" }} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} axisLine={false} tickLine={false} domain={[0, 1]} tickFormatter={(v: number) => `${(v * 100).toFixed(0)}%`} />
                <ReferenceLine y={0.85} stroke="var(--color-destructive)" strokeDasharray="4 4" strokeWidth={1.5} label={{ value: "85%", position: "right", fontSize: 10, fill: "var(--color-destructive)" }} />
                <Tooltip contentStyle={tooltipStyle} formatter={(value: number) => [`${(value * 100).toFixed(1)}%`, "Recall"]} />
                <Bar dataKey="recall" radius={[4, 4, 0, 0]} maxBarSize={40}>
                  {recallData.map((entry, idx) => (
                    <Cell key={idx} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-foreground">PPV per Subgroup</CardTitle>
            <CardDescription className="text-xs">Grouped by: {activeGroup} · Maximum 12% disparity</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={ppvData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                <XAxis dataKey="group" tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }} axisLine={{ stroke: "var(--color-border)" }} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} axisLine={false} tickLine={false} domain={[0, 1]} tickFormatter={(v: number) => `${(v * 100).toFixed(0)}%`} />
                <Tooltip contentStyle={tooltipStyle} formatter={(value: number) => [`${(value * 100).toFixed(1)}%`, "PPV"]} />
                <Bar dataKey="ppv" radius={[4, 4, 0, 0]} maxBarSize={40}>
                  {ppvData.map((entry, idx) => (
                    <Cell key={idx} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Calibration Curve */}
      {calibData.length > 0 && (
        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-foreground">Calibration Curve</CardTitle>
            <CardDescription className="text-xs">
              Predicted probability vs observed frequency · ECE = {computedMetrics.overall.ece.toFixed(4)}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={calibData} margin={{ top: 10, right: 10, left: -10, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis type="number" dataKey="predicted" domain={[0, 1]} tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} axisLine={{ stroke: "var(--color-border)" }} tickLine={false} label={{ value: "Mean Predicted", position: "bottom", fontSize: 11, fill: "var(--color-muted-foreground)" }} />
                <YAxis type="number" domain={[0, 1]} tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} axisLine={false} tickLine={false} label={{ value: "Observed", angle: -90, position: "insideLeft", fontSize: 11, fill: "var(--color-muted-foreground)" }} />
                <ReferenceLine segment={[{ x: 0, y: 0 }, { x: 1, y: 1 }]} stroke="var(--color-muted-foreground)" strokeDasharray="4 4" strokeWidth={1} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number, name: string) => [v.toFixed(3), name]} />
                <Legend wrapperStyle={{ fontSize: "11px" }} />
                <Line type="monotone" dataKey="observed" name="Calibration" stroke="var(--color-chart-1)" strokeWidth={2} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Decision Logic */}
      <Card className="border-primary/20 bg-primary/[0.02]">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-foreground flex items-center gap-2">
            <Info className="size-4 text-primary" />
            Decision Logic Summary
          </CardTitle>
          <CardDescription className="text-xs">How governance decisions are computed from metric results</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {decisionRules.map((rule, i) => {
            const Icon = rule.icon
            return (
              <div key={i} className="flex items-center justify-between rounded-md bg-card border border-border px-4 py-3">
                <div className="flex items-center gap-2">
                  <Icon className={`size-4 ${rule.iconColor}`} />
                  <span className="text-sm text-foreground">{rule.condition}</span>
                </div>
                <Badge variant="outline" className={`text-[10px] px-2 py-0 font-medium ${rule.resultColor}`}>
                  {rule.result}
                </Badge>
              </div>
            )
          })}
        </CardContent>
      </Card>
    </div>
  )
}
