import { useEffect, useState } from "react";

import LtrIsolate from "@/components/i18n/LtrIsolate";
import { useT } from "@/i18n/useT";
import { CopyIcon, CopySuccessIcon } from "@/components/icons/Icons";
import Tooltip from "@/components/ui/Tooltip";
import { cn } from "@/lib/utils/cn";

type CopyableIdKind = "generic" | "note";

interface CopyableIdProps {
  value: string;
  displayValue?: string;
  className?: string;
  textClassName?: string;
  buttonClassName?: string;
  kind?: CopyableIdKind;
  title?: string;
  copiedTitle?: string;
  ariaLabel?: string;
  copiedAriaLabel?: string;
  stopPropagation?: boolean;
  iconOnly?: boolean;
}

export default function CopyableId({
  value,
  displayValue,
  className,
  textClassName,
  buttonClassName,
  kind = "generic",
  title,
  copiedTitle,
  ariaLabel,
  copiedAriaLabel,
  stopPropagation = false,
  iconOnly = false,
}: CopyableIdProps) {
  const t = useT();
  const [copied, setCopied] = useState(false);

  const resolvedTitle =
    title ?? (kind === "note" ? t("tree.notes.copyId") : "Copy page id");
  const resolvedCopiedTitle =
    copiedTitle ?? (kind === "note" ? t("tree.notes.copyIdCopied") : "Copied");
  const resolvedAriaLabel =
    ariaLabel ?? (kind === "note" ? t("tree.notes.copyId") : "Copy page id");
  const resolvedCopiedAriaLabel =
    copiedAriaLabel ??
    (kind === "note" ? t("tree.notes.copyIdAriaCopied") : "Page id copied");

  useEffect(() => {
    setCopied(false);
  }, [value]);

  const handleCopy = () => {
    void navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    });
  };

  const button = (
    <button
      type="button"
      onClick={(event) => {
        if (stopPropagation) {
          event.stopPropagation();
        }
        handleCopy();
      }}
      className={cn(
        iconOnly
          ? "text-text-secondary hover:text-foreground hover:bg-menu-hover-bg flex cursor-pointer items-center justify-center rounded-md bg-transparent p-1 transition-all duration-150"
          : "text-text-secondary hover:text-foreground flex min-w-0 cursor-pointer items-center gap-1.5 rounded text-left font-mono text-[11px] leading-5 transition-colors",
        className,
        buttonClassName,
      )}
      aria-label={copied ? resolvedCopiedAriaLabel : resolvedAriaLabel}
    >
      <span className="shrink-0 rounded p-0.5">
        {copied ? <CopySuccessIcon className="h-3.5 w-3.5" /> : <CopyIcon className="h-3.5 w-3.5" />}
      </span>
      {!iconOnly ? (
        <LtrIsolate className={cn("min-w-0 truncate", textClassName)}>
          {displayValue ?? value}
        </LtrIsolate>
      ) : null}
    </button>
  );

  return <Tooltip content={copied ? resolvedCopiedTitle : resolvedTitle}>{button}</Tooltip>;
}
