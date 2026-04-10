"use client"

import { useMemo, useState } from "react"
import { AlertTriangle, Info, ShieldAlert, Database } from "lucide-react"
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
  ScatterChart,
  Scatter,
  ZAxis,
  Cell,
  Legend,
} from "recharts"
import { useDataset } from "@/lib/dataset-context"
import { MetricHelpPopover } from "@/components/dashboard/metric-help-popover"

const CHART_COLORS = [
  "var(--color-chart-1)",
  "var(--color-chart-2)",
  "var(--color-chart-3)",
  "var(--color-chart-4)",
  "var(--color-chart-5)",
]

function colorForStatus(fnr: number, threshold: number) {
  if (fnr > threshold * 1.5) return "var(--color-chart-2)"
  if (fnr > threshold) return "var(--color-chart-3)"
  return "var(--color-chart-1)"
}

const tooltipStyle = {
  background: "var(--color-card)",
  border: "1px solid var(--color-border)",
  borderRadius: "6px",
  fontSize: "12px",
}

export function FairnessMetricsTab() {
  const { computedMetrics, viewMetrics, status, columnMapping } = useDataset()
  const [selectedGroup, setSelectedGroup] = useState<string>("")

  const groupColumns = useMemo(() => {
    if (!computedMetrics) return []
    return Object.keys(computedMetrics.subgroups)
  }, [computedMetrics])

  const activeGroup = selectedGroup || groupColumns[0] || ""
  const subgroupData = viewMetrics?.subgroups[activeGroup] ?? []

  const fnrData = useMemo(
    () =>
      subgroupData.map((s) => ({
        group: s.groupValue,
        fnr: s.metrics.fnr,
        fill: colorForStatus(s.metrics.fnr, 0.08),
      })),
    [subgroupData]
  )

  const ppvData = useMemo(
    () =>
      subgroupData.map((s) => ({
        group: s.groupValue,
        ppv: s.metrics.precision,
        fill: colorForStatus(1 - s.metrics.precision, 0.12),
      })),
    [subgroupData]
  )

  const scatterData = useMemo(
    () =>
      subgroupData.map((s) => ({
        recall: s.metrics.recall,
        ppv: s.metrics.precision,
        n: s.metrics.n,
        group: s.groupValue,
      })),
    [subgroupData]
  )

  const sampleSizeWarnings = useMemo(
    () =>
      subgroupData
        .filter((s) => s.metrics.n < 100)
        .map((s) => ({
          group: s.groupValue,
          n: s.metrics.n,
          severity: s.metrics.n < 50 ? ("critical" as const) : ("marginal" as const),
        }))
        .sort((a, b) => a.n - b.n),
    [subgroupData]
  )

  const tier1Metrics = useMemo(() => {
    if (!viewMetrics) return []
    return viewMetrics.governance.checks
      .filter((c) =>
        ["FNR Disparity", "PPV Disparity", "Calibration ECE", "Min Recall"].includes(c.name)
      )
      .map((c) => ({
        name: c.name,
        threshold: c.threshold,
        current: c.value,
        status: c.status,
      }))
  }, [viewMetrics])

  if (status !== "ready" || !computedMetrics || !viewMetrics) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
        <Database className="size-10 mb-3" />
        <p className="text-sm font-medium">No Data Loaded</p>
        <p className="text-xs mt-1">Upload a dataset from the Overview tab to view fairness metrics</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <ShieldAlert className="size-5 text-primary" />
              Tier 1 Critical Safety Metrics
            </h2>
            <MetricHelpPopover title="Fairness metrics tab">
              <>
                <p>Subgroup-level views of FNR and PPV, plus a scatter of recall vs PPV. Select which demographic column to stratify by when multiple are available.</p>
                <p>Thresholds reflect governance defaults unless you changed them in Thresholds.</p>
              </>
            </MetricHelpPopover>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Core fairness and safety metrics required for clinical governance approval
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

      {/* Metric status table */}
      <Card className="border-border bg-card">
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center gap-1.5 mb-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Tier 1 checks</p>
            <MetricHelpPopover title="Tier 1 checks">
              <p>Subset of governance checks most tied to safety: FNR disparity, PPV disparity, calibration ECE, and minimum recall. Status mirrors the overview decision.</p>
            </MetricHelpPopover>
          </div>
          <div className="flex flex-col gap-2">
            {tier1Metrics.map((metric) => (
              <div
                key={metric.name}
                className="flex items-center justify-between rounded-md bg-secondary/50 border border-border px-4 py-3"
              >
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm font-medium text-foreground">{metric.name}</span>
                  <span className="text-xs text-muted-foreground">Threshold: {metric.threshold}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-mono font-medium text-foreground tabular-nums">{metric.current}</span>
                  <Badge
                    variant="outline"
                    className={`text-[10px] px-2 py-0 font-medium ${
                      metric.status === "pass"
                        ? "bg-success/10 text-success border-success/20"
                        : metric.status === "warning"
                        ? "bg-warning/10 text-warning border-warning/20"
                        : "bg-destructive/10 text-destructive border-destructive/20"
                    }`}
                  >
                    {metric.status === "pass" ? "PASS" : metric.status === "warning" ? "REVIEW" : "FAIL"}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* FNR by Subgroup */}
        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-foreground flex items-center gap-1.5">
              False Negative Rate by Subgroup
              <MetricHelpPopover title="FNR by subgroup">
                <p>Bar height is FNR per subgroup value. Colors highlight distance from policy; dashed line is an 8% reference for reading the chart.</p>
              </MetricHelpPopover>
            </CardTitle>
            <CardDescription className="text-xs">
              Grouped by: {activeGroup} · Threshold band at 8% disparity gap
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={fnrData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                <XAxis dataKey="group" tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }} axisLine={{ stroke: "var(--color-border)" }} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} axisLine={false} tickLine={false} domain={[0, "auto"]} tickFormatter={(v: number) => `${(v * 100).toFixed(0)}%`} />
                <ReferenceLine y={0.08} stroke="var(--color-destructive)" strokeDasharray="4 4" strokeWidth={1.5} label={{ value: "8%", position: "right", fontSize: 10, fill: "var(--color-destructive)" }} />
                <Tooltip contentStyle={tooltipStyle} formatter={(value: number) => [`${(value * 100).toFixed(1)}%`, "FNR"]} />
                <Bar dataKey="fnr" radius={[4, 4, 0, 0]} maxBarSize={40}>
                  {fnrData.map((entry, idx) => (
                    <Cell key={idx} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* PPV by Subgroup */}
        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-foreground flex items-center gap-1.5">
              PPV by Subgroup
              <MetricHelpPopover title="PPV by subgroup">
                <p>Bar height is positive predictive value per subgroup. Color scale emphasizes disparity risk; governance uses max−min PPV gap across values.</p>
              </MetricHelpPopover>
            </CardTitle>
            <CardDescription className="text-xs">
              Grouped by: {activeGroup} · Threshold band at 12% disparity gap
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
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

      {/* Bubble chart: Recall vs PPV */}
      {scatterData.length > 0 && (
        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-foreground flex items-center gap-1.5">
              Recall vs PPV by Subgroup
              <MetricHelpPopover title="Recall vs PPV scatter">
                <>
                  <p>Each dot is one subgroup value. Axes are recall (x) and PPV (y); dot size encodes sample size—larger dots are more reliable.</p>
                  <p>Vertical line marks a minimum recall reference for reading the chart.</p>
                </>
              </MetricHelpPopover>
            </CardTitle>
            <CardDescription className="text-xs">Dot size represents subgroup sample size (n)</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <ScatterChart margin={{ top: 28, right: 30, left: 0, bottom: 28 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis type="number" dataKey="recall" name="Recall" domain={["auto", "auto"]} tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} axisLine={{ stroke: "var(--color-border)" }} tickLine={false} tickFormatter={(v: number) => `${(v * 100).toFixed(0)}%`} label={{ value: "Recall", position: "bottom", offset: 0, fontSize: 11, fill: "var(--color-muted-foreground)" }} />
                <YAxis type="number" dataKey="ppv" name="PPV" domain={["auto", "auto"]} tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `${(v * 100).toFixed(0)}%`} label={{ value: "PPV", angle: -90, position: "insideLeft", offset: 10, fontSize: 11, fill: "var(--color-muted-foreground)" }} />
                <ZAxis type="number" dataKey="n" range={[80, 500]} />
                <Tooltip contentStyle={tooltipStyle} formatter={(value: number, name: string) => { if (name === "Recall" || name === "PPV") return [`${(value * 100).toFixed(1)}%`, name]; return [value, name] }} />
                <Legend
                  verticalAlign="top"
                  align="right"
                  wrapperStyle={{ fontSize: "11px", paddingBottom: 8 }}
                  formatter={() => "Subgroups (size = n)"}
                />
                <ReferenceLine x={0.85} stroke="var(--color-destructive)" strokeDasharray="4 4" strokeWidth={1} />
                <Scatter data={scatterData} name="Subgroups (size = n)">
                  {scatterData.map((_, idx) => (
                    <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} fillOpacity={0.7} stroke={CHART_COLORS[idx % CHART_COLORS.length]} strokeWidth={1} />
                  ))}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Sample Size Warning */}
      {sampleSizeWarnings.length > 0 && (
        <Card className="border-warning/30 bg-warning/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-foreground flex items-center gap-2 flex-wrap">
              <AlertTriangle className="size-4 text-warning shrink-0" />
              <span className="flex items-center gap-1.5">
                Sample Size Warning
                <MetricHelpPopover title="Sample size warning">
                  <p>Lists subgroup values with small n in the current column. Estimates are unstable; governance may flag subgroup n below the threshold.</p>
                </MetricHelpPopover>
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <div className="flex flex-col gap-2">
              {sampleSizeWarnings.map((w) => (
                <div key={w.group} className="flex items-center justify-between rounded-md bg-card border border-border px-3 py-2">
                  <span className="text-sm text-foreground">{w.group}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-muted-foreground">n={w.n}</span>
                    <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${w.severity === "critical" ? "bg-destructive/10 text-destructive border-destructive/20" : "bg-warning/10 text-warning border-warning/20"}`}>
                      {w.severity === "critical" ? "BELOW 50" : "MARGINAL"}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex items-start gap-2 rounded-md bg-card border border-border px-3 py-2.5">
              <Info className="size-3.5 text-primary shrink-0 mt-0.5" />
              <p className="text-xs text-muted-foreground leading-relaxed">
                Metrics flagged for low sample sizes — interpret with caution.
                Collect more data or document a monitoring plan before proceeding.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
