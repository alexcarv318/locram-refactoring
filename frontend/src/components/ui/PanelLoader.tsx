interface PanelLoaderProps {
    message?: string
    description?: string
    size?: "sm" | "md" | "lg"
}

const SIZE_MAP = {
    sm: {
        spinner: "h-8 w-8",
        outerBorder: "border-2",
        innerInset: "inset-1",
        innerBorder: "border",
        centerInset: "inset-2",
    },
    md: {
        spinner: "h-12 w-12",
        outerBorder: "border-4",
        innerInset: "inset-1",
        innerBorder: "border-2",
        centerInset: "inset-3",
    },
    lg: {
        spinner: "h-16 w-16",
        outerBorder: "border-4",
        innerInset: "inset-2",
        innerBorder: "border-2",
        centerInset: "inset-4",
    },
} as const

export function PanelLoader({ message = "Loading...", description, size = "md" }: PanelLoaderProps) {
    const { spinner, outerBorder, innerInset, innerBorder, centerInset } = SIZE_MAP[size]

    return (
        <div className="flex flex-col items-center justify-center gap-3 text-center">
            <div className={`relative ${spinner}`}>
                <div
                    className={`absolute inset-0 animate-spin rounded-full border-transparent ${outerBorder} border-t-[#593EDC] border-r-[#9b8bea]`}
                />
                <div
                    className={`absolute ${innerInset} animate-spin rounded-full border-transparent ${innerBorder} border-t-[#06DF72] border-l-[#9b8bea] [animation-direction:reverse]`}
                />
                <div
                    className={`absolute ${centerInset} rounded-full bg-linear-to-br from-[#593EDC] via-[#9b8bea] to-[#06DF72] opacity-80`}
                />
            </div>

            {(message || description) && (
                <div>
                    {message && <p className="text-foreground/90 text-sm font-medium">{message}</p>}
                    {description && <p className="text-text-secondary text-xs">{description}</p>}
                </div>
            )}
        </div>
    )
}
