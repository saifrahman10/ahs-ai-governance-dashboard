"use client"

import { useState, useCallback, type KeyboardEvent, type ReactNode } from "react"
import { AlertTriangle, CheckCircle2, Database, Info, Stethoscope } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useDataset } from "@/lib/dataset-context"
import { MetricHelpPopover } from "@/components/dashboard/metric-help-popover"
import { cn } from "@/lib/utils"

interface KpiCardProps {
  title: string
  value: string
  unit?: string
  threshold: string
  status: "pass" | "fail" | "warning"
  description?: string
  clinicalSummary: string
  clinicalIfFails: string
  /** Technical “how to read” for the metric (popover icon). */
  metricHelp: ReactNode
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

function KpiCard({
  title,
  value,
  unit,
  threshold,
  status,
  description,
  clinicalSummary,
  clinicalIfFails,
  metricHelp,
}: KpiCardProps) {
  const [flipped, setFlipped] = useState(false)
  /** After closing with click while hovered, ignore hover-flip until pointer leaves (avoids instant re-flip). */
  const [suppressHoverFlip, setSuppressHoverFlip] = useState(false)
  const config = statusConfig[status]
  const StatusIcon = config.icon

  const toggle = useCallback(() => {
    setFlipped((f) => {
      const next = !f
      if (!next) setSuppressHoverFlip(true)
      return next
    })
  }, [])

  const onKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault()
        toggle()
      }
    },
    [toggle]
  )

  return (
    <Card className={`bg-card border border-border border-l-[3px] ${config.borderClass} overflow-hidden`}>
      <CardContent className="p-0">
        <div
          role="button"
          tabIndex={0}
          aria-pressed={flipped}
          aria-label={`${title}. ${flipped ? "Showing clinical context. Press to return to metrics." : "Press Enter or click to read clinical context for non-technical stakeholders."}`}
          onClick={toggle}
          onKeyDown={onKeyDown}
          onMouseLeave={() => setSuppressHoverFlip(false)}
          className="group relative block w-full cursor-pointer rounded-lg outline-none transition-shadow focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <div
            className={cn(
              "relative min-h-[230px] w-full transition-transform duration-500 ease-out [transform-style:preserve-3d]",
              flipped
                ? "[transform:rotateY(180deg)]"
                : "[transform:rotateY(0deg)]",
              !flipped && !suppressHoverFlip && "md:group-hover:[transform:rotateY(180deg)]"
            )}
            style={{ WebkitTransformStyle: "preserve-3d" }}
          >
            {/* Front */}
            <div
              className="absolute inset-0 flex flex-col px-4 pb-3 pt-4 [backface-visibility:hidden] [transform:rotateY(0deg)]"
              aria-hidden={flipped}
            >
              <div className="flex items-start justify-between mb-2 gap-1">
                <div className="flex items-start gap-1 min-w-0 flex-1">
                  <p className="text-xs font-medium text-muted-foreground leading-tight">{title}</p>
                  <div className="shrink-0 pt-0.5" onClick={(e) => e.stopPropagation()}>
                    <MetricHelpPopover title={title}>{metricHelp}</MetricHelpPopover>
                  </div>
                </div>
                <Badge variant="outline" className={`shrink-0 text-[10px] px-1.5 py-0 ${config.badgeClass}`}>
                  {config.badge}
                </Badge>
              </div>
              <div className="flex items-end gap-1.5 mb-1.5">
                <span className="text-2xl font-semibold text-foreground tabular-nums tracking-tight">{value}</span>
                {unit && <span className="text-sm text-muted-foreground mb-0.5">{unit}</span>}
              </div>
              <div className="flex items-center gap-1.5">
                <StatusIcon className={`size-3 shrink-0 ${config.iconColor}`} />
                <span className="text-[11px] text-muted-foreground">Threshold: {threshold}</span>
              </div>
              {description && (
                <p className="text-[10px] text-muted-foreground mt-1.5 leading-relaxed line-clamp-3">{description}</p>
              )}
              <p className="mt-auto flex items-center gap-1.5 pt-3 text-[10px] text-muted-foreground">
                <Info className="size-3 shrink-0 text-primary/80" aria-hidden />
                <span>
                  <span className="md:hidden">Tap for clinical context</span>
                  <span className="hidden md:inline">Click or hover for clinical context</span>
                </span>
              </p>
            </div>

            {/* Back */}
            <div
              className="absolute inset-0 flex flex-col px-4 pb-3 pt-4 [backface-visibility:hidden] [transform:rotateY(180deg)] bg-card"
              aria-hidden={!flipped}
            >
              <div className="mb-2 flex items-center gap-2">
                <Stethoscope className="size-4 shrink-0 text-primary" aria-hidden />
                <p className="text-xs font-semibold text-foreground leading-tight">Clinical perspective</p>
              </div>
              <div className="min-h-0 flex-1 space-y-3 overflow-y-auto text-left">
                <div>
                  <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Why it matters</p>
                  <p className="text-xs leading-relaxed text-foreground mt-1">{clinicalSummary}</p>
                </div>
                <div>
                  <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                    If this metric is off track
                  </p>
                  <p className="text-xs leading-relaxed text-foreground mt-1">{clinicalIfFails}</p>
                </div>
              </div>
              <p className="mt-3 text-[10px] text-muted-foreground">
                <span className="md:hidden">Tap again to return</span>
                <span className="hidden md:inline">Click or move the pointer away to return</span>
              </p>
            </div>
          </div>
        </div>
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

const CLINICAL_FNR = {
  summary:
    "Fair gaps in who gets missed (false negatives) across age, sex, race, or other groups can mean unequal access to diabetes care and early intervention.",
  ifFails:
    "Some patient groups may be systematically under-flagged for follow-up compared with others, which raises ethical and safety concerns for pediatric programs.",
}

const CLINICAL_RECALL = {
  summary:
    "Recall tells us how many children who truly need support are caught by the model. In screening, missing true cases can delay education, monitoring, or treatment.",
  ifFails:
    "More children who would benefit from services may be missed, increasing downstream complications and eroding trust in the tool among families and clinicians.",
}

const CLINICAL_SUBGROUP = {
  summary:
    "Very small groups make estimates unstable: a few cases can swing percentages, so it is harder to know if the model is fair and reliable for everyone.",
  ifFails:
    "Decisions may rely on weak evidence for some communities; governance may require more data, monitoring, or safeguards before wider use.",
}

const CLINICAL_PSI = {
  summary:
    "PSI compares how much key inputs (like lab values or utilization) have shifted between reference and current data. Big shifts can mean the world the model learned from is not today’s world.",
  ifFails:
    "Predictions may be less trustworthy until the model is recalibrated, retrained, or validated on current practice—otherwise clinical actions could be based on outdated patterns.",
}

const KPI_HELP_FNR = (
  <>
    <p>
      Shows the largest spread in false negative rate (FNR) between subgroups, evaluated separately for each protected
      attribute column—the dashboard reports the worst column.
    </p>
    <p>Lower is better. Compare the value to the threshold line; PASS means the gap is within policy.</p>
  </>
)

const KPI_HELP_RECALL = (
  <>
    <p>
      Minimum recall across all subgroups that have at least one positive case. Recall is the share of real positives
      the model correctly flags.
    </p>
    <p>Higher is better. Values below the threshold mean at least one group is under-detected.</p>
  </>
)

const KPI_HELP_N = (
  <>
    <p>
      Shows the smallest subgroup sample size (n) across all fairness groups. Very small n makes estimates unstable and
      can trigger a warning even when other metrics look fine.
    </p>
    <p>Prefer n at or above the threshold for reliable comparisons.</p>
  </>
)

const KPI_HELP_PSI = (
  <>
    <p>
      Highlights the feature with the highest Population Stability Index (PSI) between reference and current periods—
      a measure of how much that input’s distribution shifted.
    </p>
    <p>Lower PSI is better. Severe PSI often warrants investigation or retraining.</p>
  </>
)

export function KpiCardGrid() {
  const { viewMetrics, status } = useDataset()

  if (status !== "ready" || !viewMetrics) return <EmptyKpiGrid />

  const { governance, subgroups, featureDrift } = viewMetrics

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
        clinicalSummary={CLINICAL_FNR.summary}
        clinicalIfFails={CLINICAL_FNR.ifFails}
        metricHelp={KPI_HELP_FNR}
      />
      <KpiCard
        title="Min Recall"
        value={recallCheck?.value ?? "—"}
        threshold={recallCheck?.threshold ?? "≥85%"}
        status={recallCheck?.status ?? "warning"}
        description={recallCheck?.details}
        clinicalSummary={CLINICAL_RECALL.summary}
        clinicalIfFails={CLINICAL_RECALL.ifFails}
        metricHelp={KPI_HELP_RECALL}
      />
      <KpiCard
        title="Smallest Subgroup"
        value={nCheck?.value ?? "—"}
        threshold={nCheck?.threshold ?? "≥50"}
        status={nCheck?.status ?? "warning"}
        description={nCheck?.details}
        clinicalSummary={CLINICAL_SUBGROUP.summary}
        clinicalIfFails={CLINICAL_SUBGROUP.ifFails}
        metricHelp={KPI_HELP_N}
      />
      <KpiCard
        title={psiCheck?.name ?? "PSI Max"}
        value={psiCheck?.value ?? "—"}
        threshold={psiCheck?.threshold ?? "<0.1"}
        status={psiCheck?.status ?? "warning"}
        description={
          featureDrift.length > 0
            ? `${featureDrift.filter((d) => d.status === "severe").length} severe, ${featureDrift.filter((d) => d.status === "investigate").length} investigate`
            : undefined
        }
        clinicalSummary={CLINICAL_PSI.summary}
        clinicalIfFails={CLINICAL_PSI.ifFails}
        metricHelp={KPI_HELP_PSI}
      />
    </div>
  )
}
