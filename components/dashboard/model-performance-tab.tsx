"use client"

import { useMemo, useState } from "react"
import { Target, Info, Database } from "lucide-react"
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
} from "recharts"
import { useDataset } from "@/lib/dataset-context"
import { DecisionLogicCard } from "@/components/dashboard/decision-logic-card"
import { MetricHelpPopover } from "@/components/dashboard/metric-help-popover"

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

export function ModelPerformanceTab() {
  const { computedMetrics, viewMetrics, status } = useDataset()
  const [selectedGroup, setSelectedGroup] = useState<string>("")

  const groupColumns = useMemo(() => {
    if (!computedMetrics) return []
    return Object.keys(computedMetrics.subgroups)
  }, [computedMetrics])

  const activeGroup = selectedGroup || groupColumns[0] || ""
  const subgroupData = viewMetrics?.subgroups[activeGroup] ?? []

  if (status !== "ready" || !computedMetrics || !viewMetrics) {
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

  const recallCheck = viewMetrics.governance.checks.find((c) => c.name === "Min Recall")
  const ppvCheck = viewMetrics.governance.checks.find((c) => c.name === "PPV Disparity")

  // Calibration curve
  const calibData = viewMetrics.calibrationCurve.map((c) => ({
    predicted: c.predicted,
    observed: c.observed,
    count: c.count,
  }))

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Target className="size-5 text-primary" />
              Recall and PPV per Subgroup
            </h2>
            <MetricHelpPopover title="Model performance tab">
              <>
                <p>Bar charts show recall and PPV for each subgroup value of the selected column. Calibration compares predicted vs observed rates.</p>
                <p>Threshold cards reflect governance checks for minimum recall and PPV disparity.</p>
              </>
            </MetricHelpPopover>
          </div>
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
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                  Recall Requirement
                  <MetricHelpPopover title="Recall requirement">
                    <p>Minimum recall across subgroups must meet the governance floor. Badge reflects the Min Recall check from the decision engine.</p>
                  </MetricHelpPopover>
                </p>
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
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                  PPV Disparity
                  <MetricHelpPopover title="PPV disparity">
                    <p>Here, disparity is max PPV minus min PPV across subgroups for the selected column—aligned with the governance PPV disparity check.</p>
                  </MetricHelpPopover>
                </p>
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
            <CardTitle className="text-sm font-medium text-foreground flex items-center gap-1.5">
              Recall per Subgroup
              <MetricHelpPopover title="Recall per subgroup">
                <p>Height of each bar is recall for that subgroup value. Dashed line is the minimum acceptable recall from policy.</p>
              </MetricHelpPopover>
            </CardTitle>
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
            <CardTitle className="text-sm font-medium text-foreground flex items-center gap-1.5">
              PPV per Subgroup
              <MetricHelpPopover title="PPV per subgroup">
                <p>Positive predictive value per subgroup: among predicted positives, what fraction were true positives. Higher is usually better.</p>
              </MetricHelpPopover>
            </CardTitle>
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
            <CardTitle className="text-sm font-medium text-foreground flex items-center gap-1.5">
              Calibration Curve
              <MetricHelpPopover title="Calibration curve">
                <>
                  <p>Each point is a bin: mean predicted probability vs observed positive rate. The diagonal is perfect calibration.</p>
                  <p>ECE (expected calibration error) summarizes distance from ideal—reported in the subtitle.</p>
                </>
              </MetricHelpPopover>
            </CardTitle>
            <CardDescription className="text-xs">
              Solid line: calibration curve vs diagonal (perfect calibration). ECE = {viewMetrics.overall.ece.toFixed(4)}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={calibData} margin={{ top: 16, right: 12, left: 4, bottom: 36 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis
                  type="number"
                  dataKey="predicted"
                  domain={[0, 1]}
                  tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
                  axisLine={{ stroke: "var(--color-border)" }}
                  tickLine={false}
                  label={{ value: "Mean predicted probability", position: "bottom", offset: 12, fontSize: 11, fill: "var(--color-muted-foreground)" }}
                />
                <YAxis
                  type="number"
                  domain={[0, 1]}
                  tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
                  axisLine={false}
                  tickLine={false}
                  label={{ value: "Observed rate", angle: -90, position: "insideLeft", fontSize: 11, fill: "var(--color-muted-foreground)" }}
                />
                <ReferenceLine segment={[{ x: 0, y: 0 }, { x: 1, y: 1 }]} stroke="var(--color-muted-foreground)" strokeDasharray="4 4" strokeWidth={1} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [v.toFixed(3), "Observed"]} />
                <Line type="monotone" dataKey="observed" name="Observed" stroke="var(--color-chart-1)" strokeWidth={2} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      <DecisionLogicCard />
    </div>
  )
}
