import type { MetricCheckResult, SubgroupResult } from "./types"

export type GovernanceCategory = "fairness" | "calibration" | "drift" | "data"

export function checkCategory(name: string): GovernanceCategory {
  if (name === "FNR Disparity" || name === "PPV Disparity" || name === "Min Recall") return "fairness"
  if (name === "Calibration ECE") return "calibration"
  if (name.startsWith("PSI Max") || name === "Prediction Drift (KS)" || name === "Target Drift") return "drift"
  if (name.startsWith("Subgroup n")) return "data"
  return "fairness"
}

export type CategoryRollup = {
  id: GovernanceCategory
  label: string
  status: "pass" | "warning" | "fail"
}

function worst(a: "pass" | "warning" | "fail", b: "pass" | "warning" | "fail"): "pass" | "warning" | "fail" {
  const rank = { fail: 3, warning: 2, pass: 1 }
  return rank[a] >= rank[b] ? a : b
}

export function rollupGovernanceCategories(checks: MetricCheckResult[]): CategoryRollup[] {
  const labels: Record<GovernanceCategory, string> = {
    fairness: "Fairness",
    calibration: "Calibration",
    drift: "Drift",
    data: "Sample size",
  }

  const agg: Record<GovernanceCategory, "pass" | "warning" | "fail" | null> = {
    fairness: null,
    calibration: null,
    drift: null,
    data: null,
  }

  for (const c of checks) {
    const cat = checkCategory(c.name)
    const s = c.status === "fail" ? "fail" : c.status === "warning" ? "warning" : "pass"
    agg[cat] = agg[cat] === null ? s : worst(agg[cat]!, s)
  }

  return (["fairness", "calibration", "drift", "data"] as GovernanceCategory[])
    .filter((id) => agg[id] !== null)
    .map((id) => ({
      id,
      label: labels[id],
      status: agg[id]!,
    }))
}

export function executiveSummaryLine(decision: string, failCount: number, warnCount: number): string {
  if (decision === "PASS") {
    return "All governance checks passed at current thresholds—suitable for routine oversight review."
  }
  if (decision === "NEEDS_REVIEW") {
    if (failCount === 0 && warnCount > 0) {
      return `${warnCount} metric(s) need council review (warnings only)—no hard failures, but follow up before expanding use.`
    }
    return "One metric failed within a narrow margin—review before relying on this run for deployment decisions."
  }
  return "One or more critical thresholds failed—do not treat this model as ready for broader deployment without remediation."
}

export function findWorstRecall(subgroups: Record<string, SubgroupResult[]>): {
  recall: number
  label: string
} | null {
  let best: { recall: number; label: string } | null = null
  for (const [col, rows] of Object.entries(subgroups)) {
    for (const s of rows) {
      if (s.metrics.tp + s.metrics.fn === 0) continue
      if (!best || s.metrics.recall < best.recall) {
        best = { recall: s.metrics.recall, label: `${s.groupValue} · ${col}` }
      }
    }
  }
  return best
}
