import { useState, type ReactNode, type Ref } from "react";

import LtrIsolate from "@/components/i18n/LtrIsolate";
import PopoverSelect from "@/components/ui/PopoverSelect";
import { outlinedActionButtonClassName } from "@/lib/ui/outlinedActionButton";
import { cn } from "@/lib/utils/cn";
import type { FileHomeSource } from "@/types/source";
import { useT } from "@/i18n/useT";
import type { Translator } from "@/i18n/translate";

type FileHomeLayoutProps = {
  badgeLabel: string;
  children: ReactNode;
  contentScrollRef?: Ref<HTMLDivElement>;
  headerAction?: ReactNode;
  layout?: "standard" | "content-only";
  management?: ReactNode;
  subtitle: string;
  title: string;
};

export const FILE_HOME_MANAGEMENT_GRID_CLASS =
  "grid w-full gap-2 [grid-template-columns:repeat(auto-fit,minmax(180px,1fr))]";

export const FILE_HOME_SUMMARY_GRID_CLASS =
  "grid grid-cols-3 gap-4 @max-[639px]:grid-cols-2";

export function fileHomeManagementButtonClassName(disabled = false): string {
  return cn(
    outlinedActionButtonClassName(disabled, "sm"),
    "min-w-0",
    "[&_svg]:h-4 [&_svg]:w-4 [&_svg]:shrink-0",
  );
}

export function fileHomeHeaderActivateButtonClassName(isActive: boolean): string {
  if (isActive) {
    return cn(
      "rounded-md border px-3 py-1.5 text-xs font-medium transition",
      "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
      "disabled:cursor-default disabled:opacity-100",
    );
  }

  return cn(
    outlinedActionButtonClassName(false, "xs"),
    "rounded-md py-1.5",
    "disabled:cursor-not-allowed disabled:opacity-70",
    "disabled:border-foreground/15 disabled:bg-muted/20 disabled:text-foreground/40",
    "disabled:hover:border-foreground/15 disabled:hover:bg-muted/20 disabled:hover:text-foreground/40",
  );
}

type FileHomeManagementButtonProps = {
  children: ReactNode;
  className?: string;
  disabled?: boolean;
  onClick: () => void;
  title?: string;
  type?: "button" | "submit";
};

export function FileHomeManagementButton({
  children,
  className,
  disabled = false,
  onClick,
  title,
  type = "button",
}: FileHomeManagementButtonProps) {
  return (
    <button
      type={type}
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={cn(fileHomeManagementButtonClassName(disabled), className)}
    >
      {children}
    </button>
  );
}

type FileHomeManagementPanelProps = {
  children: ReactNode;
};

export function FileHomeManagementPanel({ children }: FileHomeManagementPanelProps) {
  return <div className="space-y-3">{children}</div>;
}

type FileHomeLocaleSelectProps = {
  ariaLabel: string;
  disabled?: boolean;
  onChange: (value: string) => void;
  options: string[];
  value: string;
};

export function FileHomeLocaleSelect({
  ariaLabel,
  disabled = false,
  onChange,
  options,
  value,
}: FileHomeLocaleSelectProps) {
  const popoverOptions = options.map((localeCode) => ({
    label: localeCode,
    value: localeCode,
  }));

  return (
    <PopoverSelect
      ariaLabel={ariaLabel}
      disabled={disabled}
      onChange={onChange}
      options={popoverOptions}
      triggerClassName="min-w-[120px]"
      value={value}
    />
  );
}

type FileHomeSectionProps = {
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  description?: string;
  title: string;
};

type FileHomeSummaryMetricProps = {
  compactValue?: boolean;
  detail: string;
  icon: ReactNode;
  label: string;
  value: string;
  valueAction?: ReactNode;
};

type FileHomeDetailFieldProps = {
  action?: ReactNode;
  cardVariant?: "default" | "paired";
  className?: string;
  compactValue?: boolean;
  label: string;
  mono?: boolean;
  uniformHeight?: boolean;
  value: string;
};

type FileHomeNoticeProps = {
  children: ReactNode;
  tone: "error" | "success" | "warning";
};

