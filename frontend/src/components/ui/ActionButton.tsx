import { type ReactNode } from "react"

import { cn } from "@/lib/utils/cn"

import Tooltip from "@/components/ui/Tooltip"

interface ActionButtonProps {
    icon: ReactNode
    onClick: (e?: React.MouseEvent<HTMLButtonElement>) => void
    title?: string
    ariaLabel?: string
    className?: string
    iconClassName?: string
    active?: boolean
    disabled?: boolean
}

export default function ActionButton({
    icon,
    onClick,
    title,
    ariaLabel,
    className,
    active,
    disabled,
}: ActionButtonProps) {
    const button = (
        <button
            onClick={onClick}
            disabled={disabled}
            className={cn(
                "text-text-secondary hover:text-foreground hover:bg-menu-hover-bg",
                "flex cursor-pointer items-center justify-center rounded-md bg-transparent",
                "p-1 transition-all duration-150",
                active && "bg-menu-hover-bg text-foreground",
                disabled && "pointer-events-none opacity-50",
                className,
            )}
            aria-label={ariaLabel || title}
            aria-pressed={active}
        >
            {icon}
        </button>
    )

    if (title) {
        return <Tooltip content={title}>{button}</Tooltip>
    } else {
        return button
    }
}
