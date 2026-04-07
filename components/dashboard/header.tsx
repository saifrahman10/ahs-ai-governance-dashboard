"use client"

import { useState } from "react"
import Image from "next/image"
import { Bell, Download, FileJson, FileSpreadsheet, Settings2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useDataset } from "@/lib/dataset-context"
import { exportMetricsCSV, downloadCSV, exportGovernanceJSON, downloadJSON } from "@/lib/export"
import { ThresholdSettingsDrawer } from "./threshold-settings-drawer"
import { DEFAULT_THRESHOLDS } from "@/lib/types"

interface DashboardHeaderProps {
  activeTab: string
  onTabChange: (tab: string) => void
}

const tabs = [
  { id: "overview", label: "Overview" },
  { id: "fairness", label: "Fairness Metrics" },
  { id: "drift", label: "Drift Detection" },
  { id: "performance", label: "Model Performance" },
  { id: "definitions", label: "Definitions" },
]

export function DashboardHeader({ activeTab, onTabChange }: DashboardHeaderProps) {
  const { computedMetrics, columnMapping, status, thresholds } = useDataset()
  const hasData = status === "ready" && computedMetrics !== null
  const [settingsOpen, setSettingsOpen] = useState(false)

  const isCustomThresholds = (Object.keys(thresholds) as (keyof typeof thresholds)[]).some(
    (k) => thresholds[k] !== DEFAULT_THRESHOLDS[k]
  )

  function handleExportCSV() {
    if (!computedMetrics || !columnMapping) return
    const csv = exportMetricsCSV(computedMetrics, columnMapping)
    downloadCSV(csv, `governance-report-${new Date().toISOString().slice(0, 10)}.csv`)
  }

  function handleExportJSON() {
    if (!computedMetrics) return
    const json = exportGovernanceJSON(computedMetrics)
    downloadJSON(json, `governance-report-${new Date().toISOString().slice(0, 10)}.json`)
  }

  const alertCount =
    hasData ? computedMetrics.governance.failCount + computedMetrics.governance.warnCount : 0

  return (
    <header className="border-b border-border bg-card">
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-4">
          <Image
            src="/ahs_logo.png"
            alt="Alberta Health Services"
            width={180}
            height={52}
            className="h-12 w-auto"
            priority
          />
          <div className="h-10 w-px bg-border" />
          <div>
            <h1 className="text-base font-semibold text-foreground tracking-tight">
              AI Governance Dashboard
            </h1>
            <p className="text-xs text-muted-foreground">
              Pediatric Diabetes &middot; Model Oversight
            </p>
          </div>
          <Badge variant="outline" className="ml-3 text-[10px] font-mono border-border text-muted-foreground">
            v2.4.1
          </Badge>
          {hasData && (
            <Badge
              variant="outline"
              className={`ml-1 text-[10px] font-medium ${
                computedMetrics.governance.decision === "PASS"
                  ? "bg-success/10 text-success border-success/20"
                  : computedMetrics.governance.decision === "FAIL"
                  ? "bg-destructive/10 text-destructive border-destructive/20"
                  : "bg-warning/10 text-warning border-warning/20"
              }`}
            >
              {computedMetrics.governance.decision}
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="text-xs gap-1.5 text-muted-foreground relative"
            onClick={() => setSettingsOpen(true)}
          >
            <Settings2 className="size-3.5" />
            Thresholds
            {isCustomThresholds && (
              <span className="absolute -top-1 -right-1 flex size-2">
                <span className="relative inline-flex size-2 rounded-full bg-warning" />
              </span>
            )}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="text-xs gap-1.5 text-muted-foreground"
                disabled={!hasData}
              >
                <Download className="size-3.5" />
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleExportCSV} className="text-xs gap-2">
                <FileSpreadsheet className="size-3.5" />
                Export as CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportJSON} className="text-xs gap-2">
                <FileJson className="size-3.5" />
                Export as JSON
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="ghost" size="icon" className="relative text-muted-foreground hover:text-foreground">
            <Bell className="size-4" />
            {alertCount > 0 && (
              <>
                <span className="absolute -top-0.5 -right-0.5 flex size-2">
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-destructive opacity-75" />
                  <span className="relative inline-flex size-2 rounded-full bg-destructive" />
                </span>
              </>
            )}
            <span className="sr-only">Notifications ({alertCount})</span>
          </Button>
          <div className="ml-2 flex items-center gap-2 pl-2 border-l border-border">
            <div className="size-7 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
              <span className="text-xs font-medium text-primary">GC</span>
            </div>
            <div className="hidden lg:block">
              <p className="text-xs font-medium text-foreground">Governance Council</p>
              <p className="text-[10px] text-muted-foreground">Clinical Admin</p>
            </div>
          </div>
        </div>
      </div>

      <nav className="flex items-center gap-1 px-6 pb-0" role="tablist" aria-label="Dashboard navigation">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={activeTab === tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`px-3 py-2.5 text-sm font-medium transition-colors relative ${
              activeTab === tab.id
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
            {activeTab === tab.id && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t-full" />
            )}
          </button>
        ))}
      </nav>
      <ThresholdSettingsDrawer open={settingsOpen} onOpenChange={setSettingsOpen} />
    </header>
  )
}
