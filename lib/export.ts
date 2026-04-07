import type { ComputedMetrics, ColumnMapping } from "./types"

export function exportMetricsCSV(metrics: ComputedMetrics, mapping: ColumnMapping): string {
  const lines: string[] = []

  lines.push("AI Governance Dashboard - Metrics Report")
  lines.push(`Generated: ${new Date().toISOString()}`)
  lines.push("")

  // Governance Decision
  lines.push("GOVERNANCE DECISION")
  lines.push(`Decision,${metrics.governance.decision}`)
  lines.push(`Pass,${metrics.governance.passCount}`)
  lines.push(`Warning,${metrics.governance.warnCount}`)
  lines.push(`Fail,${metrics.governance.failCount}`)
  lines.push("")

  // Metric Checks
  lines.push("METRIC CHECKS")
  lines.push("Metric,Value,Threshold,Status,Details")
  for (const c of metrics.governance.checks) {
    lines.push(`"${c.name}","${c.value}","${c.threshold}",${c.status},"${c.details ?? ""}"`)
  }
  lines.push("")

  // Overall Performance
  lines.push("OVERALL PERFORMANCE")
  lines.push(`Recall,${(metrics.overall.recall * 100).toFixed(2)}%`)
  lines.push(`Precision (PPV),${(metrics.overall.precision * 100).toFixed(2)}%`)
  lines.push(`FNR,${(metrics.overall.fnr * 100).toFixed(2)}%`)
  lines.push(`Accuracy,${(metrics.overall.accuracy * 100).toFixed(2)}%`)
  lines.push(`F1,${(metrics.overall.f1 * 100).toFixed(2)}%`)
  lines.push(`ECE,${metrics.overall.ece.toFixed(4)}`)
  lines.push(`Brier Score,${metrics.overall.brierScore.toFixed(4)}`)
  lines.push(`N,${metrics.overall.n}`)
  lines.push("")

  // Subgroup Metrics
  for (const [groupCol, subs] of Object.entries(metrics.subgroups)) {
    lines.push(`SUBGROUP METRICS: ${groupCol}`)
    lines.push("Subgroup,N,Recall,PPV,FNR,FPR,ECE,Positive Rate")
    for (const s of subs) {
      lines.push(
        `"${s.groupValue}",${s.metrics.n},${(s.metrics.recall * 100).toFixed(2)}%,${(s.metrics.precision * 100).toFixed(2)}%,${(s.metrics.fnr * 100).toFixed(2)}%,${(s.metrics.fpr * 100).toFixed(2)}%,${s.ece.toFixed(4)},${(s.positiveRate * 100).toFixed(2)}%`
      )
    }
    lines.push("")
  }

  // Feature Drift
  if (metrics.featureDrift.length > 0) {
    lines.push("FEATURE DRIFT")
    lines.push("Feature,PSI,KS Statistic,Status")
    for (const d of metrics.featureDrift) {
      lines.push(`"${d.feature}",${d.psi.toFixed(4)},${d.ksStatistic.toFixed(4)},${d.status}`)
    }
    lines.push("")
  }

  // Prediction & Target Drift
  lines.push("PREDICTION DRIFT")
  lines.push(`KS Statistic,${metrics.predictionDrift.ksStatistic.toFixed(4)}`)
  lines.push(`PSI,${metrics.predictionDrift.psi.toFixed(4)}`)
  lines.push(`Status,${metrics.predictionDrift.status}`)
  lines.push("")
  lines.push("TARGET DRIFT")
  lines.push(`Reference Rate,${(metrics.targetDrift.referenceRate * 100).toFixed(2)}%`)
  lines.push(`Current Rate,${(metrics.targetDrift.currentRate * 100).toFixed(2)}%`)
  lines.push(`Absolute Shift,${(metrics.targetDrift.absoluteShift * 100).toFixed(2)}%`)
  lines.push(`Status,${metrics.targetDrift.status}`)
  lines.push("")

  // Data Quality
  lines.push("DATA QUALITY")
  lines.push(`Total Rows,${metrics.dataQuality.totalRows}`)
  lines.push(`Overall Missingness,${(metrics.dataQuality.overallMissingness * 100).toFixed(2)}%`)
  lines.push(`Duplicate Rows,${metrics.dataQuality.duplicateRows}`)

  return lines.join("\n")
}

export function downloadCSV(content: string, filename: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

export function exportGovernanceJSON(metrics: ComputedMetrics): string {
  return JSON.stringify(
    {
      generated: new Date().toISOString(),
      governance: metrics.governance,
      overall: {
        recall: metrics.overall.recall,
        precision: metrics.overall.precision,
        fnr: metrics.overall.fnr,
        accuracy: metrics.overall.accuracy,
        f1: metrics.overall.f1,
        ece: metrics.overall.ece,
        brierScore: metrics.overall.brierScore,
        n: metrics.overall.n,
      },
      drift: {
        features: metrics.featureDrift,
        prediction: metrics.predictionDrift,
        target: metrics.targetDrift,
      },
      dataQuality: metrics.dataQuality,
    },
    null,
    2
  )
}

export function downloadJSON(content: string, filename: string) {
  const blob = new Blob([content], { type: "application/json;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}
