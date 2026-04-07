import type {
  DatasetRow,
  ColumnMapping,
  ClassificationMetrics,
  SubgroupResult,
  DriftResult,
  PredictionDrift,
  TargetDrift,
  DataQualityMetrics,
  GovernanceDecision,
  GovernanceThresholds,
  MetricCheckResult,
  ComputedMetrics,
  TimeSeriesPoint,
  ConfusionMatrix,
} from "./types"
import { DEFAULT_THRESHOLDS } from "./types"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toNum(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

function toBin(v: unknown): 0 | 1 | null {
  const n = toNum(v)
  if (n === null) return null
  return n >= 0.5 ? 1 : 0
}

// ---------------------------------------------------------------------------
// 1. Classification Metrics (Evidently-style)
// ---------------------------------------------------------------------------

function confusionMatrix(yTrue: (0 | 1)[], yPred: (0 | 1)[]): ConfusionMatrix {
  let tp = 0, fp = 0, tn = 0, fn = 0
  for (let i = 0; i < yTrue.length; i++) {
    if (yTrue[i] === 1 && yPred[i] === 1) tp++
    else if (yTrue[i] === 0 && yPred[i] === 1) fp++
    else if (yTrue[i] === 0 && yPred[i] === 0) tn++
    else fn++
  }
  return { tp, fp, tn, fn }
}

function classificationMetrics(yTrue: (0 | 1)[], yPred: (0 | 1)[]): ClassificationMetrics {
  const cm = confusionMatrix(yTrue, yPred)
  const n = yTrue.length
  const recall = cm.tp + cm.fn > 0 ? cm.tp / (cm.tp + cm.fn) : 0
  const precision = cm.tp + cm.fp > 0 ? cm.tp / (cm.tp + cm.fp) : 0
  const fnr = cm.tp + cm.fn > 0 ? cm.fn / (cm.tp + cm.fn) : 0
  const fpr = cm.fp + cm.tn > 0 ? cm.fp / (cm.fp + cm.tn) : 0
  const accuracy = n > 0 ? (cm.tp + cm.tn) / n : 0
  const f1 = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0

  return { ...cm, n, recall, precision, fnr, fpr, accuracy, f1 }
}

// ---------------------------------------------------------------------------
// 2. Calibration – Expected Calibration Error (Evidently-style)
// ---------------------------------------------------------------------------

function expectedCalibrationError(
  yTrue: (0 | 1)[],
  yScore: number[],
  nBins: number = 10
): { ece: number; brierScore: number; curve: { bin: number; predicted: number; observed: number; count: number }[] } {
  const bins: { sumScore: number; sumTrue: number; count: number }[] = Array.from(
    { length: nBins },
    () => ({ sumScore: 0, sumTrue: 0, count: 0 })
  )

  let brierSum = 0
  for (let i = 0; i < yTrue.length; i++) {
    const score = Math.max(0, Math.min(1, yScore[i]))
    const binIdx = Math.min(Math.floor(score * nBins), nBins - 1)
    bins[binIdx].sumScore += score
    bins[binIdx].sumTrue += yTrue[i]
    bins[binIdx].count++
    brierSum += (score - yTrue[i]) ** 2
  }

  const n = yTrue.length
  let ece = 0
  const curve: { bin: number; predicted: number; observed: number; count: number }[] = []

  for (let i = 0; i < nBins; i++) {
    const b = bins[i]
    if (b.count === 0) continue
    const avgPred = b.sumScore / b.count
    const avgTrue = b.sumTrue / b.count
    ece += (b.count / n) * Math.abs(avgPred - avgTrue)
    curve.push({ bin: i, predicted: avgPred, observed: avgTrue, count: b.count })
  }

  return { ece, brierScore: n > 0 ? brierSum / n : 0, curve }
}

// ---------------------------------------------------------------------------
// 3. Population Stability Index (PSI) – Evidently drift metric
// ---------------------------------------------------------------------------

function computePSI(reference: number[], current: number[], nBins: number = 10): number {
  if (reference.length === 0 || current.length === 0) return 0

  let min = reference[0], max = reference[0]
  for (const v of reference) { if (v < min) min = v; if (v > max) max = v }
  for (const v of current) { if (v < min) min = v; if (v > max) max = v }
  if (min === max) return 0

  const binWidth = (max - min) / nBins
  const epsilon = 1e-6

  const refCounts = new Array(nBins).fill(0)
  const curCounts = new Array(nBins).fill(0)

  for (const v of reference) {
    const idx = Math.min(Math.floor((v - min) / binWidth), nBins - 1)
    refCounts[idx]++
  }
  for (const v of current) {
    const idx = Math.min(Math.floor((v - min) / binWidth), nBins - 1)
    curCounts[idx]++
  }

  let psi = 0
  for (let i = 0; i < nBins; i++) {
    const refPct = (refCounts[i] + epsilon) / reference.length
    const curPct = (curCounts[i] + epsilon) / current.length
    psi += (curPct - refPct) * Math.log(curPct / refPct)
  }

  return Math.max(0, psi)
}

// ---------------------------------------------------------------------------
// 4. Kolmogorov-Smirnov Statistic
// ---------------------------------------------------------------------------

function computeKS(reference: number[], current: number[]): number {
  if (reference.length === 0 || current.length === 0) return 0

  const refSorted = Float64Array.from(reference).sort()
  const curSorted = Float64Array.from(current).sort()
  const nRef = refSorted.length
  const nCur = curSorted.length

  let i = 0, j = 0, maxDiff = 0

  while (i < nRef && j < nCur) {
    if (refSorted[i] <= curSorted[j]) {
      i++
    } else {
      j++
    }
    const refCDF = i / nRef
    const curCDF = j / nCur
    const diff = Math.abs(refCDF - curCDF)
    if (diff > maxDiff) maxDiff = diff
  }

  return maxDiff
}

function driftStatus(psi: number): "stable" | "investigate" | "severe" {
  if (psi < 0.1) return "stable"
  if (psi < 0.2) return "investigate"
  return "severe"
}

// ---------------------------------------------------------------------------
// 5. Data Quality (Evidently-style)
// ---------------------------------------------------------------------------

function computeDataQuality(rows: DatasetRow[], columns: string[]): DataQualityMetrics {
  const missingnessByColumn: Record<string, number> = {}
  let totalMissing = 0
  const totalCells = rows.length * columns.length

  for (const col of columns) {
    let missing = 0
    for (const row of rows) {
      if (row[col] === null || row[col] === undefined || row[col] === "") missing++
    }
    missingnessByColumn[col] = rows.length > 0 ? missing / rows.length : 0
    totalMissing += missing
  }

  const seen = new Set<string>()
  let dupes = 0
  for (const row of rows) {
    const key = columns.map((c) => String(row[c] ?? "")).join("|")
    if (seen.has(key)) dupes++
    else seen.add(key)
  }

  return {
    totalRows: rows.length,
    totalColumns: columns.length,
    missingnessByColumn,
    overallMissingness: totalCells > 0 ? totalMissing / totalCells : 0,
    duplicateRows: dupes,
  }
}

// ---------------------------------------------------------------------------
// 6. Subgroup Stratification
// ---------------------------------------------------------------------------

function computeSubgroupMetrics(
  rows: DatasetRow[],
  mapping: ColumnMapping
): Record<string, SubgroupResult[]> {
  const result: Record<string, SubgroupResult[]> = {}

  for (const groupCol of mapping.subgroupColumns) {
    const groups = new Map<string, DatasetRow[]>()
    for (const row of rows) {
      const val = String(row[groupCol] ?? "Unknown")
      if (!groups.has(val)) groups.set(val, [])
      groups.get(val)!.push(row)
    }

    const subResults: SubgroupResult[] = []
    for (const [groupValue, groupRows] of groups) {
      const yTrue: (0 | 1)[] = []
      const yPred: (0 | 1)[] = []
      const yScore: number[] = []

      for (const row of groupRows) {
        const t = toBin(row[mapping.yTrue])
        const p = toBin(row[mapping.yPred])
        const s = toNum(row[mapping.yScore])
        if (t !== null && p !== null) {
          yTrue.push(t)
          yPred.push(p)
          yScore.push(s ?? 0)
        }
      }

      if (yTrue.length === 0) continue

      const metrics = classificationMetrics(yTrue, yPred)
      const { ece, brierScore } = expectedCalibrationError(yTrue, yScore)
      const avgScore = yScore.length > 0 ? yScore.reduce((a, b) => a + b, 0) / yScore.length : 0
      const posRate = yTrue.filter((v) => v === 1).length / yTrue.length

      subResults.push({
        groupColumn: groupCol,
        groupValue,
        metrics,
        ece,
        brierScore,
        averageScore: avgScore,
        positiveRate: posRate,
      })
    }

    subResults.sort((a, b) => b.metrics.n - a.metrics.n)
    result[groupCol] = subResults
  }

  return result
}

// ---------------------------------------------------------------------------
// 7. Time Series Computation
// ---------------------------------------------------------------------------

function computeTimeSeries(
  rows: DatasetRow[],
  mapping: ColumnMapping
): TimeSeriesPoint[] {
  if (!mapping.serviceMonth) return []

  const groups = new Map<string, DatasetRow[]>()
  for (const row of rows) {
    const period = String(row[mapping.serviceMonth] ?? "")
    if (!period) continue
    if (!groups.has(period)) groups.set(period, [])
    groups.get(period)!.push(row)
  }

  const points: TimeSeriesPoint[] = []
  const sortedPeriods = [...groups.keys()].sort()

  for (const period of sortedPeriods) {
    const periodRows = groups.get(period)!
    const yTrue: (0 | 1)[] = []
    const yPred: (0 | 1)[] = []
    const yScore: number[] = []

    for (const row of periodRows) {
      const t = toBin(row[mapping.yTrue])
      const p = toBin(row[mapping.yPred])
      const s = toNum(row[mapping.yScore])
      if (t !== null && p !== null) {
        yTrue.push(t)
        yPred.push(p)
        yScore.push(s ?? 0)
      }
    }

    if (yTrue.length === 0) continue

    const m = classificationMetrics(yTrue, yPred)
    const { ece } = expectedCalibrationError(yTrue, yScore)
    const posRate = yTrue.filter((v) => v === 1).length / yTrue.length

    points.push({
      period,
      metrics: {
        recall: m.recall,
        precision: m.precision,
        fnr: m.fnr,
        fpr: m.fpr,
        accuracy: m.accuracy,
        f1: m.f1,
        ece,
        positiveRate: posRate,
        n: m.n,
      },
    })
  }

  return points
}

function computeSubgroupTimeSeries(
  rows: DatasetRow[],
  mapping: ColumnMapping
): Record<string, TimeSeriesPoint[]> {
  if (!mapping.serviceMonth || mapping.subgroupColumns.length === 0) return {}

  const result: Record<string, TimeSeriesPoint[]> = {}

  for (const groupCol of mapping.subgroupColumns) {
    const subgroupValues = [...new Set(rows.map((r) => String(r[groupCol] ?? "Unknown")))]

    const periods = new Map<string, Map<string, DatasetRow[]>>()
    for (const row of rows) {
      const period = String(row[mapping.serviceMonth] ?? "")
      if (!period) continue
      if (!periods.has(period)) periods.set(period, new Map())
      const subVal = String(row[groupCol] ?? "Unknown")
      if (!periods.get(period)!.has(subVal)) periods.get(period)!.set(subVal, [])
      periods.get(period)!.get(subVal)!.push(row)
    }

    const sortedPeriods = [...periods.keys()].sort()
    const points: TimeSeriesPoint[] = []

    for (const period of sortedPeriods) {
      const periodData = periods.get(period)!
      const metricsRecord: Record<string, number> = {}

      for (const subVal of subgroupValues) {
        const subRows = periodData.get(subVal) ?? []
        const yTrue: (0 | 1)[] = []
        const yPred: (0 | 1)[] = []

        for (const row of subRows) {
          const t = toBin(row[mapping.yTrue])
          const p = toBin(row[mapping.yPred])
          if (t !== null && p !== null) {
            yTrue.push(t)
            yPred.push(p)
          }
        }

        if (yTrue.length > 0) {
          const m = classificationMetrics(yTrue, yPred)
          metricsRecord[`${subVal}_fnr`] = m.fnr
          metricsRecord[`${subVal}_recall`] = m.recall
          metricsRecord[`${subVal}_n`] = m.n
        }
      }

      points.push({ period, metrics: metricsRecord })
    }

    result[groupCol] = points
  }

  return result
}

// ---------------------------------------------------------------------------
// 8. Governance Decision Engine (Evidently-style thresholds)
// ---------------------------------------------------------------------------

function computeGovernance(
  overall: ClassificationMetrics & { ece: number },
  subgroups: Record<string, SubgroupResult[]>,
  featureDrift: DriftResult[],
  predictionDrift: PredictionDrift,
  targetDrift: TargetDrift,
  thresholds: GovernanceThresholds = DEFAULT_THRESHOLDS
): GovernanceDecision {
  const checks: MetricCheckResult[] = []
  const reasoning: string[] = []

  // Collect all subgroup results across all group columns
  const allSubgroups = Object.values(subgroups).flat()

  // Compute FNR and PPV disparity per-column (within each protected characteristic),
  // then report the worst column. Cross-column comparisons are not meaningful.
  let maxFnrDisparity = 0
  let fnrWorstCol = ""
  let fnrWorstGroup = ""
  let fnrBestGroup = ""
  let fnrWorstVal = 0
  let fnrBestVal = 0

  let maxPpvDisparity = 0
  let ppvWorstCol = ""

  let globalMinRecall = 1
  let globalMinRecallGroup = ""

  for (const [colName, colSubgroups] of Object.entries(subgroups)) {
    const withPos = colSubgroups.filter((s) => s.metrics.tp + s.metrics.fn > 0)
    const withPredPos = colSubgroups.filter((s) => s.metrics.tp + s.metrics.fp > 0)

    if (withPos.length >= 2) {
      const fnrs = withPos.map((s) => s.metrics.fnr)
      const disparity = Math.max(...fnrs) - Math.min(...fnrs)
      if (disparity > maxFnrDisparity) {
        maxFnrDisparity = disparity
        fnrWorstCol = colName
        const worst = withPos.reduce((a, b) => (a.metrics.fnr > b.metrics.fnr ? a : b))
        const best = withPos.reduce((a, b) => (a.metrics.fnr < b.metrics.fnr ? a : b))
        fnrWorstGroup = worst.groupValue
        fnrBestGroup = best.groupValue
        fnrWorstVal = worst.metrics.fnr
        fnrBestVal = best.metrics.fnr
      }
    }

    if (withPredPos.length >= 2) {
      const ppvs = withPredPos.map((s) => s.metrics.precision)
      const disparity = Math.max(...ppvs) - Math.min(...ppvs)
      if (disparity > maxPpvDisparity) {
        maxPpvDisparity = disparity
        ppvWorstCol = colName
      }
    }

    for (const s of withPos) {
      if (s.metrics.recall < globalMinRecall) {
        globalMinRecall = s.metrics.recall
        globalMinRecallGroup = `${s.groupValue} (${colName})`
      }
    }
  }

  // --- FNR Disparity (worst per-column) ---
  checks.push({
    name: "FNR Disparity",
    value: `${(maxFnrDisparity * 100).toFixed(1)}%`,
    numericValue: maxFnrDisparity,
    threshold: `≤${(thresholds.fnrDisparity * 100).toFixed(0)}%`,
    status: maxFnrDisparity <= thresholds.fnrDisparity ? "pass" : "fail",
    details: fnrWorstCol
      ? `${fnrWorstCol}: ${fnrWorstGroup} (${(fnrWorstVal * 100).toFixed(1)}%) vs ${fnrBestGroup} (${(fnrBestVal * 100).toFixed(1)}%)`
      : undefined,
  })

  // --- PPV Disparity (worst per-column) ---
  checks.push({
    name: "PPV Disparity",
    value: `${(maxPpvDisparity * 100).toFixed(1)}%`,
    numericValue: maxPpvDisparity,
    threshold: `≤${(thresholds.ppvDisparity * 100).toFixed(0)}%`,
    status: maxPpvDisparity <= thresholds.ppvDisparity ? "pass" : "fail",
    details: ppvWorstCol ? `Worst column: ${ppvWorstCol}` : undefined,
  })

  // --- Minimum Recall (across all subgroups) ---
  if (allSubgroups.length > 0) {
    const subsWithPositives = allSubgroups.filter((s) => s.metrics.tp + s.metrics.fn > 0)
    if (subsWithPositives.length > 0) {
      checks.push({
        name: "Min Recall",
        value: `${(globalMinRecall * 100).toFixed(1)}%`,
        numericValue: globalMinRecall,
        threshold: `≥${(thresholds.minRecall * 100).toFixed(0)}%`,
        status: globalMinRecall >= thresholds.minRecall ? "pass" : "fail",
        details: `Lowest: ${globalMinRecallGroup}`,
      })
    }
  }

  // --- Calibration ECE ---
  checks.push({
    name: "Calibration ECE",
    value: overall.ece.toFixed(3),
    numericValue: overall.ece,
    threshold: `<${thresholds.ece.toFixed(2)}`,
    status: overall.ece < thresholds.ece ? "pass" : "fail",
  })

  // --- PSI max ---
  if (featureDrift.length > 0) {
    const maxPsi = Math.max(...featureDrift.map((d) => d.psi))
    const worstFeature = featureDrift.reduce((a, b) => (a.psi > b.psi ? a : b))
    checks.push({
      name: `PSI Max (${worstFeature.feature})`,
      value: maxPsi.toFixed(3),
      numericValue: maxPsi,
      threshold: `<${thresholds.psiWarning.toFixed(1)}`,
      status: maxPsi < thresholds.psiWarning ? "pass" : maxPsi < thresholds.psiSevere ? "warning" : "fail",
    })
  }

  // --- Prediction Drift (KS) ---
  checks.push({
    name: "Prediction Drift (KS)",
    value: predictionDrift.ksStatistic.toFixed(3),
    numericValue: predictionDrift.ksStatistic,
    threshold: `<${thresholds.predictionKS.toFixed(1)}`,
    status: predictionDrift.ksStatistic < thresholds.predictionKS ? "pass" : predictionDrift.ksStatistic < thresholds.psiSevere ? "warning" : "fail",
  })

  // --- Target Drift ---
  checks.push({
    name: "Target Drift",
    value: `${(targetDrift.absoluteShift * 100).toFixed(2)}%`,
    numericValue: targetDrift.absoluteShift,
    threshold: `<${(thresholds.targetDriftWarning * 100).toFixed(0)}%`,
    status: targetDrift.absoluteShift < thresholds.targetDriftWarning ? "pass" : targetDrift.absoluteShift < thresholds.targetDriftSevere ? "warning" : "fail",
  })

  // --- Minimum subgroup N ---
  if (allSubgroups.length > 0) {
    const minN = Math.min(...allSubgroups.map((s) => s.metrics.n))
    const smallestGroup = allSubgroups.reduce((a, b) => (a.metrics.n < b.metrics.n ? a : b))
    checks.push({
      name: `Subgroup n≥${thresholds.minSubgroupN}`,
      value: `n=${minN}`,
      numericValue: minN,
      threshold: `≥${thresholds.minSubgroupN}`,
      status: minN >= thresholds.minSubgroupN ? "pass" : "warning",
      details: `Smallest: ${smallestGroup.groupValue}`,
    })
  }

  // --- Decision Logic ---
  const passCount = checks.filter((c) => c.status === "pass").length
  const warnCount = checks.filter((c) => c.status === "warning").length
  const failCount = checks.filter((c) => c.status === "fail").length

  let decision: "PASS" | "NEEDS_REVIEW" | "FAIL"
  if (failCount >= 2) {
    decision = "FAIL"
    reasoning.push(`${failCount} metrics exceed thresholds; clinical deployment blocked.`)
  } else if (failCount === 1) {
    const failedCheck = checks.find((c) => c.status === "fail")!
    const overThreshold = failedCheck.numericValue / parseFloat(failedCheck.threshold.replace(/[^0-9.]/g, "")) - 1
    if (overThreshold >= 0.2) {
      decision = "FAIL"
      reasoning.push(`${failedCheck.name} exceeds threshold by ≥20%.`)
    } else {
      decision = "NEEDS_REVIEW"
      reasoning.push(`${failedCheck.name} exceeds threshold but within 20% margin.`)
    }
  } else if (warnCount > 0) {
    decision = "NEEDS_REVIEW"
    reasoning.push(`${warnCount} metric(s) flagged for review.`)
  } else {
    decision = "PASS"
    reasoning.push("All metrics within acceptable thresholds.")
  }

  return {
    decision,
    checks,
    passCount,
    warnCount,
    failCount,
    reasoning,
    timestamp: new Date().toISOString(),
  }
}

// ---------------------------------------------------------------------------
// 9. Main Orchestrator
// ---------------------------------------------------------------------------

export function computeAllMetrics(
  rows: DatasetRow[],
  mapping: ColumnMapping,
  thresholds: GovernanceThresholds = DEFAULT_THRESHOLDS
): ComputedMetrics {
  // Extract overall arrays
  const yTrueAll: (0 | 1)[] = []
  const yPredAll: (0 | 1)[] = []
  const yScoreAll: number[] = []

  for (const row of rows) {
    const t = toBin(row[mapping.yTrue])
    const p = toBin(row[mapping.yPred])
    const s = toNum(row[mapping.yScore])
    if (t !== null && p !== null) {
      yTrueAll.push(t)
      yPredAll.push(p)
      yScoreAll.push(s ?? 0)
    }
  }

  // Overall classification
  const overallClassification = classificationMetrics(yTrueAll, yPredAll)
  const { ece: overallEce, brierScore, curve: calibrationCurve } = expectedCalibrationError(yTrueAll, yScoreAll)
  const overall = { ...overallClassification, ece: overallEce, brierScore }

  // Subgroup metrics
  const subgroups = computeSubgroupMetrics(rows, mapping)

  // Drift detection: split by dataset_period if available
  let refRows = rows
  let curRows = rows
  if (mapping.datasetPeriod) {
    refRows = rows.filter((r) => String(r[mapping.datasetPeriod!]).toLowerCase() === "reference")
    curRows = rows.filter((r) => String(r[mapping.datasetPeriod!]).toLowerCase() === "current")
    if (refRows.length === 0) refRows = rows
    if (curRows.length === 0) curRows = rows
  }

  // Feature drift
  const featureDrift: DriftResult[] = []
  for (const feat of mapping.featureColumns) {
    const refValues = refRows.map((r) => toNum(r[feat])).filter((v): v is number => v !== null)
    const curValues = curRows.map((r) => toNum(r[feat])).filter((v): v is number => v !== null)
    if (refValues.length > 0 && curValues.length > 0) {
      const psi = computePSI(refValues, curValues)
      const ks = computeKS(refValues, curValues)
      featureDrift.push({ feature: feat, psi, ksStatistic: ks, status: driftStatus(psi) })
    }
  }
  featureDrift.sort((a, b) => b.psi - a.psi)

  // Prediction drift
  const refScores = refRows.map((r) => toNum(r[mapping.yScore])).filter((v): v is number => v !== null)
  const curScores = curRows.map((r) => toNum(r[mapping.yScore])).filter((v): v is number => v !== null)
  const predPsi = computePSI(refScores, curScores)
  const predKs = computeKS(refScores, curScores)
  const predictionDrift: PredictionDrift = {
    ksStatistic: predKs,
    psi: predPsi,
    status: driftStatus(predPsi),
  }

  // Target drift
  const refTargets = refRows.map((r) => toBin(r[mapping.yTrue])).filter((v): v is 0 | 1 => v !== null)
  const curTargets = curRows.map((r) => toBin(r[mapping.yTrue])).filter((v): v is 0 | 1 => v !== null)
  const refRate = refTargets.length > 0 ? refTargets.filter((v) => v === 1).length / refTargets.length : 0
  const curRate = curTargets.length > 0 ? curTargets.filter((v) => v === 1).length / curTargets.length : 0
  const targetDrift: TargetDrift = {
    referenceRate: refRate,
    currentRate: curRate,
    absoluteShift: Math.abs(curRate - refRate),
    status: Math.abs(curRate - refRate) < 0.05 ? "stable" : Math.abs(curRate - refRate) < 0.1 ? "investigate" : "severe",
  }

  // Data quality
  const dataQuality = computeDataQuality(rows, mapping.featureColumns.length > 0 ? mapping.featureColumns : rows.length > 0 ? Object.keys(rows[0]) : [])

  // Time series
  const timeSeries = computeTimeSeries(rows, mapping)
  const subgroupTimeSeries = computeSubgroupTimeSeries(rows, mapping)

  // Governance decision
  const governance = computeGovernance(overall, subgroups, featureDrift, predictionDrift, targetDrift, thresholds)

  return {
    overall,
    subgroups,
    featureDrift,
    predictionDrift,
    targetDrift,
    dataQuality,
    governance,
    timeSeries,
    subgroupTimeSeries,
    calibrationCurve,
  }
}
