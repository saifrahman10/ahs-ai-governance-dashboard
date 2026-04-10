"use client"

import { useState, useEffect } from "react"
import { Settings2, RotateCcw, Check, AlertTriangle } from "lucide-react"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { useDataset } from "@/lib/dataset-context"
import type { GovernanceThresholds } from "@/lib/types"
import { DEFAULT_THRESHOLDS } from "@/lib/types"
import { MetricHelpPopover } from "@/components/dashboard/metric-help-popover"

interface ThresholdSettingsDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface ThresholdField {
  key: keyof GovernanceThresholds
  label: string
  description: string
  unit: "percent" | "decimal" | "count"
  category: "fairness" | "calibration" | "drift" | "sample"
}

const THRESHOLD_FIELDS: ThresholdField[] = [
  { key: "fnrDisparity", label: "FNR Disparity", description: "Max false negative rate gap across subgroups within a protected attribute", unit: "percent", category: "fairness" },
  { key: "ppvDisparity", label: "PPV Disparity", description: "Max positive predictive value gap across subgroups", unit: "percent", category: "fairness" },
  { key: "minRecall", label: "Minimum Recall", description: "Lowest acceptable recall for any subgroup", unit: "percent", category: "fairness" },
  { key: "ece", label: "Calibration ECE", description: "Expected calibration error upper bound", unit: "decimal", category: "calibration" },
  { key: "psiWarning", label: "PSI Warning", description: "Population stability index threshold for investigation", unit: "decimal", category: "drift" },
  { key: "psiSevere", label: "PSI Severe", description: "Population stability index threshold for failure", unit: "decimal", category: "drift" },
  { key: "predictionKS", label: "Prediction Drift (KS)", description: "Kolmogorov-Smirnov statistic threshold for score drift", unit: "decimal", category: "drift" },
  { key: "targetDriftWarning", label: "Target Drift Warning", description: "Prevalence shift threshold for investigation", unit: "percent", category: "drift" },
  { key: "targetDriftSevere", label: "Target Drift Severe", description: "Prevalence shift threshold for failure", unit: "percent", category: "drift" },
  { key: "minSubgroupN", label: "Min Subgroup Size", description: "Minimum sample count per subgroup", unit: "count", category: "sample" },
]

const CATEGORIES = [
  { key: "fairness" as const, label: "Fairness", color: "text-primary" },
  { key: "calibration" as const, label: "Calibration", color: "text-primary" },
  { key: "drift" as const, label: "Drift Detection", color: "text-primary" },
  { key: "sample" as const, label: "Sample Size", color: "text-primary" },
]

function toDisplayValue(value: number, unit: ThresholdField["unit"]): string {
  if (unit === "percent") return (value * 100).toFixed(0)
  if (unit === "count") return value.toString()
  return value.toFixed(2)
}

function fromDisplayValue(display: string, unit: ThresholdField["unit"]): number {
  const num = parseFloat(display)
  if (isNaN(num)) return 0
  if (unit === "percent") return num / 100
  return num
}

