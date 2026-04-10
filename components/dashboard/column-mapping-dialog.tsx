"use client"

import { useState, useEffect } from "react"
import {
  ArrowRight,
  AlertTriangle,
  Sparkles,
  Database,
  Target,
  BarChart3,
  Users,
  Clock,
  X,
} from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { useDataset } from "@/lib/dataset-context"
import { MetricHelpPopover } from "@/components/dashboard/metric-help-popover"
import { validateMapping, getSuggestedSubgroupColumns, getSuggestedFeatureColumns } from "@/lib/column-mapper"
import type { ColumnMapping } from "@/lib/types"

const NONE_VALUE = "__none__"

interface FieldConfig {
  key: keyof ColumnMapping
  label: string
  description: string
  icon: typeof Database
  required: boolean
  group: string
}

const FIELDS: FieldConfig[] = [
  { key: "yTrue", label: "Ground Truth (y_true)", description: "Binary label — the actual outcome (0/1)", icon: Target, required: true, group: "Required" },
  { key: "yScore", label: "Prediction Score (y_score)", description: "Model probability output (0–1)", icon: BarChart3, required: true, group: "Required" },
  { key: "yPred", label: "Predicted Label (y_pred)", description: "Thresholded prediction (0/1)", icon: Target, required: true, group: "Required" },
  { key: "datasetPeriod", label: "Dataset Period", description: "Reference vs Current for drift", icon: Database, required: false, group: "Drift" },
  { key: "serviceMonth", label: "Service Month / Time", description: "Time column for trend analysis", icon: Clock, required: false, group: "Drift" },
  { key: "decisionThreshold", label: "Decision Threshold", description: "Cutoff used for y_pred", icon: BarChart3, required: false, group: "Optional" },
  { key: "recordId", label: "Record ID", description: "Unique identifier column", icon: Database, required: false, group: "Optional" },
]

