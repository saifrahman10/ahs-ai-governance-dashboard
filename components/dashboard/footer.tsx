"use client"

import Image from "next/image"
import { useDataset } from "@/lib/dataset-context"

export function DashboardFooter() {
  const { computedMetrics } = useDataset()

  const lastRun = computedMetrics
    ? new Date(computedMetrics.governance.timestamp).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "—"

  return (
    <footer className="border-t border-border bg-card py-4 px-6">
      <div className="mx-auto max-w-7xl flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Image
            src="/ahs_logo.png"
            alt="Alberta Health Services"
            width={120}
            height={34}
            className="h-8 w-auto opacity-60"
          />
          <span className="text-xs text-muted-foreground">
            Pediatric Diabetes AI Governance Capstone
          </span>
        </div>
        <p className="text-xs text-muted-foreground">
          {computedMetrics
            ? `Last Run: ${lastRun} · ${computedMetrics.overall.n.toLocaleString()} records evaluated`
            : "No dataset loaded"}
        </p>
      </div>
    </footer>
  )
}