type FileHomeSummaryGridProps = {
  children: ReactNode;
  className?: string;
};

type FileHomeDetailsGridProps = {
  children: ReactNode;
  className?: string;
  columns?: 1 | 2;
};

export type HomeDetailFieldConfig = {
  action?: ReactNode;
  compactValue?: boolean;
  label: string;
  mono?: boolean;
  value: string;
};

export type HomeSummaryMetricConfig = {
  compactValue?: boolean;
  detail: string;
  icon: ReactNode;
  label: string;
  value: string;
  valueAction?: ReactNode;
};

type HomeDetailsSectionProps = {
  advancedFields?: HomeDetailFieldConfig[];
  className?: string;
  detailsLayout?: "default" | "local-base" | "shared-base" | "split";
  enableAdvancedDetails?: boolean;
  leftFields: HomeDetailFieldConfig[];
  rightFields: HomeDetailFieldConfig[];
};

type HomeStatisticsSectionProps = {
  primaryMetrics: HomeSummaryMetricConfig[];
  secondaryMetrics?: HomeSummaryMetricConfig[];
};

type HomeFeedbackStackProps = {
  error?: string | null;
  notice?: string | null;
};

export function formatFileHomeBytes(
  bytes: number | null | undefined,
  t?: Translator,
): string {
  if (bytes === null || bytes === undefined) {
    return t ? t("common.unavailable") : "Unavailable";
  }
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${Math.round(bytes / 1024)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatFileHomeTimestamp(
  value: string | null | undefined,
  t?: Translator,
  locale?: string,
): string {
  if (!value) {
    return t ? t("common.unavailable") : "Unavailable";
  }
  const compactTimestampMatch = value.match(
    /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z)?$/,
  );
  const parsed = compactTimestampMatch
    ? new Date(
        `${compactTimestampMatch[1]}-${compactTimestampMatch[2]}-${compactTimestampMatch[3]}T${compactTimestampMatch[4]}:${compactTimestampMatch[5]}:${compactTimestampMatch[6]}${compactTimestampMatch[7] ?? ""}`,
      )
    : new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  const dateText = new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
  }).format(parsed);
  const timeText = new Intl.DateTimeFormat(locale, {
    timeStyle: "short",
  }).format(parsed);
  return `${dateText}, ${timeText}`;
}

export function fileHomeDetailValue(
  value: string | null | undefined,
  t?: Translator,
): string {
  if (!value || value.trim().length === 0) {
    return t ? t("common.unavailable") : "Unavailable";
  }
  return value;
}

