"use client"

import { UploadConfigPanel } from "@/components/dashboard/upload-config-panel"
import { GovernanceDecisionPanel } from "@/components/dashboard/governance-decision-panel"
import { KpiCardGrid } from "@/components/dashboard/kpi-cards"
import { DriftSummaryCard } from "@/components/dashboard/drift-summary-card"

export function OverviewTab() {
  return (
    <div className="flex flex-col gap-6">
      {/* KPI Row */}
      <section aria-label="Key performance indicators">
        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
          Subgroup Metric Snapshot
        </h3>
        <KpiCardGrid />
      </section>

      {/* Two-column: Decision + Upload */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <GovernanceDecisionPanel />
        </div>
        <div className="lg:col-span-1">
          <UploadConfigPanel />
        </div>
      </div>

      {/* Drift summary full width */}
      <section aria-label="Drift summary">
        <DriftSummaryCard />
      </section>
    </div>
  )
}
