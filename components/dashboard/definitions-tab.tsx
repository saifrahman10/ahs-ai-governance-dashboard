"use client"

import { useState } from "react"
import { BookOpen, Search, Download, ChevronDown, ChevronUp } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface GlossaryEntry {
  term: string
  tier: string
  tierColor: string
  description: string
  clinicalRisk: string
  threshold: string
  formula?: string
  psiScale?: { label: string; range: string; color: string }[]
  currentValue?: string
  currentStatus?: string
}

const glossaryEntries: GlossaryEntry[] = [
  {
    term: "False Negative Rate Disparity",
    tier: "Tier 1 Critical",
    tierColor: "bg-destructive/10 text-destructive border-destructive/20",
    description:
      "Measures the difference in false negative rates across subgroups. A false negative occurs when the model fails to identify a patient who actually has or will develop a condition. High FNR disparity means certain groups are systematically being missed.",
    clinicalRisk:
      "Patients in disadvantaged subgroups may not receive timely intervention for diabetes management, leading to delayed treatment and worse health outcomes.",
    threshold: "\u22648%",
    formula: "FNR = FN / (FN + TP)\nDisparity = max(FNR) \u2212 min(FNR) across subgroups",
  },
  {
    term: "Positive Predictive Value (PPV) Disparity",
    tier: "Tier 1 Critical",
    tierColor: "bg-destructive/10 text-destructive border-destructive/20",
    description:
      "Measures the difference in positive predictive value across subgroups. PPV indicates the proportion of positive predictions that are correct. Disparity means some groups receive less reliable positive predictions.",
    clinicalRisk:
      "Lower PPV in certain groups means more false alarms, leading to unnecessary interventions and eroding trust in the model among clinicians and families.",
    threshold: "\u226412%",
  },
  {
    term: "Population Stability Index (PSI)",
    tier: "Drift Metric",
    tierColor: "bg-warning/10 text-warning border-warning/20",
    description:
      "Measures the shift in the distribution of a feature or prediction between a reference (training) dataset and the current production dataset. PSI quantifies how much the population has changed over time.",
    clinicalRisk:
      "Significant distribution shift means the model is operating on data it was not trained for, potentially degrading fairness and accuracy in unpredictable ways.",
    threshold: "<0.1 Stable",
    psiScale: [
      { label: "Stable", range: "<0.1", color: "text-success" },
      { label: "Investigate", range: "0.1\u20130.2", color: "text-warning" },
      { label: "Severe", range: ">0.2", color: "text-destructive" },
    ],
    currentValue: "0.22",
    currentStatus: "RETRAIN",
  },
  {
    term: "Expected Calibration Error (ECE)",
    tier: "Tier 2 Monitoring",
    tierColor: "bg-primary/10 text-primary border-primary/20",
    description:
      "Measures how well the model's predicted probabilities match actual outcomes. A well-calibrated model that predicts 80% probability should be correct approximately 80% of the time.",
    clinicalRisk:
      "Poor calibration means clinicians cannot trust the model's confidence scores, making it difficult to set appropriate decision thresholds for clinical action.",
    threshold: "ECE <0.10",
  },
  {
    term: "Recall (Sensitivity)",
    tier: "Tier 1 Critical",
    tierColor: "bg-destructive/10 text-destructive border-destructive/20",
    description:
      "The proportion of actual positive cases that the model correctly identifies. In clinical contexts, this is the model's ability to detect patients who need intervention.",
    clinicalRisk:
      "Low recall means the model is missing patients who need care. In pediatric diabetes, this could mean children are not flagged for early intervention programs.",
    threshold: "\u226585% all groups, \u22648% gap",
  },
]

