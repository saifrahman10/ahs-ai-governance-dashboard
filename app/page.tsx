"use client"

import { useState, useCallback, memo } from "react"
import { DatasetProvider } from "@/lib/dataset-context"
import { DashboardHeader } from "@/components/dashboard/header"
import { OverviewTab } from "@/components/dashboard/overview-tab"
import { FairnessMetricsTab } from "@/components/dashboard/fairness-metrics-tab"
import { DriftDetectionTab } from "@/components/dashboard/drift-detection-tab"
import { ModelPerformanceTab } from "@/components/dashboard/model-performance-tab"
import { DefinitionsTab } from "@/components/dashboard/definitions-tab"
import { ColumnMappingDialog } from "@/components/dashboard/column-mapping-dialog"
import { DashboardFooter } from "@/components/dashboard/footer"

const MemoOverview = memo(OverviewTab)
const MemoFairness = memo(FairnessMetricsTab)
const MemoDrift = memo(DriftDetectionTab)
const MemoPerformance = memo(ModelPerformanceTab)
const MemoDefinitions = memo(DefinitionsTab)

const tabs = [
  { id: "overview", Component: MemoOverview },
  { id: "fairness", Component: MemoFairness },
  { id: "drift", Component: MemoDrift },
  { id: "performance", Component: MemoPerformance },
  { id: "definitions", Component: MemoDefinitions },
] as const

export default function GovernanceDashboard() {
  const [activeTab, setActiveTab] = useState("overview")
  const handleTabChange = useCallback((tab: string) => setActiveTab(tab), [])

  return (
    <DatasetProvider>
      <div className="min-h-screen bg-background">
        <DashboardHeader activeTab={activeTab} onTabChange={handleTabChange} />
        <main className="mx-auto max-w-7xl px-4 py-4 sm:px-6">
          {tabs.map(({ id, Component }) => (
            <div key={id} style={{ display: activeTab === id ? "block" : "none" }}>
              <Component />
            </div>
          ))}
        </main>
        <DashboardFooter />
        <ColumnMappingDialog />
      </div>
    </DatasetProvider>
  )
}