export function normalizeFileHomeLabel(
  value: string | null | undefined,
  fallback?: string,
): string {
  const resolvedFallback = fallback ?? "Unavailable";
  if (!value || value.trim().length === 0) {
    return resolvedFallback;
  }
  return value
    .trim()
    .split(/[_-\s]+/)
    .filter((segment) => segment.length > 0)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

export function fileHomeClassLabel(
  artifactClass: string | null | undefined,
  fallbackSubjectKind: FileHomeSource["subjectKind"],
  t?: Translator,
): string {
  if (artifactClass === "ordinary_base") {
    return t ? t("fileHome.classLabel.localBase") : "Local Base";
  }
  if (artifactClass === "snapshot") {
    return t ? t("fileHome.classLabel.snapshot") : "Snapshot";
  }
  if (artifactClass === "scoped_export") {
    return t ? t("fileHome.classLabel.scopedExport") : "Scoped Export";
  }
  if (fallbackSubjectKind === "backup_artifact") {
    return t ? t("fileHome.classLabel.snapshot") : "Snapshot";
  }
  if (fallbackSubjectKind === "export_artifact") {
    return t ? t("fileHome.classLabel.scopedExport") : "Scoped Export";
  }
  return t ? t("fileHome.classLabel.localBase") : "Local Base";
}

export function fileHomeCompatibilityLabel(
  value: string | null | undefined,
  t?: Translator,
): string {
  if (!value || value.trim().length === 0) {
    return t ? t("common.unavailable") : "Unavailable";
  }
  if (value === "ready") {
    return t ? t("fileHome.compatibility.ready") : "Ready";
  }
  if (value === "corrupt_or_unreadable") {
    return t ? t("fileHome.compatibility.corrupted") : "Corrupted";
  }
  if (value === "unsupported_schema") {
    return t ? t("fileHome.compatibility.unsupportedSchema") : "Unsupported Schema";
  }
  if (value === "migration_required") {
    return t ? t("fileHome.compatibility.migrationRequired") : "Migration Required";
  }
  return normalizeFileHomeLabel(value, t ? t("common.unavailable") : undefined);
}

export function FileHomeLayout({
  badgeLabel,
  children,
  contentScrollRef,
  headerAction,
  layout = "standard",
  management,
  subtitle,
  title,
}: FileHomeLayoutProps) {
  if (layout === "content-only") {
    return (
      <section aria-label={title} className="bg-background flex h-full min-h-0 flex-col overflow-hidden">
        <div ref={contentScrollRef} className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
          <div className="@container mx-auto flex h-full w-full max-w-6xl flex-col gap-4">
            {children}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section aria-label={title} className="bg-background flex h-full min-h-0 flex-col overflow-hidden">
      <div className="flex shrink-0 items-start justify-between gap-3 border-b border-border px-4 py-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-foreground min-w-0 break-words text-lg font-semibold">{title}</h1>
            <span className="rounded-full border border-border bg-muted/40 px-2.5 py-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              {badgeLabel}
            </span>
          </div>
          <p className="text-muted-foreground mt-1 max-w-4xl break-words text-sm leading-5">
            {subtitle}
          </p>
        </div>
        {headerAction ? <div className="shrink-0">{headerAction}</div> : null}
      </div>
      {management ? (
        <div className="shrink-0 px-4 py-3">
          <div className="mx-auto w-full max-w-6xl">{management}</div>
        </div>
      ) : null}
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        <div className="@container mx-auto flex h-full w-full max-w-6xl flex-col gap-4">
          {children}
        </div>
      </div>
    </section>
  );
}

export function FileHomeSection({
  actions,
  children,
  className,
  description,
  title,
}: FileHomeSectionProps) {
  return (
    <div className={cn("rounded-xl border border-border bg-background p-4", className)}>
      {(title || description || actions) && (
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-foreground text-sm font-semibold">{title}</h2>
            {description ? (
              <p className="text-muted-foreground mt-1 break-words text-xs leading-5">{description}</p>
            ) : null}
          </div>
          {actions}
        </div>
      )}
      <div className={cn(title || description || actions ? "mt-3" : "")}>{children}</div>
    </div>
  );
}

export function FileHomeSummaryGrid({ children, className }: FileHomeSummaryGridProps) {
  return (
    <div className={cn(FILE_HOME_SUMMARY_GRID_CLASS, className)}>
      {children}
    </div>
  );
}

export function FileHomeSummaryMetric({
  compactValue = false,
  detail,
  icon,
  label,
  value,
  valueAction,
}: FileHomeSummaryMetricProps) {
  return (
    <div className="rounded-xl border border-border bg-background p-4">
      <div className="text-muted-foreground flex min-w-0 items-center gap-2 text-[11px] uppercase tracking-wide">
        <span className="h-4 w-4 shrink-0">{icon}</span>
        <span className="min-w-0 truncate" title={label}>
          {label}
        </span>
      </div>
      <div className="mt-3 flex items-start justify-between gap-3">
        <div
          className={cn(
            "text-foreground min-w-0 break-words font-semibold [overflow-wrap:anywhere]",
            compactValue ? "text-xs leading-5" : "text-lg leading-7",
          )}
        >
          {value}
        </div>
        {valueAction ? <div className="shrink-0">{valueAction}</div> : null}
      </div>
      <p className="text-muted-foreground mt-1 break-words text-xs leading-5">{detail}</p>
    </div>
  );
}

export function FileHomeDetailsGrid({
  children,
  className,
  columns = 2,
}: FileHomeDetailsGridProps) {
  return (
    <div
      className={cn(
        "grid gap-3",
        columns === 1 ? "grid-cols-1" : "md:grid-cols-2",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function FileHomeDetailField({
  action,
  cardVariant = "default",
  className,
  compactValue = false,
  label,
  mono = false,
  uniformHeight = false,
  value,
}: FileHomeDetailFieldProps) {
  if (uniformHeight) {
    return (
      <div
        className={cn(
          "flex h-full min-h-[38px] min-w-0 flex-col justify-center gap-0.5 overflow-hidden rounded-lg border border-border bg-muted/20 px-3 py-1.5",
          className,
        )}
      >
        <div
          className="text-muted-foreground truncate text-[10px] font-medium uppercase leading-none tracking-wide"
          title={label}
        >
          {label}
        </div>
        <div className="flex min-w-0 items-center gap-2">
          <div
            className={cn(
              "text-foreground min-w-0 flex-1 truncate font-medium leading-none",
              mono ? "font-mono text-[11px]" : "text-xs",
            )}
            title={value}
          >
            {mono ? <LtrIsolate>{value}</LtrIsolate> : value}
          </div>
          {action ? <div className="shrink-0">{action}</div> : null}
        </div>
      </div>
    );
  }

  if (cardVariant === "paired") {
    return (
      <div
        className={cn(
          "relative min-w-0 rounded-lg border border-border bg-muted/20 px-3 py-2",
          className,
        )}
      >
        {action ? <div className="absolute top-1.5 right-1.5 z-10">{action}</div> : null}
        <div
          className="text-muted-foreground truncate pr-7 text-[11px] uppercase leading-none tracking-wide"
          title={label}
        >
          {label}
        </div>
        <div
          className={cn(
            "text-foreground mt-0.5 break-words text-xs font-medium leading-5 [overflow-wrap:anywhere]",
            mono ? "break-all font-mono" : undefined,
          )}
        >
          {mono ? <LtrIsolate>{value}</LtrIsolate> : value}
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "min-w-0 rounded-lg border border-border bg-muted/20 px-3 py-2",
        className,
      )}
    >
      <div
        className="text-muted-foreground truncate text-[11px] uppercase leading-none tracking-wide"
        title={label}
      >
        {label}
      </div>
      <div className="mt-0.5 flex items-start justify-between gap-2">
        <div
          className={cn(
            "text-foreground min-w-0 flex-1 break-words font-medium [overflow-wrap:anywhere]",
            mono ? "break-all font-mono text-xs leading-5" : compactValue ? "text-xs leading-5" : "text-sm leading-6",
          )}
        >
          {mono ? <LtrIsolate>{value}</LtrIsolate> : value}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
    </div>
  );
}

export function FileHomeNotice({ children, tone }: FileHomeNoticeProps) {
  const toneClassName =
    tone === "error"
      ? "border-destructive/20 bg-destructive/8 text-destructive"
      : tone === "warning"
        ? "border-warning/20 bg-warning/10 text-warning"
        : "border-emerald-500/25 bg-emerald-500/10 text-emerald-700";
  return (
    <div className={cn("rounded-xl border px-4 py-3 text-sm", toneClassName)}>
      {children}
    </div>
  );
}

export function HomeDetailsSection({
  advancedFields = [],
  className,
  detailsLayout = "default",
  enableAdvancedDetails = true,
  leftFields,
  rightFields,
}: HomeDetailsSectionProps) {
  const t = useT();
  const [showAdvancedDetails, setShowAdvancedDetails] = useState(false);
  const usePairedRowLayout = detailsLayout === "shared-base" || detailsLayout === "local-base";
  const useSplitLayout = detailsLayout === "split";
  const useCompactFields = useSplitLayout;
  const outerGridClassName = useSplitLayout
    ? "grid gap-4 md:grid-cols-2"
    : "grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(280px,1fr))]";

  function renderDetailField(
    field: HomeDetailFieldConfig,
    compact = useCompactFields,
    className?: string,
  ) {
    return (
      <FileHomeDetailField
        key={field.label}
        action={field.action}
        cardVariant={usePairedRowLayout ? "paired" : "default"}
        className={className}
        compactValue={field.compactValue}
        label={field.label}
        mono={field.mono}
        uniformHeight={compact}
        value={field.value}
      />
    );
  }

  const detailsBody = usePairedRowLayout ? (
    <div className="@container/details">
      <div className="flex flex-col gap-2">
      {leftFields.map((leftField, index) => {
        const rightFirst = rightFields[index * 2];
        const rightSecond = rightFields[index * 2 + 1];
        return (
          <div
            key={leftField.label}
            className="grid grid-cols-4 items-stretch gap-2 @max-[639px]:grid-cols-2 @max-[560px]/details:grid-cols-2"
          >
            <div className="col-span-2 min-w-0 @max-[639px]:col-span-1 @max-[560px]/details:col-span-1">
              {renderDetailField(leftField, false, "h-full")}
            </div>
            {rightFirst || rightSecond ? (
              <div className="col-span-2 grid min-w-0 grid-cols-2 items-stretch gap-2 @max-[639px]:col-span-1 @max-[639px]:grid-cols-1 @max-[560px]/details:col-span-1 @max-[560px]/details:grid-cols-1">
                {rightFirst
                  ? renderDetailField(rightFirst, false, "h-full")
                  : null}
                {rightSecond
                  ? renderDetailField(rightSecond, false, "h-full")
                  : null}
              </div>
            ) : null}
          </div>
        );
      })}
      </div>
    </div>
  ) : (
    <div className={outerGridClassName}>
      <FileHomeDetailsGrid
        className={useSplitLayout ? "min-w-0 gap-2" : "min-w-0"}
        columns={useSplitLayout ? 1 : 2}
      >
        {leftFields.map((field) => renderDetailField(field))}
      </FileHomeDetailsGrid>

      <FileHomeDetailsGrid
        className={
          useSplitLayout
            ? "min-w-0 gap-2"
            : "min-w-0 [grid-template-columns:repeat(auto-fit,minmax(180px,1fr))]"
        }
        columns={useSplitLayout ? 1 : 2}
      >
        {rightFields.map((field) => renderDetailField(field))}
      </FileHomeDetailsGrid>
    </div>
  );

  return (
    <FileHomeSection
      actions={
        enableAdvancedDetails ? (
          <button
            type="button"
            onClick={() => setShowAdvancedDetails((current) => !current)}
            className={cn(outlinedActionButtonClassName(false, "xs"), "rounded-md py-1.5")}
          >
            {showAdvancedDetails ? t("fileHome.hideAdvanced") : t("fileHome.showAdvanced")}
          </button>
        ) : undefined
      }
      className={className}
      title={t("fileHome.section.details")}
    >
      {detailsBody}

      {enableAdvancedDetails && showAdvancedDetails && advancedFields.length > 0 ? (
        <FileHomeDetailsGrid
          className="mt-4 [grid-template-columns:repeat(auto-fit,minmax(180px,1fr))]"
          columns={2}
        >
          {advancedFields.map((field) => renderDetailField(field))}
        </FileHomeDetailsGrid>
      ) : null}
    </FileHomeSection>
  );
}

export function HomeStatisticsSection({
  primaryMetrics,
  secondaryMetrics = [],
}: HomeStatisticsSectionProps) {
  const t = useT();
  const metrics = [...primaryMetrics, ...secondaryMetrics];

  return (
    <FileHomeSection title={t("fileHome.section.statistics")}>
      <FileHomeSummaryGrid>
        {metrics.map((metric) => (
          <FileHomeSummaryMetric
            key={metric.label}
            compactValue={metric.compactValue}
            detail={metric.detail}
            icon={metric.icon}
            label={metric.label}
            value={metric.value}
            valueAction={metric.valueAction}
          />
        ))}
      </FileHomeSummaryGrid>
    </FileHomeSection>
  );
}

export function HomeFeedbackStack({ error, notice }: HomeFeedbackStackProps) {
  if (!notice && !error) {
    return null;
  }

  return (
    <>
      {notice ? <FileHomeNotice tone="success">{notice}</FileHomeNotice> : null}
      {error ? <FileHomeNotice tone="error">{error}</FileHomeNotice> : null}
    </>
  );
}
