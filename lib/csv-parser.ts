import Papa from "papaparse"
import type { ParsedDataset, DatasetRow } from "./types"

export function parseCSV(file: File): Promise<ParsedDataset> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      dynamicTyping: true,
      skipEmptyLines: "greedy",
      transformHeader: (header: string) => header.trim(),
      complete(results) {
        const warnings: string[] = []
        let rows = results.data as DatasetRow[]
        let columns = results.meta.fields ?? []

        // Detect title-row pattern: first row might be a label like "eval_records_synthetic"
        // If the first "column" looks like a single-word title with no real data, skip it
        if (columns.length === 1 && rows.length > 0) {
          const firstRowValues = Object.values(rows[0] ?? {})
          if (firstRowValues.length === 1 && typeof firstRowValues[0] === "string") {
            warnings.push(`Detected title row "${firstRowValues[0]}", re-parsing without it.`)
            // Re-parse skipping the first line
            const text = (results.data as DatasetRow[])
              .map(() => "")
              .join("")
            reject(new Error("Title row detected. Please remove the first line and try again."))
            return
          }
        }

        // Filter out completely empty rows and rows where all values are null
        rows = rows.filter((row) => {
          const values = Object.values(row)
          return values.some((v) => v !== null && v !== undefined && v !== "")
        })

        if (results.errors.length > 0) {
          const significantErrors = results.errors.filter(
            (e) => e.type !== "FieldMismatch"
          )
          significantErrors.forEach((e) => {
            warnings.push(`Row ${e.row}: ${e.message}`)
          })
        }

        if (columns.length === 0) {
          reject(new Error("No columns detected in CSV file."))
          return
        }

        if (rows.length === 0) {
          reject(new Error("No data rows found in CSV file."))
          return
        }

        resolve({
          columns,
          rows,
          fileName: file.name,
          rowCount: rows.length,
          parseWarnings: warnings,
        })
      },
      error(error) {
        reject(new Error(`CSV parse error: ${error.message}`))
      },
    })
  })
}

export function parseCSVString(csvString: string, fileName: string): Promise<ParsedDataset> {
  return new Promise((resolve, reject) => {
    const lines = csvString.split("\n")

    // Detect title row: if first line has no commas and second line looks like a header
    let adjustedCsv = csvString
    if (lines.length > 2) {
      const firstLine = lines[0].trim()
      const secondLine = lines[1].trim()
      if (!firstLine.includes(",") && secondLine.includes(",")) {
        adjustedCsv = lines.slice(1).join("\n")
      }
    }

    Papa.parse(adjustedCsv, {
      header: true,
      dynamicTyping: true,
      skipEmptyLines: "greedy",
      transformHeader: (header: string) => header.trim(),
      complete(results) {
        const warnings: string[] = []
        let rows = results.data as DatasetRow[]
        const columns = results.meta.fields ?? []

        rows = rows.filter((row) => {
          const values = Object.values(row)
          return values.some((v) => v !== null && v !== undefined && v !== "")
        })

        if (columns.length === 0) {
          reject(new Error("No columns detected."))
          return
        }

        resolve({
          columns,
          rows,
          fileName,
          rowCount: rows.length,
          parseWarnings: warnings,
        })
      },
      error(error) {
        reject(new Error(`CSV parse error: ${error.message}`))
      },
    })
  })
}
