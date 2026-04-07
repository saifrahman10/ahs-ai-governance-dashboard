# AHS AI Governance Dashboard v2

A fully interactive, data-driven governance dashboard for monitoring and evaluating clinical ML models in healthcare settings. Built for the **Alberta Health Services (AHS) Pediatric Diabetes AI Capstone** project.

This is the **v2 rewrite** — a complete rebuild from the original Streamlit prototype into a modern Next.js + React application with real-time metric computation, subgroup fairness analysis, drift detection, and automated governance decisions.

![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)
![React](https://img.shields.io/badge/React-19-61dafb?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue?logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-38bdf8?logo=tailwind-css)

> **Disclaimer:** This application is for governance analytics and education. It is **not** a medical device, does not provide clinical advice, and must not replace institutional validation, privacy review, or monitoring processes.

---

## Features

- **CSV Upload & Auto-Detection** — Drag-and-drop CSV upload with automatic column mapping (y_true, y_score, y_pred, subgroup columns, feature columns)
- **Governance Decision Engine** — Automated PASS / NEEDS_REVIEW / FAIL decisions based on configurable clinical thresholds
- **Fairness Metrics** — FNR and PPV disparity analysis across demographic subgroups (sex, race/ethnicity, Indigenous identity, health zone, etc.)
- **Drift Detection** — Population Stability Index (PSI), Kolmogorov-Smirnov statistic, target drift, and prediction drift between Reference/Current periods
- **Model Performance** — Recall/PPV per subgroup, calibration curve (ECE), performance threshold cards
- **Time Series Trends** — Performance metrics over time by service month, FNR drift by subgroup
- **Data Quality** — Missingness analysis and duplicate detection
- **Export** — Full governance reports exportable as CSV or JSON
- **AHS Branding** — Custom AHS color theme and logo integration

## Governance Thresholds

| Metric | Threshold | Decision |
|--------|-----------|----------|
| FNR Disparity (per-column) | ≤ 8% | Pass / Fail |
| PPV Disparity (per-column) | ≤ 12% | Pass / Fail |
| Min Recall (any subgroup) | ≥ 85% | Pass / Fail |
| Calibration ECE | < 0.10 | Pass / Fail |
| PSI Max (features) | < 0.1 / < 0.2 | Pass / Warn / Fail |
| Prediction Drift (KS) | < 0.1 | Pass / Warn |
| Target Drift | < 5% / < 10% | Pass / Warn / Fail |
| Subgroup Sample Size | ≥ 50 | Pass / Warn |

Decision logic: 0 fails + 0 warnings = **PASS**, warnings only = **NEEDS_REVIEW**, 1 fail within 20% margin = **NEEDS_REVIEW**, 1 fail ≥20% over or 2+ fails = **FAIL**.

## Quick Start

```bash
# Install dependencies
pnpm install

# Start dev server
pnpm dev

# Open http://localhost:3000
```

## Demo Datasets

Three datasets are included for demonstration:

| Dataset | File | Governance Decision |
|---------|------|-------------------|
| Original (baseline) | `eval_records_synthetic.csv` | FAIL (no positive predictions) |
| Fail Scenario | `demo_fail_scenario.csv` | **FAIL** — intentional FNR disparities, drift |
| Pass Scenario | `demo_pass_scenario.csv` | **PASS** — realistic near-miss imperfections |

Upload any of these from the `data/` folder or use the "Load Sample Dataset" button.

## Tech Stack

- **[Next.js 16](https://nextjs.org/)** with Turbopack
- **[React 19](https://react.dev/)**
- **[TypeScript 5.7](https://www.typescriptlang.org/)**
- **[Tailwind CSS v4](https://tailwindcss.com/)** (CSS-first configuration)
- **[shadcn/ui](https://ui.shadcn.com/)** component library (Radix primitives)
- **[Recharts 2.15](https://recharts.org/)** for data visualization
- **[Papa Parse 5.5](https://www.papaparse.com/)** for CSV parsing
- **pnpm** package manager

## Project Structure

```
app/
  page.tsx              Main dashboard page
  layout.tsx            Root layout with AHS branding
  globals.css           Theme variables (OKLCH color space)

lib/
  types.ts              TypeScript interfaces
  csv-parser.ts         CSV parsing with title-row detection
  column-mapper.ts      Auto-detection of column roles
  metrics.ts            Metrics engine (classification, calibration, drift, governance)
  dataset-context.tsx   React Context for state management
  export.ts             CSV/JSON report export

components/dashboard/
  header.tsx            Navigation, export, governance badge
  footer.tsx            Data-aware footer
  column-mapping-dialog.tsx  Column mapping modal
  overview-tab.tsx      KPI cards, governance decision, upload
  fairness-metrics-tab.tsx   FNR/PPV charts, scatter plot
  drift-detection-tab.tsx    PSI charts, time series, drift table
  model-performance-tab.tsx  Recall/PPV charts, calibration curve
  definitions-tab.tsx        Metric glossary

data/                   Source CSV datasets
public/data/            Browser-fetchable copies
```

## CSV Schema

Required columns:

| Column | Description |
|--------|-------------|
| `y_true` | Binary ground truth (0 or 1) |
| `y_score` | Predicted probability in [0, 1] |
| `y_pred` | Binary prediction (0 or 1) |

Recommended columns:

| Column | Description |
|--------|-------------|
| `dataset_period` | "Reference" or "Current" for drift detection |
| `service_month` | Time column for trend analysis |
| Subgroup columns | `sex_at_birth`, `age_band`, `health_zone`, `race_ethnicity_group`, `indigenous_identity`, etc. |
| Feature columns | `a1c_last_value`, `mean_glucose_14d`, `bmi`, etc. |

The column mapper auto-detects roles from column names using pattern matching.

## License

MIT License — see [LICENSE](LICENSE).

## Acknowledgments

Built as part of the AHS Pediatric Diabetes AI Governance Capstone project. Metrics engine inspired by [Evidently AI](https://www.evidentlyai.com/).
