"use client"

import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  Database,
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useDataset } from "@/lib/dataset-context"

interface KpiCardProps {
  title: string
  value: string
  unit?: string
  threshold: string
  status: "pass" | "fail" | "warning"
  description?: string
}

const statusConfig = {
  pass: {
    badge: "PASS",
    badgeClass: "bg-success/10 text-success border-success/20",
    borderClass: "border-l-success",
    icon: CheckCircle2,
    iconColor: "text-success",
  },
  fail: {
    badge: "FAIL",
    badgeClass: "bg-destructive/10 text-destructive border-destructive/20",
    borderClass: "border-l-destructive",
    icon: AlertTriangle,
    iconColor: "text-destructive",
  },
  warning: {
    badge: "REVIEW",
    badgeClass: "bg-warning/10 text-warning border-warning/20",
    borderClass: "border-l-warning",
    icon: AlertTriangle,
    iconColor: "text-warning",
  },
}

function KpiCard({ title, value, unit, threshold, status, description }: KpiCardProps) {
  const config = statusConfig[status]
  const StatusIcon = config.icon

  return (
    <Card className={`bg-card border border-border border-l-[3px] ${config.borderClass}`}>
      <CardContent className="pt-4 pb-4 px-4">
        <div className="flex items-start justify-between mb-2">
          <p className="text-xs font-medium text-muted-foreground leading-tight">{title}</p>
          <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${config.badgeClass}`}>
            {config.badge}
          </Badge>
        </div>
        <div className="flex items-end gap-1.5 mb-1.5">
          <span className="text-2xl font-semibold text-foreground tabular-nums tracking-tight">{value}</span>
          {unit && <span className="text-sm text-muted-foreground mb-0.5">{unit}</span>}
        </div>
        <div className="flex items-center gap-1.5">
          <StatusIcon className={`size-3 ${config.iconColor}`} />
          <span className="text-[11px] text-muted-foreground">Threshold: {threshold}</span>
        </div>
        {description && (
          <p className="text-[10px] text-muted-foreground mt-1.5 leading-relaxed">{description}</p>
        )}
      </CardContent>
    </Card>
  )
}

function EmptyKpiGrid() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      {[1, 2, 3, 4].map((i) => (
        <Card key={i} className="bg-card border border-border border-l-[3px] border-l-muted">
          <CardContent className="pt-4 pb-4 px-4">
            <div className="flex items-center justify-center py-6">
              <div className="flex flex-col items-center gap-2 text-muted-foreground">
                <Database className="size-5" />
                <p className="text-xs">Upload data to view</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

export function KpiCardGrid() {
  const { computedMetrics, status } = useDataset()

  if (status !== "ready" || !computedMetrics) return <EmptyKpiGrid />

  const { governance, subgroups, featureDrift } = computedMetrics
  const allSubs = Object.values(subgroups).flat()

  const fnrCheck = governance.checks.find((c) => c.name === "FNR Disparity")
  const recallCheck = governance.checks.find((c) => c.name === "Min Recall")
  const nCheck = governance.checks.find((c) => c.name.startsWith("Subgroup n"))
  const psiCheck = governance.checks.find((c) => c.name.startsWith("PSI Max"))

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      <KpiCard
        title="FNR Disparity (Gap)"
        value={fnrCheck?.value ?? "—"}
        threshold={fnrCheck?.threshold ?? "≤8%"}
        status={fnrCheck?.status ?? "warning"}
        description={fnrCheck?.details}
      />
      <KpiCard
        title="Min Recall"
        value={recallCheck?.value ?? "—"}
        threshold={recallCheck?.threshold ?? "≥85%"}
        status={recallCheck?.status ?? "warning"}
        description={recallCheck?.details}
      />
      <KpiCard
        title="Smallest Subgroup"
        value={nCheck?.value ?? "—"}
        threshold={nCheck?.threshold ?? "≥50"}
        status={nCheck?.status ?? "warning"}
        description={nCheck?.details}
      />
      <KpiCard
        title={psiCheck?.name ?? "PSI Max"}
        value={psiCheck?.value ?? "—"}
        threshold={psiCheck?.threshold ?? "<0.1"}
        status={psiCheck?.status ?? "warning"}
        description={featureDrift.length > 0 ? `${featureDrift.filter((d) => d.status === "severe").length} severe, ${featureDrift.filter((d) => d.status === "investigate").length} investigate` : undefined}
      />
    </div>
  )
}