export function ColumnMappingDialog() {
  const {
    status,
    parsedDataset,
    columnMapping,
    setColumnMapping,
    confirmMapping,
    resetDataset,
  } = useDataset()

  const open = status === "mapping" && parsedDataset !== null && columnMapping !== null

  const [localMapping, setLocalMapping] = useState<ColumnMapping | null>(null)

  const mapping = localMapping ?? columnMapping

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden"
      return () => { document.body.style.overflow = "" }
    }
  }, [open])

  if (!open || !mapping || !parsedDataset) return null

  const columns = parsedDataset.columns
  const suggestedSubgroups = getSuggestedSubgroupColumns(columns)
  const suggestedFeatures = getSuggestedFeatureColumns(columns)

  const validation = validateMapping(mapping)
  const autoDetectedCount = FIELDS.filter(
    (f) => mapping[f.key as keyof ColumnMapping] && mapping[f.key as keyof ColumnMapping] !== ""
  ).length

  function updateField(key: keyof ColumnMapping, value: string) {
    const next = { ...mapping, [key]: value === NONE_VALUE ? "" : value }
    setLocalMapping(next)
    setColumnMapping(next)
  }

  function toggleSubgroup(col: string) {
    const subs = [...mapping.subgroupColumns]
    const idx = subs.indexOf(col)
    if (idx >= 0) subs.splice(idx, 1)
    else subs.push(col)
    const next = { ...mapping, subgroupColumns: subs }
    setLocalMapping(next)
    setColumnMapping(next)
  }

  function toggleFeature(col: string) {
    const feats = [...mapping.featureColumns]
    const idx = feats.indexOf(col)
    if (idx >= 0) feats.splice(idx, 1)
    else feats.push(col)
    const next = { ...mapping, featureColumns: feats }
    setLocalMapping(next)
    setColumnMapping(next)
  }

  function handleConfirm() {
    confirmMapping()
    setLocalMapping(null)
  }

  function handleClose() {
    setLocalMapping(null)
    resetDataset()
  }

  const usedSingles = new Set(
    FIELDS.map((f) => mapping[f.key as keyof ColumnMapping] as string).filter(Boolean)
  )

  return (
    <>
      {/* Backdrop */}
      <div
        style={{ position: "fixed", inset: 0, zIndex: 50, backgroundColor: "rgba(0,0,0,0.5)" }}
        onClick={handleClose}
      />

      {/* Dialog — pinned with fixed top/bottom so it has a DEFINITE height */}
      <div
        style={{
          position: "fixed",
          top: "5vh",
          bottom: "5vh",
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 51,
          width: "calc(100% - 2rem)",
          maxWidth: "48rem",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            height: "100%",
            overflow: "hidden",
            borderRadius: "0.5rem",
            border: "1px solid var(--border)",
            backgroundColor: "var(--background)",
            boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)",
          }}
        >
          {/* Close button */}
          <button
            onClick={handleClose}
            style={{ position: "absolute", top: "1rem", right: "1rem", zIndex: 10, opacity: 0.7, cursor: "pointer", background: "none", border: "none" }}
            onMouseEnter={(e) => { e.currentTarget.style.opacity = "1" }}
            onMouseLeave={(e) => { e.currentTarget.style.opacity = "0.7" }}
          >
            <X className="size-4" />
            <span className="sr-only">Close</span>
          </button>

          {/* Header — fixed height, never scrolls */}
          <div style={{ flexShrink: 0, padding: "1.5rem 1.5rem 1rem", borderBottom: "1px solid var(--border)" }}>
            <h2 className="text-base font-semibold flex items-center gap-2 flex-wrap" style={{ paddingRight: "2rem" }}>
              <Database className="size-5 text-primary" />
              <span className="flex items-center gap-1.5">
                Map Your Dataset Columns
                <MetricHelpPopover title="Column mapping">
                  <>
                    <p>Match each role to a CSV column. Required fields drive metrics; drift and time columns unlock reference/current splits and trends.</p>
                    <p>Subgroup and feature lists use pattern-based suggestions—toggle checkboxes to include or exclude columns.</p>
                  </>
                </MetricHelpPopover>
              </span>
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              We auto-detected {autoDetectedCount} of {FIELDS.length} fields from{" "}
              <span className="font-medium text-foreground">{parsedDataset.fileName}</span>
              {" "}({parsedDataset.rowCount.toLocaleString()} rows, {columns.length} columns).
              Review and adjust the mappings below.
            </p>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="outline" className="text-[10px] gap-1 bg-primary/5 text-primary border-primary/20">
                <Sparkles className="size-3" />
                Auto-detected
              </Badge>
              {!validation.valid && (
                <Badge variant="outline" className="text-[10px] gap-1 bg-destructive/5 text-destructive border-destructive/20">
                  <AlertTriangle className="size-3" />
                  {validation.errors.length} issue(s)
                </Badge>
              )}
            </div>
          </div>

          {/* Scrollable body — THIS is the part that scrolls */}
          <div
            style={{
              flex: "1 1 0%",
              minHeight: 0,
              overflowY: "auto",
              overscrollBehavior: "contain",
              padding: "1rem 1.5rem",
            }}
          >
            <div className="flex flex-col gap-6">
              <FieldGroup
                title="Required Fields"
                description="These are needed for core metric computation"
                fields={FIELDS.filter((f) => f.group === "Required")}
                mapping={mapping}
                columns={columns}
                usedColumns={usedSingles}
                onUpdate={updateField}
              />

              <FieldGroup
                title="Drift Detection"
                description="Enable reference vs. current comparison and trend analysis"
                fields={FIELDS.filter((f) => f.group === "Drift")}
                mapping={mapping}
                columns={columns}
                usedColumns={usedSingles}
                onUpdate={updateField}
              />

              <FieldGroup
                title="Optional"
                description="Additional context columns"
                fields={FIELDS.filter((f) => f.group === "Optional")}
                mapping={mapping}
                columns={columns}
                usedColumns={usedSingles}
                onUpdate={updateField}
              />

              {/* Subgroup Selection */}
              <div>
                <div className="mb-3">
                  <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
                    <Users className="size-4 text-primary" />
                    Protected / Subgroup Attributes
                  </h4>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Select columns for fairness analysis. Auto-detected suggestions are pre-selected.
                  </p>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {columns
                    .filter((c) => !usedSingles.has(c))
                    .filter((c) => suggestedSubgroups.includes(c) || mapping.subgroupColumns.includes(c))
                    .map((col) => (
                      <label
                        key={col}
                        className="flex items-center gap-2 rounded-md border border-border px-3 py-2 cursor-pointer hover:bg-secondary/50 transition-colors"
                      >
                        <Checkbox
                          checked={mapping.subgroupColumns.includes(col)}
                          onCheckedChange={() => toggleSubgroup(col)}
                        />
                        <span className="text-xs text-foreground truncate">{col}</span>
                        {suggestedSubgroups.includes(col) && (
                          <Sparkles className="size-3 text-primary shrink-0" />
                        )}
                      </label>
                    ))}
                </div>
                <details className="mt-2">
                  <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                    Show all columns ({columns.filter((c) => !usedSingles.has(c) && !suggestedSubgroups.includes(c)).length} more)
                  </summary>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
                    {columns
                      .filter((c) => !usedSingles.has(c) && !suggestedSubgroups.includes(c))
                      .map((col) => (
                        <label
                          key={col}
                          className="flex items-center gap-2 rounded-md border border-border px-3 py-2 cursor-pointer hover:bg-secondary/50 transition-colors"
                        >
                          <Checkbox
                            checked={mapping.subgroupColumns.includes(col)}
                            onCheckedChange={() => toggleSubgroup(col)}
                          />
                          <span className="text-xs text-foreground truncate">{col}</span>
                        </label>
                      ))}
                  </div>
                </details>
              </div>

              {/* Feature Selection for Drift */}
              <div>
                <div className="mb-3">
                  <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
                    <BarChart3 className="size-4 text-primary" />
                    Features for Drift Monitoring
                  </h4>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Select numerical features to monitor for distribution drift (PSI / KS).
                  </p>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {columns
                    .filter((c) => !usedSingles.has(c) && !mapping.subgroupColumns.includes(c))
                    .filter((c) => suggestedFeatures.includes(c) || mapping.featureColumns.includes(c))
                    .map((col) => (
                      <label
                        key={col}
                        className="flex items-center gap-2 rounded-md border border-border px-3 py-2 cursor-pointer hover:bg-secondary/50 transition-colors"
                      >
                        <Checkbox
                          checked={mapping.featureColumns.includes(col)}
                          onCheckedChange={() => toggleFeature(col)}
                        />
                        <span className="text-xs text-foreground truncate">{col}</span>
                        {suggestedFeatures.includes(col) && (
                          <Sparkles className="size-3 text-primary shrink-0" />
                        )}
                      </label>
                    ))}
                </div>
                <details className="mt-2">
                  <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                    Show all remaining columns
                  </summary>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
                    {columns
                      .filter(
                        (c) =>
                          !usedSingles.has(c) &&
                          !mapping.subgroupColumns.includes(c) &&
                          !suggestedFeatures.includes(c) &&
                          !mapping.featureColumns.includes(c)
                      )
                      .map((col) => (
                        <label
                          key={col}
                          className="flex items-center gap-2 rounded-md border border-border px-3 py-2 cursor-pointer hover:bg-secondary/50 transition-colors"
                        >
                          <Checkbox
                            checked={mapping.featureColumns.includes(col)}
                            onCheckedChange={() => toggleFeature(col)}
                          />
                          <span className="text-xs text-foreground truncate">{col}</span>
                        </label>
                      ))}
                  </div>
                </details>
              </div>
            </div>
          </div>

          {/* Footer — fixed height, never scrolls, always visible */}
          <div style={{ flexShrink: 0, padding: "1rem 1.5rem", borderTop: "1px solid var(--border)", backgroundColor: "var(--background)" }}>
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                {mapping.subgroupColumns.length > 0 && (
                  <span>{mapping.subgroupColumns.length} subgroup(s)</span>
                )}
                {mapping.featureColumns.length > 0 && (
                  <span className="border-l border-border pl-2">{mapping.featureColumns.length} feature(s)</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={handleClose}>
                  Cancel
                </Button>
                <Button
                  onClick={handleConfirm}
                  disabled={!mapping.yTrue || !mapping.yScore || !mapping.yPred}
                  className="gap-2"
                >
                  Compute Metrics
                  <ArrowRight className="size-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

function FieldGroup({
  title,
  description,
  fields,
  mapping,
  columns,
  usedColumns,
  onUpdate,
}: {
  title: string
  description: string
  fields: FieldConfig[]
  mapping: ColumnMapping
  columns: string[]
  usedColumns: Set<string>
  onUpdate: (key: keyof ColumnMapping, value: string) => void
}) {
  return (
    <div>
      <div className="mb-3">
        <h4 className="text-sm font-medium text-foreground">{title}</h4>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <div className="flex flex-col gap-2">
        {fields.map((field) => {
          const currentValue = mapping[field.key as keyof ColumnMapping] as string | undefined
          const isAutoDetected = !!currentValue
          const Icon = field.icon

          return (
            <div
              key={field.key}
              className="flex items-center gap-3 rounded-md border border-border bg-secondary/30 px-3 py-2.5"
            >
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <Icon className="size-4 text-muted-foreground shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-medium text-foreground">
                      {field.label}
                    </span>
                    {field.required && (
                      <span className="text-destructive text-[10px]">*</span>
                    )}
                    {isAutoDetected && (
                      <Sparkles className="size-3 text-primary" />
                    )}
                  </div>
                  <p className="text-[10px] text-muted-foreground">{field.description}</p>
                </div>
              </div>
              <ArrowRight className="size-3.5 text-muted-foreground shrink-0" />
              <Select
                value={currentValue || NONE_VALUE}
                onValueChange={(v) => onUpdate(field.key as keyof ColumnMapping, v)}
              >
                <SelectTrigger className="w-52 h-8 text-xs bg-card border-border">
                  <SelectValue placeholder="Select column..." />
                </SelectTrigger>
                <SelectContent className="z-[200]">
                  <SelectItem value={NONE_VALUE}>
                    <span className="text-muted-foreground">— None —</span>
                  </SelectItem>
                  {columns.map((col) => (
                    <SelectItem key={col} value={col} disabled={usedColumns.has(col) && col !== currentValue}>
                      {col}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )
        })}
      </div>
    </div>
  )
}
