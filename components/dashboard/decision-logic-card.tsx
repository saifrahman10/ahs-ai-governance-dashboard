"use client"

import { Info, CheckCircle2, AlertTriangle, XCircle } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { MetricHelpPopover } from "@/components/dashboard/metric-help-popover"

/** Matches `computeGovernance` in lib/metrics.ts */
export const GOVERNANCE_DECISION_RULES = [
  {
    condition: "Zero failed checks and zero warnings",
    result: "PASS",
    icon: CheckCircle2,
    iconColor: "text-success",
    resultColor: "bg-success/10 text-success border-success/20",
  },
  {
    condition: "Zero fails, one or more warnings (e.g. drift, subgroup sample size)",
    result: "NEEDS REVIEW",
    icon: AlertTriangle,
    iconColor: "text-warning",
    resultColor: "bg-warning/10 text-warning border-warning/20",
  },
  {
    condition: "Exactly one failed check, and not more than ~20% beyond its threshold",
    result: "NEEDS REVIEW",
    icon: AlertTriangle,
    iconColor: "text-warning",
    resultColor: "bg-warning/10 text-warning border-warning/20",
  },
  {
    condition: "Exactly one failed check, ≥20% beyond threshold",
    result: "FAIL",
    icon: XCircle,
    iconColor: "text-destructive",
    resultColor: "bg-destructive/10 text-destructive border-destructive/20",
  },
  {
    condition: "Two or more failed checks",
    result: "FAIL",
    icon: XCircle,
    iconColor: "text-destructive",
    resultColor: "bg-destructive/10 text-destructive border-destructive/20",
  },
] as const

export function DecisionLogicCard() {
  return (
    <Card className="border-primary/20 bg-primary/[0.02]">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-foreground flex items-center gap-2 flex-wrap">
          <Info className="size-4 text-primary" />
          <span className="flex items-center gap-1.5">
            Decision Logic Summary
            <MetricHelpPopover title="Decision logic summary">
              <p>
                Rules mirror the implementation in the metrics engine: failed checks and warnings are counted first,
                then the single-fail margin rule (~20% beyond threshold) is applied.
              </p>
            </MetricHelpPopover>
          </span>
        </CardTitle>
        <CardDescription className="text-xs">
          How PASS / NEEDS REVIEW / FAIL is derived from metric checks (see metrics engine)
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {GOVERNANCE_DECISION_RULES.map((rule, i) => {
          const Icon = rule.icon
          return (
            <div key={i} className="flex items-center justify-between gap-2 rounded-md bg-card border border-border px-3 py-2">
              <div className="flex items-start gap-2 min-w-0">
                <Icon className={`size-3.5 shrink-0 mt-0.5 ${rule.iconColor}`} />
                <span className="text-xs text-foreground leading-snug">{rule.condition}</span>
              </div>
              <Badge variant="outline" className={`text-[10px] px-2 py-0 font-medium shrink-0 ${rule.resultColor}`}>
                {rule.result}
              </Badge>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
