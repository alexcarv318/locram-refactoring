import { createContext, useContext, useEffect, useRef, type ReactNode } from "react"
import { cn } from "@/lib/utils/cn"
import { createPortal } from "react-dom"



interface ModalContextValue {
    close: () => void
}

const ModalContext = createContext<ModalContextValue | null>(null)

function useModalContext(component: string) {
    const context = useContext(ModalContext)
    if (!context) {
        throw new Error(`${component} must be used within <Modal> ... </Modal>`)
    }
    return context
}

interface ModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    children: ReactNode
    closeOnOverlayClick?: boolean
}

export function Modal({ open, onOpenChange, children, closeOnOverlayClick = true }: ModalProps) {
    const overlayRef = useRef<HTMLDivElement | null>(null)

    useEffect(() => {
        if (!open) return

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                onOpenChange(false)
            }
        }

        document.addEventListener("keydown", handleKeyDown)
        const originalOverflow = document.body.style.overflow
        document.body.style.overflow = "hidden"

        return () => {
            document.removeEventListener("keydown", handleKeyDown)
            document.body.style.overflow = originalOverflow
        }
    }, [open, onOpenChange])

    if (!open) return null

    return createPortal(
        <ModalContext.Provider value={{ close: () => onOpenChange(false) }}>
            <div className="fixed inset-0 z-50 flex items-center justify-center">
                <div
                    ref={overlayRef}
                    className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                    onClick={() => closeOnOverlayClick && onOpenChange(false)}
                />
                <div className="relative z-10 flex h-full w-full items-center justify-center p-3 sm:p-8">
                    {children}
                </div>
            </div>
        </ModalContext.Provider>,
        document.body,
    )
}

interface ModalContentProps extends React.ComponentPropsWithoutRef<"div"> {
    children: ReactNode
    className?: string
}

export function ModalContent({ children, className, ...props }: ModalContentProps) {
    return (
        <div
            {...props}
            role="dialog"
            aria-modal="true"
            className={cn(
                "border-border bg-background relative h-fit max-h-[95vh] w-full max-w-6xl overflow-hidden rounded-2xl border shadow-2xl",
                className,
            )}
        >
            {children}
        </div>
    )
}

interface ModalHeaderProps {
    children: ReactNode
    className?: string
}

export function ModalHeader({ children, className }: ModalHeaderProps) {
    return (
        <div
            className={cn(
                "border-border bg-panel-background flex items-center justify-between gap-3 border-b px-4 py-3",
                className,
            )}
        >
            {children}
        </div>
    )
}

interface ModalTitleProps {
    children: ReactNode
    className?: string
}

export function ModalTitle({ children, className }: ModalTitleProps) {
    return <h2 className={cn("text-lg font-semibold", className)}>{children}</h2>
}

interface ModalDescriptionProps {
    children: ReactNode
    className?: string
}

export function ModalDescription({ children, className }: ModalDescriptionProps) {
    return <p className={cn("text-muted-foreground text-sm", className)}>{children}</p>
}

interface ModalBodyProps {
    children: ReactNode
    className?: string
}

export function ModalBody({ children, className }: ModalBodyProps) {
    return <div className={cn("flex-1 overflow-hidden", className)}>{children}</div>
}

interface ModalFooterProps {
    children: ReactNode
    className?: string
}

export function ModalFooter({ children, className }: ModalFooterProps) {
    return <div className={cn("border-border border-t px-4 py-3", className)}>{children}</div>
}

interface ModalCloseButtonProps {
    children?: ReactNode
    className?: string
}

export function ModalCloseButton({ children, className }: ModalCloseButtonProps) {
    const { close } = useModalContext("ModalCloseButton")

    return (
        <button
            type="button"
            onClick={close}
            className={cn(
                "text-muted-foreground hover:text-foreground hover:bg-muted absolute top-3 right-3 z-9999 inline-flex h-8 w-8 items-center justify-center rounded-md border border-transparent",
                className,
            )}
            aria-label="Close modal"
        >
            {children ?? <span className="text-lg">×</span>}
        </button>
    )
}
