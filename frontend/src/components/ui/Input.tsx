import React from "react"

interface InputProps {
    onValueChange?: (value: string) => void
}

const Input = React.forwardRef<HTMLInputElement, React.ComponentPropsWithoutRef<"input"> & InputProps>(
    ({ onValueChange, onChange, className, ...props }, ref) => {
        return (
            <input
                {...props}
                ref={ref}
                onChange={(e) => {
                    onChange?.(e)
                    onValueChange?.(e.target.value)
                }}
                className={`border-input bg-background placeholder:text-muted-foreground focus:border-menu-active-fg/60 h-7 w-full min-w-0 flex-1 rounded-md border px-2 text-xs outline-none focus-visible:outline-none sm:px-3 ${className ?? ""}`}
            />
        )
    },
)

Input.displayName = "Input"

export default Input