export function ThresholdSettingsDrawer({ open, onOpenChange }: ThresholdSettingsDrawerProps) {
  const { thresholds, applyThresholds, resetThresholds, status } = useDataset()
  const [draft, setDraft] = useState<GovernanceThresholds>({ ...thresholds })
  const [hasChanges, setHasChanges] = useState(false)

  useEffect(() => {
    if (open) {
      setDraft({ ...thresholds })
      setHasChanges(false)
    }
  }, [open, thresholds])

  useEffect(() => {
    const changed = (Object.keys(draft) as (keyof GovernanceThresholds)[]).some(
      (k) => draft[k] !== thresholds[k]
    )
    setHasChanges(changed)
  }, [draft, thresholds])

  const isDefault = (Object.keys(draft) as (keyof GovernanceThresholds)[]).every(
    (k) => draft[k] === DEFAULT_THRESHOLDS[k]
  )

  function handleFieldChange(key: keyof GovernanceThresholds, displayValue: string, unit: ThresholdField["unit"]) {
    setDraft((prev) => ({ ...prev, [key]: fromDisplayValue(displayValue, unit) }))
  }

  function handleApply() {
    applyThresholds(draft)
    onOpenChange(false)
  }

  function handleReset() {
    setDraft({ ...DEFAULT_THRESHOLDS })
  }

  function handleResetAndApply() {
    resetThresholds()
    onOpenChange(false)
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader className="pb-2">
          <SheetTitle className="flex items-center gap-2 text-base flex-wrap">
            <Settings2 className="size-4 shrink-0" />
            <span className="flex items-center gap-1.5">
              Governance Thresholds
              <MetricHelpPopover title="Governance thresholds">
                <>
                  <p>Adjust numeric cutoffs used by the decision engine. Apply recomputes metrics without re-uploading data.</p>
                  <p>Non-default values should align with council-approved policy.</p>
                </>
              </MetricHelpPopover>
            </span>
          </SheetTitle>
          <SheetDescription className="text-xs">
            Adjust the fairness and monitoring thresholds used to evaluate governance decisions.
            Changes take effect after clicking Apply.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-5 px-4 pb-4">
          {CATEGORIES.map((cat) => {
            const fields = THRESHOLD_FIELDS.filter((f) => f.category === cat.key)
            return (
              <div key={cat.key}>
                <div className="flex items-center gap-2 mb-3">
                  <span className={`text-xs font-semibold uppercase tracking-wider ${cat.color}`}>
                    {cat.label}
                  </span>
                  <Separator className="flex-1" />
                </div>
                <div className="space-y-3">
                  {fields.map((field) => {
                    const displayVal = toDisplayValue(draft[field.key], field.unit)
                    const defaultDisplay = toDisplayValue(DEFAULT_THRESHOLDS[field.key], field.unit)
                    const isModified = draft[field.key] !== DEFAULT_THRESHOLDS[field.key]

                    return (
                      <div key={field.key} className="space-y-1">
                        <div className="flex items-center justify-between">
                          <Label htmlFor={field.key} className="text-xs font-medium">
                            {field.label}
                            {isModified && (
                              <Badge variant="outline" className="ml-2 text-[9px] px-1 py-0 text-warning border-warning/30">
                                Modified
                              </Badge>
                            )}
                          </Label>
                          <span className="text-[10px] text-muted-foreground">
                            Default: {defaultDisplay}{field.unit === "percent" ? "%" : field.unit === "count" ? "" : ""}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Input
                            id={field.key}
                            type="number"
                            step={field.unit === "count" ? "1" : field.unit === "percent" ? "1" : "0.01"}
                            min="0"
                            value={displayVal}
                            onChange={(e) => handleFieldChange(field.key, e.target.value, field.unit)}
                            className="h-8 text-xs font-mono"
                          />
                          {field.unit === "percent" && (
                            <span className="text-xs text-muted-foreground w-4">%</span>
                          )}
                        </div>
                        <p className="text-[10px] text-muted-foreground leading-tight">{field.description}</p>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>

        {!isDefault && (
          <div className="px-4 pb-2">
            <div className="flex items-center gap-2 p-2 rounded-md bg-warning/10 border border-warning/20">
              <AlertTriangle className="size-3.5 text-warning flex-shrink-0" />
              <span className="text-[10px] text-warning">
                Thresholds differ from AHS defaults. Non-standard thresholds require governance council approval.
              </span>
            </div>
          </div>
        )}

        <SheetFooter className="flex-row gap-2 border-t border-border">
          <Button
            variant="outline"
            size="sm"
            onClick={handleReset}
            disabled={isDefault}
            className="text-xs gap-1.5"
          >
            <RotateCcw className="size-3" />
            Reset to Defaults
          </Button>
          <div className="flex-1" />
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="text-xs"
          >
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleApply}
            disabled={!hasChanges || status === "computing"}
            className="text-xs gap-1.5"
          >
            <Check className="size-3" />
            Apply
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
