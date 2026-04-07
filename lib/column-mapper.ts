import type { ColumnMapping } from "./types"

interface FieldCandidate {
  key: keyof ColumnMapping | "subgroupColumns" | "featureColumns"
  label: string
  description: string
  required: boolean
  multi?: boolean
  patterns: RegExp[]
}

const FIELD_CANDIDATES: FieldCandidate[] = [
  {
    key: "yTrue",
    label: "Ground Truth Label",
    description: "Binary outcome (0/1) — the actual label",
    required: true,
    patterns: [
      /^y_true$/i,
      /^label$/i,
      /^target$/i,
      /^outcome$/i,
      /^actual$/i,
      /^ground.?truth$/i,
      /^y$/i,
      /^is_positive$/i,
    ],
  },
  {
    key: "yScore",
    label: "Prediction Score",
    description: "Model output probability / continuous score",
    required: true,
    patterns: [
      /^y_score$/i,
      /^score$/i,
      /^probability$/i,
      /^pred_prob$/i,
      /^predicted_probability$/i,
      /^prediction_score$/i,
      /^prob$/i,
      /^p_hat$/i,
    ],
  },
  {
    key: "yPred",
    label: "Predicted Label",
    description: "Binary prediction (0/1) after applying threshold",
    required: true,
    patterns: [
      /^y_pred$/i,
      /^prediction$/i,
      /^predicted$/i,
      /^predicted_label$/i,
      /^pred$/i,
      /^y_hat$/i,
    ],
  },
  {
    key: "recordId",
    label: "Record ID",
    description: "Unique row identifier",
    required: false,
    patterns: [
      /^record_id$/i,
      /^id$/i,
      /^row_id$/i,
      /^index$/i,
      /^uid$/i,
    ],
  },
  {
    key: "decisionThreshold",
    label: "Decision Threshold",
    description: "Classification threshold used for y_pred",
    required: false,
    patterns: [
      /^decision_threshold$/i,
      /^threshold$/i,
      /^cutoff$/i,
      /^cut_off$/i,
    ],
  },
  {
    key: "datasetPeriod",
    label: "Dataset Period",
    description: "Reference vs Current split for drift detection",
    required: false,
    patterns: [
      /^dataset_period$/i,
      /^period$/i,
      /^split$/i,
      /^data_split$/i,
      /^reference_current$/i,
      /^deployment_phase$/i,
    ],
  },
  {
    key: "serviceMonth",
    label: "Service Month / Time",
    description: "Time column for trend analysis",
    required: false,
    patterns: [
      /^service_month$/i,
      /^month$/i,
      /^date$/i,
      /^timestamp$/i,
      /^time$/i,
      /^index_datetime$/i,
      /^prediction_datetime$/i,
      /^created_at$/i,
    ],
  },
]

const SUBGROUP_PATTERNS: RegExp[] = [
  /^sex/i,
  /^gender/i,
  /^age.?band/i,
  /^age.?group/i,
  /^race/i,
  /^ethnicity/i,
  /^race_ethnicity/i,
  /^health.?zone/i,
  /^rural.?urban/i,
  /^region/i,
  /^socioeconomic/i,
  /^indigenous/i,
  /^language/i,
  /^newcomer/i,
  /^disability/i,
  /^care.?setting/i,
  /^insurance/i,
  /^income/i,
  /^intersectional/i,
]

const FEATURE_PATTERNS: RegExp[] = [
  /^a1c/i,
  /^hba1c/i,
  /^glucose/i,
  /^bmi$/i,
  /^bp_/i,
  /^heart_rate/i,
  /^creatinine/i,
  /^egfr/i,
  /^ldl/i,
  /^triglycerides/i,
  /^time_in_range/i,
  /^mean_glucose/i,
  /^glucose_variability/i,
  /^insulin/i,
  /^cgm/i,
  /^missed_appointments/i,
  /^prior_/i,
  /^medication/i,
  /^wait_time/i,
  /^distance/i,
]

const EXCLUDED_FROM_SUBGROUPS = new Set([
  "intersectional_group_id", "final_gatekeeper_decision",
])

const EXCLUDED_FROM_FEATURES = new Set([
  "record_id", "patient_id", "encounter_id", "facility_id",
  "postal_fsa", "run_id", "run_timestamp", "schema_version",
  "governance_policy_version", "fairness_threshold_set_id",
  "drift_threshold_set_id", "label_definition_version",
  "model_id", "model_version", "data_snapshot_date",
  "intended_use", "clinical_risk_level", "outcome_name",
  "label_window_days", "outcome_datetime", "index_datetime",
  "prediction_datetime", "data_source_system",
  "intersectional_group_id", "final_gatekeeper_decision",
  "shift_scenario", "shift_intensity",
])

export function autoDetectMapping(columns: string[]): ColumnMapping {
  const mapping: ColumnMapping = {
    yTrue: "",
    yScore: "",
    yPred: "",
    subgroupColumns: [],
    featureColumns: [],
  }

  const usedColumns = new Set<string>()

  for (const field of FIELD_CANDIDATES) {
    if (field.multi) continue
    for (const col of columns) {
      if (usedColumns.has(col)) continue
      for (const pattern of field.patterns) {
        if (pattern.test(col)) {
          ;(mapping as Record<string, unknown>)[field.key] = col
          usedColumns.add(col)
          break
        }
      }
      if ((mapping as Record<string, unknown>)[field.key]) break
    }
  }

  for (const col of columns) {
    if (usedColumns.has(col)) continue
    if (EXCLUDED_FROM_SUBGROUPS.has(col)) continue
    for (const pattern of SUBGROUP_PATTERNS) {
      if (pattern.test(col)) {
        mapping.subgroupColumns.push(col)
        usedColumns.add(col)
        break
      }
    }
  }

  for (const col of columns) {
    if (usedColumns.has(col)) continue
    if (EXCLUDED_FROM_FEATURES.has(col)) continue
    for (const pattern of FEATURE_PATTERNS) {
      if (pattern.test(col)) {
        mapping.featureColumns.push(col)
        usedColumns.add(col)
        break
      }
    }
  }

  return mapping
}

export function getFieldDefinitions(): FieldCandidate[] {
  return FIELD_CANDIDATES
}

export function validateMapping(mapping: ColumnMapping): { valid: boolean; errors: string[] } {
  const errors: string[] = []
  if (!mapping.yTrue) errors.push("Ground truth label (y_true) is required.")
  if (!mapping.yScore) errors.push("Prediction score (y_score) is required.")
  if (!mapping.yPred) errors.push("Predicted label (y_pred) is required.")
  if (mapping.subgroupColumns.length === 0) {
    errors.push("At least one subgroup column is recommended for fairness analysis.")
  }
  return { valid: errors.length === 0, errors }
}

export function getSuggestedSubgroupColumns(columns: string[]): string[] {
  return columns.filter((col) =>
    SUBGROUP_PATTERNS.some((pattern) => pattern.test(col))
  )
}

export function getSuggestedFeatureColumns(columns: string[]): string[] {
  return columns.filter(
    (col) =>
      !EXCLUDED_FROM_FEATURES.has(col) &&
      FEATURE_PATTERNS.some((pattern) => pattern.test(col))
  )
}
