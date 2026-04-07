export interface ColumnMapping {
  recordId?: string
  yTrue: string
  yScore: string
  yPred: string
  decisionThreshold?: string
  datasetPeriod?: string
  serviceMonth?: string
  subgroupColumns: string[]
  featureColumns: string[]
}

export interface DatasetRow {
  [key: string]: string | number | null
}

export interface ParsedDataset {
  columns: string[]
  rows: DatasetRow[]
  fileName: string
  rowCount: number
  parseWarnings: string[]
}

export interface ConfusionMatrix {
  tp: number
  fp: number
  tn: number
  fn: number
}

export interface ClassificationMetrics extends ConfusionMatrix {
  n: number
  recall: number
  precision: number
  fnr: number
  fpr: number
  accuracy: number
  f1: number
}

export interface SubgroupResult {
  groupColumn: string
  groupValue: string
  metrics: ClassificationMetrics
  ece: number
  brierScore: number
  averageScore: number
  positiveRate: number
}

export interface DriftResult {
  feature: string
  psi: number
  ksStatistic: number
  status: "stable" | "investigate" | "severe"
}

export interface PredictionDrift {
  ksStatistic: number
  psi: number
  status: "stable" | "investigate" | "severe"
}

export interface TargetDrift {
  referenceRate: number
  currentRate: number
  absoluteShift: number
  status: "stable" | "investigate" | "severe"
}

export interface DataQualityMetrics {
  totalRows: number
  totalColumns: number
  missingnessByColumn: Record<string, number>
  overallMissingness: number
  duplicateRows: number
}

export interface MetricCheckResult {
  name: string
  value: string
  numericValue: number
  threshold: string
  status: "pass" | "fail" | "warning"
  details?: string
}

export interface GovernanceDecision {
  decision: "PASS" | "NEEDS_REVIEW" | "FAIL"
  checks: MetricCheckResult[]
  passCount: number
  warnCount: number
  failCount: number
  reasoning: string[]
  timestamp: string
}

export interface TimeSeriesPoint {
  period: string
  metrics: Record<string, number>
}

export interface ComputedMetrics {
  overall: ClassificationMetrics & { ece: number; brierScore: number }
  subgroups: Record<string, SubgroupResult[]>
  featureDrift: DriftResult[]
  predictionDrift: PredictionDrift
  targetDrift: TargetDrift
  dataQuality: DataQualityMetrics
  governance: GovernanceDecision
  timeSeries: TimeSeriesPoint[]
  subgroupTimeSeries: Record<string, TimeSeriesPoint[]>
  calibrationCurve: { bin: number; predicted: number; observed: number; count: number }[]
}

export interface FilterState {
  subgroupColumn: string | null
  subgroupValue: string | null
  datasetPeriod: "all" | "Reference" | "Current"
  timeRange: { start: string; end: string } | null
}

export type DatasetStatus = "empty" | "uploading" | "mapping" | "computing" | "ready" | "error"