export function DefinitionsTab() {
  const [searchQuery, setSearchQuery] = useState("")
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())

  const filtered = glossaryEntries.filter(
    (entry) =>
      entry.term.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.description.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const toggleExpand = (term: string) => {
    setExpandedItems((prev) => {
      const next = new Set(prev)
      if (next.has(term)) {
        next.delete(term)
      } else {
        next.add(term)
      }
      return next
    })
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <BookOpen className="size-5 text-primary" />
            Definitions & Glossary
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Reference definitions for all governance metrics and thresholds
          </p>
        </div>
        <Button variant="outline" size="sm" className="text-xs gap-1.5 text-muted-foreground">
          <Download className="size-3.5" />
          Export as PDF
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          placeholder="Search metrics and definitions..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 h-10 bg-card border-border text-foreground placeholder:text-muted-foreground"
        />
      </div>

      {/* Entries */}
      <div className="flex flex-col gap-3">
        {filtered.map((entry) => {
          const isExpanded = expandedItems.has(entry.term)
          return (
            <Card key={entry.term} className="border-border bg-card">
              <CardHeader
                className="pb-0 cursor-pointer"
                onClick={() => toggleExpand(entry.term)}
              >
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-foreground flex items-center gap-2">
                    {entry.term}
                    <Badge
                      variant="outline"
                      className={`text-[10px] px-1.5 py-0 font-medium ${entry.tierColor}`}
                    >
                      {entry.tier}
                    </Badge>
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-muted-foreground">
                      Threshold: {entry.threshold}
                    </span>
                    {isExpanded ? (
                      <ChevronUp className="size-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="size-4 text-muted-foreground" />
                    )}
                  </div>
                </div>
              </CardHeader>
              {isExpanded && (
                <CardContent className="pt-4 flex flex-col gap-4">
                  {/* Description */}
                  <div>
                    <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1">
                      Plain Language Explanation
                    </p>
                    <p className="text-sm text-foreground leading-relaxed">
                      {entry.description}
                    </p>
                  </div>

                  {/* Clinical risk */}
                  <div className="rounded-md bg-secondary/50 border border-border px-3 py-2.5">
                    <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1">
                      Clinical Risk
                    </p>
                    <p className="text-xs text-foreground leading-relaxed">
                      {entry.clinicalRisk}
                    </p>
                  </div>

                  {/* Formula */}
                  {entry.formula && (
                    <div>
                      <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1">
                        Formula
                      </p>
                      <pre className="text-xs font-mono text-foreground bg-secondary/50 border border-border rounded-md px-3 py-2 whitespace-pre-wrap">
                        {entry.formula}
                      </pre>
                    </div>
                  )}

                  {/* PSI scale */}
                  {entry.psiScale && (
                    <div>
                      <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-2">
                        Severity Scale
                      </p>
                      <div className="grid grid-cols-3 gap-2">
                        {entry.psiScale.map((s) => (
                          <div
                            key={s.label}
                            className="rounded-md bg-secondary/50 border border-border px-3 py-2 text-center"
                          >
                            <p className={`text-xs font-medium ${s.color}`}>
                              {s.label}
                            </p>
                            <p className="text-[10px] font-mono text-muted-foreground mt-0.5">
                              {s.range}
                            </p>
                          </div>
                        ))}
                      </div>
                      {entry.currentValue && (
                        <div className="mt-2 flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">
                            Current:
                          </span>
                          <span className="text-xs font-mono font-medium text-foreground">
                            {entry.currentValue}
                          </span>
                          <Badge
                            variant="outline"
                            className="text-[10px] px-1.5 py-0 font-medium bg-destructive/10 text-destructive border-destructive/20"
                          >
                            {entry.currentStatus}
                          </Badge>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              )}
            </Card>
          )
        })}

        {filtered.length === 0 && (
          <div className="text-center py-12">
            <p className="text-sm text-muted-foreground">
              No definitions found matching your search.
            </p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between border-t border-border pt-4">
        <p className="text-xs text-muted-foreground">
          Last updated: Feb 22, 2026
        </p>
        <p className="text-xs text-muted-foreground">
          Alberta Health Services &middot; AI Governance Framework v2.4
        </p>
      </div>
    </div>
  )
}
