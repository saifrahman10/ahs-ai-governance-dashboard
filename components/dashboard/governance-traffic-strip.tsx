"use client"

import { cn } from "@/lib/utils"
import type { CategoryRollup } from "@/lib/governance-ui-helpers"

function pillClass(status: "pass" | "warning" | "fail") {
  if (status === "pass") return "bg-success/15 text-success border-success/25"
  if (status === "warning") return "bg-warning/15 text-warning border-warning/25"
  return "bg-destructive/15 text-destructive border-destructive/25"
}

function shortLabel(status: "pass" | "warning" | "fail") {
  if (status === "pass") return "OK"
  if (status === "warning") return "Review"
  return "Fail"
}

export function GovernanceTrafficStrip({ categories }: { categories: CategoryRollup[] }) {
  if (categories.length === 0) return null

  return (
    <div className="flex flex-wrap gap-2" aria-label="Governance category summary">
      {categories.map((c) => (
        <div
          key={c.id}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-[11px] font-medium",
            pillClass(c.status)
          )}
        >
          <span className="text-muted-foreground">{c.label}:</span>
          <span>{shortLabel(c.status)}</span>
        </div>
      ))}
    </div>
  )
}
