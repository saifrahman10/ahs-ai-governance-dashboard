"use client"

import { Activity, AlertTriangle, CheckCircle2, TrendingUp, Database } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useDataset } from "@/lib/dataset-context"

const statusIcon = {
  stable: CheckCircle2,
  investigate: TrendingUp,
  severe: AlertTriangle,
}

const statusColors = {
  stable: { badge: "bg-success/10 text-success border-success/20", icon: "text-success" },
  investigate: { badge: "bg-warning/10 text-warning border-warning/20", icon: "text-warning" },
  severe: { badge: "bg-destructive/10 text-destructive border-destructive/20", icon: "text-destructive" },
}

export function DriftSummaryCard() {
  const { computedMetrics, status } = useDataset()

  if (status !== "ready" || !computedMetrics) {
    return (
      <Card className="border-border bg-card">
        <CardContent className="py-8">
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <Database className="size-6" />
            <p className="text-xs">Upload data to view drift summary</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const { featureDrift, predictionDrift, targetDrift, dataQuality } = computedMetrics

  const driftItems = [
    ...featureDrift.slice(0, 3).map((d) => ({
      label: `PSI ${d.feature}`,
      value: d.psi.toFixed(3),
      status: d.status,
      action: d.status === "severe" ? "Retrain" : d.status === "investigate" ? "Review" : null,
    })),
    {
      label: "Prediction Drift (KS)",
      value: predictionDrift.ksStatistic.toFixed(3),
      status: predictionDrift.status,
      action: predictionDrift.status === "severe" ? "Retrain" : null,
    },
    {
      label: "Target Drift",
      value: `${(targetDrift.absoluteShift * 100).toFixed(2)}%`,
      status: targetDrift.status,
      action: targetDrift.status !== "stable" ? "Review" : null,
    },
    {
      label: "Missing Data Rate",
      value: `${(dataQuality.overallMissingness * 100).toFixed(1)}%`,
      status: dataQuality.overallMissingness < 0.05 ? "stable" as const : dataQuality.overallMissingness < 0.15 ? "investigate" as const : "severe" as const,
      action: null,
    },
  ]

  const hasSevere = driftItems.some((d) => d.status === "severe")

  return (
    <Card className="border-border bg-card">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-foreground flex items-center gap-2">
            <Activity className="size-4 text-primary" />
            Drift Summary
          </CardTitle>
          <CardDescription className="text-xs">
            {featureDrift.length} features monitored
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {driftItems.map((item) => {
            const Icon = statusIcon[item.status]
            const colors = statusColors[item.status]
            return (
              <div
                key={item.label}
                className="flex items-center justify-between rounded-md bg-secondary/50 border border-border px-3 py-3"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Icon className={`size-4 shrink-0 ${colors.icon}`} />
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-foreground truncate">{item.label}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-sm font-mono font-medium text-foreground tabular-nums">
                    {item.value}
                  </span>
                  <Badge variant="outline" className={`text-[10px] px-1.5 py-0 font-medium ${colors.badge}`}>
                    {item.status.toUpperCase()}
                  </Badge>
                </div>
              </div>
            )
          })}
        </div>
        {hasSevere && (
          <div className="mt-3 flex items-start gap-2 rounded-md border border-border bg-destructive/5 px-3 py-2.5">
            <AlertTriangle className="size-3.5 text-destructive shrink-0 mt-0.5" />
            <p className="text-[11px] text-foreground leading-relaxed">
              <span className="font-medium">Action required:</span>{" "}
              Severe drift detected. Initiate investigation with clinical team.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
