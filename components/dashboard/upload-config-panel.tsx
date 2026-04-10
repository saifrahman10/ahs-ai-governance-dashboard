"use client"

import { useRef } from "react"
import {
  Upload,
  FileText,
  CheckCircle2,
  Clock,
  ChevronRight,
  Database,
  Loader2,
  AlertCircle,
  Trash2,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { useDataset } from "@/lib/dataset-context"
import { MetricHelpPopover } from "@/components/dashboard/metric-help-popover"

export function UploadConfigPanel() {
  const {
    status,
    error,
    parsedDataset,
    columnMapping,
    computedMetrics,
    viewMetrics,
    filters,
    recentUploads,
    uploadFile,
    loadSampleData,
    setFilters,
    resetDataset,
  } = useDataset()

  const fileInputRef = useRef<HTMLInputElement>(null)

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) uploadFile(file)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (file) uploadFile(file)
  }

  const subgroupOptions = columnMapping?.subgroupColumns ?? []
  const subgroupValues = computedMetrics
    ? Object.entries(computedMetrics.subgroups)
        .flatMap(([, subs]) => subs.map((s) => s.groupValue))
        .filter((v, i, arr) => arr.indexOf(v) === i)
    : []

  const isLoading = status === "uploading" || status === "computing"
  const hasData = status === "ready" && computedMetrics !== null

  const filterActive =
    filters.datasetPeriod !== "all" || Boolean(filters.subgroupColumn && filters.subgroupValue)

  return (
    <Card className="border-border bg-card">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-sm font-medium text-foreground flex items-center gap-2 flex-wrap min-w-0">
            <Upload className="size-4 text-primary shrink-0" />
            <span className="flex items-center gap-1.5">
              Upload & Configure
              <MetricHelpPopover title="Upload & configure">
                <>
                  <p>Load a CSV with outcomes and predictions. After upload, confirm column mapping—then metrics and charts populate.</p>
                  <p>
                    Optional filters slice the dataset. Period filter needs a mapped dataset period column. Subgroup filter
                    needs both a column and a value—choosing only a column does not narrow rows until you pick a value.
                  </p>
                </>
              </MetricHelpPopover>
            </span>
          </CardTitle>
          {hasData && (
            <Button
              variant="ghost"
              size="icon"
              className="size-6 text-muted-foreground hover:text-destructive"
              onClick={resetDataset}
            >
              <Trash2 className="size-3.5" />
            </Button>
          )}
        </div>
        <CardDescription className="text-xs">
          Upload model outputs and reference datasets for evaluation
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {/* Upload zone */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.json"
          className="hidden"
          onChange={handleFileChange}
        />
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => !isLoading && fileInputRef.current?.click()}
          className={`flex flex-col items-center justify-center rounded-lg border-2 border-dashed py-5 transition-colors ${
            isLoading
              ? "border-primary/30 bg-primary/5 cursor-wait"
              : "border-border hover:border-primary/40 hover:bg-secondary/50 cursor-pointer"
          }`}
        >
          {isLoading ? (
            <>
              <Loader2 className="size-5 text-primary animate-spin mb-2" />
              <p className="text-xs font-medium text-foreground">
                {status === "uploading" ? "Parsing..." : "Computing metrics..."}
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                This may take a moment for large datasets
              </p>
            </>
          ) : (
            <>
              <div className="size-9 rounded-lg bg-secondary flex items-center justify-center mb-2">
                <FileText className="size-4 text-muted-foreground" />
              </div>
              <p className="text-xs font-medium text-foreground">
                Upload model outputs
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                Drag & drop or click — CSV or JSON
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-2 text-xs h-7"
                onClick={(e) => {
                  e.stopPropagation()
                  fileInputRef.current?.click()
                }}
              >
                Browse Files
              </Button>
            </>
          )}
        </div>

        {/* Sample Data Button */}
        {!hasData && !isLoading && (
          <Button
            variant="outline"
            size="sm"
            className="text-xs gap-1.5 w-full"
            onClick={loadSampleData}
          >
            <Database className="size-3.5" />
            Load Sample Dataset
          </Button>
        )}

        {/* Error */}
        {error && (
          <div className="flex items-start gap-2 rounded-md bg-destructive/5 border border-destructive/20 px-3 py-2">
            <AlertCircle className="size-3.5 text-destructive shrink-0 mt-0.5" />
            <p className="text-xs text-destructive">{error}</p>
          </div>
        )}

        {/* Dataset info */}
        {hasData && parsedDataset && (
          <div className="rounded-md bg-success/5 border border-success/20 px-3 py-2.5">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle2 className="size-3.5 text-success" />
              <span className="text-xs font-medium text-foreground">{parsedDataset.fileName}</span>
            </div>
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              {parsedDataset.rowCount.toLocaleString()} rows · {parsedDataset.columns.length} columns · Decision:{" "}
              {viewMetrics?.governance.decision ?? "—"}
              {filterActive && viewMetrics && viewMetrics.overall.n !== parsedDataset.rowCount && (
                <> · Metrics use {viewMetrics.overall.n.toLocaleString()} rows</>
              )}
            </p>
          </div>
        )}

        {/* Filters — only when data is loaded */}
        {hasData && (
          <>
            <div className="flex flex-col gap-2">
              <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                Subgroup Filter
                <MetricHelpPopover title="Subgroup filter">
                  <p>Optionally restrict charts and recomputed metrics to one demographic column and value. “All” uses the full dataset.</p>
                </MetricHelpPopover>
              </label>
              <Select
                value={filters.subgroupColumn ?? "all"}
                onValueChange={(v) =>
                  setFilters({
                    subgroupColumn: v === "all" ? null : v,
                    subgroupValue: null,
                  })
                }
              >
                <SelectTrigger className="h-8 text-xs w-full bg-secondary border-border text-foreground">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Subgroups</SelectItem>
                  {subgroupOptions.map((col) => (
                    <SelectItem key={col} value={col}>{col}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {filters.subgroupColumn && computedMetrics?.subgroups[filters.subgroupColumn] && (
              <div className="flex flex-col gap-2">
                <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                  Subgroup Value
                  <MetricHelpPopover title="Subgroup value">
                    <p>Pick a single category within the selected column (e.g. one region or age band) to analyze in isolation.</p>
                  </MetricHelpPopover>
                </label>
                <Select
                  value={filters.subgroupValue ?? "all"}
                  onValueChange={(v) =>
                    setFilters({ subgroupValue: v === "all" ? null : v })
                  }
                >
                  <SelectTrigger className="h-8 text-xs w-full bg-secondary border-border text-foreground">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Values</SelectItem>
                    {computedMetrics.subgroups[filters.subgroupColumn].map((s) => (
                      <SelectItem key={s.groupValue} value={s.groupValue}>
                        {s.groupValue} (n={s.metrics.n})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {columnMapping?.datasetPeriod && (
              <div className="flex flex-col gap-2">
                <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                  Dataset Period
                  <MetricHelpPopover title="Dataset period">
                    <p>Filter rows to Reference or Current when your CSV includes a dataset period column—useful for comparing distributions and drift inputs.</p>
                  </MetricHelpPopover>
                </label>
                <Select
                  value={filters.datasetPeriod}
                  onValueChange={(v) =>
                    setFilters({ datasetPeriod: v as "all" | "Reference" | "Current" })
                  }
                >
                  <SelectTrigger className="h-8 text-xs w-full bg-secondary border-border text-foreground">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Periods</SelectItem>
                    <SelectItem value="Reference">Reference</SelectItem>
                    <SelectItem value="Current">Current</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </>
        )}

        {/* Recent Uploads */}
        {recentUploads.length > 0 && (
          <div className="border-t border-border pt-3">
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-2">
              Recent Uploads
            </p>
            <div className="flex flex-col gap-1.5">
              {recentUploads.map((upload, i) => (
                <div
                  key={`${upload.fileName}-${i}`}
                  className="flex items-center justify-between rounded-md bg-secondary/50 px-2.5 py-1.5 group hover:bg-secondary transition-colors"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {upload.status === "ready" ? (
                      <CheckCircle2 className="size-3.5 text-success shrink-0" />
                    ) : upload.status === "error" ? (
                      <AlertCircle className="size-3.5 text-destructive shrink-0" />
                    ) : (
                      <Clock className="size-3.5 text-muted-foreground shrink-0" />
                    )}
                    <span className="text-xs text-foreground truncate">
                      {upload.fileName}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] text-muted-foreground">
                      {upload.rowCount > 0 ? `${upload.rowCount.toLocaleString()} rows` : ""}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {upload.timestamp}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
