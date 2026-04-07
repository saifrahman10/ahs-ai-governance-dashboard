"use client"

import { createContext, useContext, useState, useCallback, type ReactNode } from "react"
import type {
  ParsedDataset,
  ColumnMapping,
  ComputedMetrics,
  FilterState,
  DatasetStatus,
  DatasetRow,
} from "./types"
import { parseCSV, parseCSVString } from "./csv-parser"
import { autoDetectMapping } from "./column-mapper"
import { computeAllMetrics } from "./metrics"

interface UploadRecord {
  fileName: string
  rowCount: number
  timestamp: string
  status: "parsed" | "computing" | "ready" | "error"
}

interface DatasetContextValue {
  status: DatasetStatus
  error: string | null
  parsedDataset: ParsedDataset | null
  columnMapping: ColumnMapping | null
  computedMetrics: ComputedMetrics | null
  filters: FilterState
  recentUploads: UploadRecord[]

  uploadFile: (file: File) => Promise<void>
  loadSampleData: () => Promise<void>
  setColumnMapping: (mapping: ColumnMapping) => void
  confirmMapping: () => void
  setFilters: (filters: Partial<FilterState>) => void
  resetDataset: () => void
  getFilteredRows: () => DatasetRow[]
  getFilteredMetrics: () => ComputedMetrics | null
}

const DatasetContext = createContext<DatasetContextValue | null>(null)

export function DatasetProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<DatasetStatus>("empty")
  const [error, setError] = useState<string | null>(null)
  const [parsedDataset, setParsedDataset] = useState<ParsedDataset | null>(null)
  const [columnMapping, setColumnMappingState] = useState<ColumnMapping | null>(null)
  const [computedMetrics, setComputedMetrics] = useState<ComputedMetrics | null>(null)
  const [recentUploads, setRecentUploads] = useState<UploadRecord[]>([])
  const [filters, setFiltersState] = useState<FilterState>({
    subgroupColumn: null,
    subgroupValue: null,
    datasetPeriod: "all",
    timeRange: null,
  })

  const addUploadRecord = useCallback((record: UploadRecord) => {
    setRecentUploads((prev) => [record, ...prev].slice(0, 10))
  }, [])

  const uploadFile = useCallback(async (file: File) => {
    setStatus("uploading")
    setError(null)
    try {
      const parsed = await parseCSV(file)
      setParsedDataset(parsed)
      const autoMapping = autoDetectMapping(parsed.columns)
      setColumnMappingState(autoMapping)
      addUploadRecord({
        fileName: file.name,
        rowCount: parsed.rowCount,
        timestamp: new Date().toLocaleTimeString(),
        status: "parsed",
      })
      setStatus("mapping")
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to parse file"
      setError(msg)
      setStatus("error")
      addUploadRecord({
        fileName: file.name,
        rowCount: 0,
        timestamp: new Date().toLocaleTimeString(),
        status: "error",
      })
    }
  }, [addUploadRecord])

  const loadSampleData = useCallback(async () => {
    setStatus("uploading")
    setError(null)
    try {
      const response = await fetch("/data/eval_records_synthetic.csv")
      if (!response.ok) throw new Error("Failed to fetch sample dataset")
      const text = await response.text()
      const parsed = await parseCSVString(text, "eval_records_synthetic.csv")
      setParsedDataset(parsed)
      const autoMapping = autoDetectMapping(parsed.columns)
      setColumnMappingState(autoMapping)
      addUploadRecord({
        fileName: "eval_records_synthetic.csv",
        rowCount: parsed.rowCount,
        timestamp: new Date().toLocaleTimeString(),
        status: "parsed",
      })
      setStatus("mapping")
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to load sample data"
      setError(msg)
      setStatus("error")
    }
  }, [addUploadRecord])

  const setColumnMapping = useCallback((mapping: ColumnMapping) => {
    setColumnMappingState(mapping)
  }, [])

  const confirmMapping = useCallback(() => {
    if (!parsedDataset || !columnMapping) return
    setStatus("computing")
    setError(null)

    // Use setTimeout to allow UI to update before heavy computation
    setTimeout(() => {
      try {
        const metrics = computeAllMetrics(parsedDataset.rows, columnMapping)
        setComputedMetrics(metrics)
        setRecentUploads((prev) =>
          prev.map((u, i) => (i === 0 ? { ...u, status: "ready" as const } : u))
        )
        setStatus("ready")
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Failed to compute metrics"
        setError(msg)
        setStatus("error")
      }
    }, 50)
  }, [parsedDataset, columnMapping])

  const setFilters = useCallback((partial: Partial<FilterState>) => {
    setFiltersState((prev) => ({ ...prev, ...partial }))
  }, [])

  const getFilteredRows = useCallback((): DatasetRow[] => {
    if (!parsedDataset || !columnMapping) return []
    let rows = parsedDataset.rows

    if (filters.datasetPeriod !== "all" && columnMapping.datasetPeriod) {
      rows = rows.filter(
        (r) => String(r[columnMapping.datasetPeriod!]).toLowerCase() === filters.datasetPeriod.toLowerCase()
      )
    }

    if (filters.subgroupColumn && filters.subgroupValue) {
      rows = rows.filter(
        (r) => String(r[filters.subgroupColumn!]) === filters.subgroupValue
      )
    }

    return rows
  }, [parsedDataset, columnMapping, filters])

  const getFilteredMetrics = useCallback((): ComputedMetrics | null => {
    if (!columnMapping) return computedMetrics

    const hasActiveFilter =
      filters.datasetPeriod !== "all" ||
      (filters.subgroupColumn && filters.subgroupValue)

    if (!hasActiveFilter) return computedMetrics

    const filteredRows = getFilteredRows()
    if (filteredRows.length === 0) return computedMetrics

    try {
      return computeAllMetrics(filteredRows, columnMapping)
    } catch {
      return computedMetrics
    }
  }, [columnMapping, computedMetrics, filters, getFilteredRows])

  const resetDataset = useCallback(() => {
    setStatus("empty")
    setError(null)
    setParsedDataset(null)
    setColumnMappingState(null)
    setComputedMetrics(null)
    setFiltersState({
      subgroupColumn: null,
      subgroupValue: null,
      datasetPeriod: "all",
      timeRange: null,
    })
  }, [])

  return (
    <DatasetContext.Provider
      value={{
        status,
        error,
        parsedDataset,
        columnMapping,
        computedMetrics,
        filters,
        recentUploads,
        uploadFile,
        loadSampleData,
        setColumnMapping,
        confirmMapping,
        setFilters,
        resetDataset,
        getFilteredRows,
        getFilteredMetrics,
      }}
    >
      {children}
    </DatasetContext.Provider>
  )
}

export function useDataset() {
  const ctx = useContext(DatasetContext)
  if (!ctx) throw new Error("useDataset must be used within DatasetProvider")
  return ctx
}
