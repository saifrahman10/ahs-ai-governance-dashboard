"use client"

import Image from "next/image"
import { useDataset } from "@/lib/dataset-context"

export function DashboardFooter() {
  const { viewMetrics, parsedDataset } = useDataset()

  const lastRun = viewMetrics
    ? new Date(viewMetrics.governance.timestamp).toLocaleDateString("en-US", {
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
            width={160}
            height={46}
            className="h-10 w-auto sm:h-12 opacity-60"
          />
          <span className="text-xs text-muted-foreground">
            Pediatric Diabetes AI Governance Capstone
          </span>
        </div>
        <p className="text-xs text-muted-foreground text-right max-w-md">
          {viewMetrics
            ? `Last run: ${lastRun} · ${parsedDataset?.fileName ?? "dataset"} · ${viewMetrics.overall.n.toLocaleString()} records`
            : "No dataset loaded"}
        </p>
      </div>
    </footer>
  )
}
