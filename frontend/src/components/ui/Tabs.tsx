import * as React from "react"

import { cn } from "@/lib/utils/cn"

type TabsVariant = "default" | "button" | "line"
type TabsSize = "lg" | "md" | "sm" | "xs"

type TabsContextType = {
    value: string
    onValueChange: (value: string) => void
    variant?: TabsVariant
    size?: TabsSize
}

const TabsContext = React.createContext<TabsContextType>({
    value: "",
    onValueChange: () => {},
    variant: "default",
    size: "md",
})

interface TabsProps {
    value: string
    onValueChange: (value: string) => void
    className?: string
    children: React.ReactNode
    variant?: TabsVariant
    size?: TabsSize
}

function Tabs({ value, onValueChange, className, children, variant = "default", size = "md" }: TabsProps) {
    return (
        <TabsContext.Provider value={{ value, onValueChange, variant, size }}>
            <div data-slot="tabs" className={cn("", className)}>
                {children}
            </div>
        </TabsContext.Provider>
    )
}

interface TabsListProps extends React.HTMLAttributes<HTMLDivElement> {
    children: React.ReactNode
    variant?: TabsVariant
    shape?: "default" | "pill"
    size?: TabsSize
}

function TabsList({
    className,
    variant = "default",
    shape = "default",
    size = "md",
    children,
    ...props
}: TabsListProps) {
    const getListClasses = () => {
        const base = "flex items-center shrink-0"
        const sizeClasses = {
            lg: "gap-2.5 p-1.5",
            md: "gap-2 p-1",
            sm: "gap-1.5 p-1",
            xs: "gap-1 p-1",
        }
        const variantClasses = {
            default: shape === "default" ? (size === "lg" || size === "md" ? "rounded-lg" : "rounded-md") : "",
            button: "",
            line: "border-b border-border",
        }
        const shapeClasses = {
            default: "",
            pill: "rounded-full [&_[role=tab]]:rounded-full",
        }

        return cn(
            base,
            sizeClasses[size],
            variantClasses[variant],
            shapeClasses[shape],
            variant === "line" &&
                {
                    lg: "gap-9",
                    md: "gap-8",
                    sm: "gap-4",
                    xs: "gap-4",
                }[size],
        )
    }

    return (
        <div data-slot="tabs-list" className={cn(getListClasses(), className)} role="tablist" {...props}>
            {children}
        </div>
    )
}

interface TabsTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    value: string
    children: React.ReactNode
    asChild?: boolean
}

function TabsTrigger({ className, value, children, asChild, ...props }: TabsTriggerProps) {
    const { value: selectedValue, onValueChange, variant = "default", size = "md" } = React.useContext(TabsContext)
    const isActive = selectedValue === value

    const getTriggerClasses = () => {
        const base =
            "shrink-0 cursor-pointer whitespace-nowrap inline-flex justify-left items-center font-medium ring-offset-background transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:shrink-0 [&_svg]:text-muted-foreground [&:hover_svg]:text-primary"

        const variantClasses = {
            default: cn(
                "bg-background text-muted-foreground hover:text-foreground",
                isActive && "bg-[color:var(--custom-light-blue)] text-foreground shadow-black/5",
                "[&[data-state=active]_svg]:text-primary",
            ),
            button: cn(
                "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-lg text-accent-foreground hover:text-foreground",
                isActive && "bg-accent text-foreground",
            ),
            line: cn(
                "border-b-2 text-muted-foreground border-transparent hover:text-primary",
                isActive && "border-primary text-primary",
            ),
        }

        const sizeClasses = {
            lg: "gap-2.5 [&_svg]:size-5 text-sm py-2.5 px-4 rounded-md",
            md: "gap-2 [&_svg]:size-4 text-sm py-1.5 px-3 rounded-md",
            sm: "gap-1.5 [&_svg]:size-3.5 text-xs py-1.5 px-2.5 rounded-sm",
            xs: "gap-1 [&_svg]:size-3.5 text-xs py-1 px-2 rounded-sm",
        }

        const lineSizeClasses = {
            lg: "py-3",
            md: "py-2.5",
            sm: "py-2",
            xs: "py-1.5",
        }

        return cn(base, variantClasses[variant], variant === "line" ? lineSizeClasses[size] : sizeClasses[size])
    }

    const handleClick = (e: React.MouseEvent) => {
        onValueChange(value)
        ;(props as { onClick?: (e: React.MouseEvent) => void }).onClick?.(e)
    }

    if (asChild && React.isValidElement(children)) {
        const childProps = (children.props ?? {}) as {
            className?: string
            onClick?: (e: React.MouseEvent) => void
        }

        return React.cloneElement(children, {
            "data-slot": "tabs-trigger",
            "data-state": isActive ? "active" : "inactive",
            role: "tab",
            "aria-selected": isActive,
            onClick: (e: React.MouseEvent) => {
                onValueChange(value)
                childProps.onClick?.(e)
            },
            className: cn(getTriggerClasses(), className, childProps.className),
            ...props,
        } as any)
    }

    return (
        <button
            type="button"
            data-slot="tabs-trigger"
            data-state={isActive ? "active" : "inactive"}
            className={cn(getTriggerClasses(), className)}
            onClick={handleClick}
            role="tab"
            aria-selected={isActive}
            {...(props as React.ButtonHTMLAttributes<HTMLButtonElement>)}
        >
            {children}
        </button>
    )
}

interface TabsContentProps extends React.HTMLAttributes<HTMLDivElement> {
    value: string
    children: React.ReactNode
}

function TabsContent({ className, value, children, ...props }: TabsContentProps) {
    const { value: selectedValue } = React.useContext(TabsContext)
    const isActive = selectedValue === value

    if (!isActive) return null

    return (
        <div
            data-slot="tabs-content"
            className={cn(
                "focus-visible:ring-ring mt-2.5 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-hidden",
                className,
            )}
            role="tabpanel"
            {...props}
        >
            {children}
        </div>
    )
}

export { Tabs, TabsContent, TabsList, TabsTrigger }
