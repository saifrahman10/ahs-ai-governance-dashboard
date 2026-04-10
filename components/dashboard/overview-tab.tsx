"use client"

import { UploadConfigPanel } from "@/components/dashboard/upload-config-panel"
import { GovernanceDecisionPanel } from "@/components/dashboard/governance-decision-panel"
import { DecisionLogicCard } from "@/components/dashboard/decision-logic-card"
import { KpiCardGrid } from "@/components/dashboard/kpi-cards"
import { DriftSummaryCard } from "@/components/dashboard/drift-summary-card"
import { MetricHelpPopover } from "@/components/dashboard/metric-help-popover"

export function OverviewTab() {
  return (
    <div className="flex flex-col gap-4">
      {/* Decision (wide) + upload + decision logic (stacked) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 min-w-0">
          <GovernanceDecisionPanel />
        </div>
        <div className="lg:col-span-1 flex flex-col gap-3 min-w-0">
          <UploadConfigPanel />
          <DecisionLogicCard />
        </div>
      </div>

      {/* KPI Row */}
      <section aria-label="Key performance indicators">
        <div className="flex items-center gap-2 mb-2">
          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Subgroup metric snapshot</h3>
          <MetricHelpPopover title="Subgroup metric snapshot">
            <>
              <p>
                Four high-signal governance checks. Flip each card (tap/click or hover on desktop) for clinical context;
                use the icon for how the technical value is defined.
              </p>
              <p>Values come from your uploaded evaluation data and current threshold settings.</p>
            </>
          </MetricHelpPopover>
        </div>
        <KpiCardGrid />
      </section>

      <section aria-label="Drift summary">
        <DriftSummaryCard />
      </section>
    </div>
  )
}
