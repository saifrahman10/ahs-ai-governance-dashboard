"use client"

import type { ReactNode } from "react"
import { CircleHelp } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"

export type MetricHelpPopoverProps = {
  /** Short heading inside the popover */
  title?: string
  children: ReactNode
  className?: string
  side?: "top" | "right" | "bottom" | "left"
  align?: "start" | "center" | "end"
  /** `aria-label` for the trigger */
  label?: string
}

/**
 * Compact help trigger: opens a popover so charts and KPIs stay visually clean.
 * Use `onClick={(e) => e.stopPropagation()}` is built into the trigger for flip-cards.
 */
export function MetricHelpPopover({
  title,
  children,
  className,
  side = "left",
  align = "start",
  label = "How to read this",
}: MetricHelpPopoverProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex shrink-0 rounded-full p-0.5 text-muted-foreground transition-colors hover:text-primary",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
            className
          )}
          aria-label={label}
          onClick={(e) => e.stopPropagation()}
        >
          <CircleHelp className="size-3.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="z-[300] w-80 max-h-[min(70vh,440px)] overflow-y-auto p-3 text-sm shadow-lg border-border"
        align={align}
        side={side}
        sideOffset={6}
      >
        {title && <p className="font-medium text-foreground text-xs mb-2">{title}</p>}
        <div className="text-xs text-muted-foreground space-y-2 leading-relaxed">{children}</div>
      </PopoverContent>
    </Popover>
  )
}

/** Uppercase section label + help icon (e.g. metric breakdown blocks). */
export function SectionLabelWithHelp({
  children,
  helpTitle,
  helpContent,
}: {
  children: ReactNode
  helpTitle?: string
  helpContent: ReactNode
}) {
  return (
    <div className="flex items-center gap-1.5">
      <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{children}</p>
      <MetricHelpPopover title={helpTitle} label="How to read this section" side="right" align="start">
        {helpContent}
      </MetricHelpPopover>
    </div>
  )
}

/** Card title row: title text + optional help (for CardTitle patterns). */
export function TitleWithHelp({
  className,
  title,
  help,
  helpTitle,
}: {
  className?: string
  title: string
  help: ReactNode
  helpTitle?: string
}) {
  return (
    <div className={cn("flex items-center gap-1.5 min-w-0", className)}>
      <span className="min-w-0">{title}</span>
      <MetricHelpPopover title={helpTitle ?? title} label={`How to read: ${title}`}>
        {help}
      </MetricHelpPopover>
    </div>
  )
}
