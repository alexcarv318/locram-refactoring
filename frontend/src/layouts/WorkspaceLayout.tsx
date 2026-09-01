import { createElement, useEffect, useRef, useState } from "react"
import type { DragEvent } from "react"

import type { ShellTab } from "@/types/ShellTab"
import type { SearchResultItem } from "@/components/popover/PopoverSearchResults"

import { useDocumentUpload } from "@/hooks/useDocumentUpload"
import { useShellLayoutStore } from "@/stores/shellLayoutStore"

import WorkspaceHeader from "@/components/workspace/WorkspaceHeader"
import WorkspaceTab from "@/components/workspace/WorkspaceTab"

interface WorkspaceLayoutProps {
    tabs: ShellTab[]
    onSearch: (query: string) => Promise<SearchResultItem[]>
    onSelectSearchItem: (item: SearchResultItem) => void
    canGoBackInPageHistory: boolean
    canGoForwardInPageHistory: boolean
    onGoBackInPageHistory: () => Promise<void>
    onGoForwardInPageHistory: () => Promise<void>
    activeBaseLabel?: string
}

const hasFiles = (e: DragEvent) => Array.from(e.dataTransfer.types).includes("Files")

export default function WorkspaceLayout({
    tabs,
    onSearch,
    onSelectSearchItem,
    canGoBackInPageHistory,
    canGoForwardInPageHistory,
    onGoBackInPageHistory,
    onGoForwardInPageHistory,
    activeBaseLabel,
}: WorkspaceLayoutProps) {
    const redistributeWidths = useShellLayoutStore((state) => state.redistributeWidths)
    const [isFileDragOver, setIsFileDragOver] = useState(false)
    const dragCounterRef = useRef(0)
    const { uploadFiles } = useDocumentUpload()

    useEffect(() => {
        const handleResize = () => redistributeWidths(window.innerWidth)
        window.addEventListener("resize", handleResize)
        return () => window.removeEventListener("resize", handleResize)
    }, [redistributeWidths])

    // --- File drag handlers (guarded to only react to file drags) ---

    const handleFileDragEnter = (e: DragEvent) => {
        if (!hasFiles(e)) return
        e.preventDefault()
        dragCounterRef.current++
        setIsFileDragOver(true)
    }

    const handleFileDragLeave = (e: DragEvent) => {
        if (!hasFiles(e)) return
        e.preventDefault()
        dragCounterRef.current--
        if (dragCounterRef.current <= 0) {
            dragCounterRef.current = 0
            setIsFileDragOver(false)
        }
    }

    const handleFileDragOver = (e: DragEvent) => {
        if (!hasFiles(e)) return
        e.preventDefault()
        e.dataTransfer.dropEffect = "copy"
    }

    const handleFileDrop = (e: DragEvent) => {
        if (!hasFiles(e)) return
        e.preventDefault()
        dragCounterRef.current = 0
        setIsFileDragOver(false)

        const files = Array.from(e.dataTransfer.files)
        if (files.length > 0) uploadFiles(files)
    }

    const lastVisibleTabId = [...tabs].reverse().find((t) => t.isVisible)?.id ?? null

    return (
        <div
            className="bg-background flex h-screen w-full flex-col"
            onDragEnter={handleFileDragEnter}
            onDragLeave={handleFileDragLeave}
            onDragOver={handleFileDragOver}
            onDrop={handleFileDrop}
        >
            <WorkspaceHeader
                activeBaseLabel={activeBaseLabel}
                canGoBackInPageHistory={canGoBackInPageHistory}
                canGoForwardInPageHistory={canGoForwardInPageHistory}
                onGoBackInPageHistory={onGoBackInPageHistory}
                onGoForwardInPageHistory={onGoForwardInPageHistory}
                onSearch={onSearch}
                onSelectSearchItem={onSelectSearchItem}
            />

            <div className="flex flex-1 overflow-hidden">
                {tabs.map((tab) => (
                    <div key={tab.id} className="h-full">
                        <WorkspaceTab
                            id={tab.id}
                            isLast={tab.id === lastVisibleTabId}
                        >
                            {createElement(tab.component)}
                        </WorkspaceTab>
                    </div>
                ))}
            </div>

            {isFileDragOver && (
                <div
                    className="pointer-events-auto fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
                    onDragEnter={(e) => {
                        e.stopPropagation()
                        handleFileDragEnter(e)
                    }}
                    onDragLeave={(e) => {
                        e.stopPropagation()
                        handleFileDragLeave(e)
                    }}
                    onDragOver={(e) => {
                        e.stopPropagation()
                        handleFileDragOver(e)
                    }}
                    onDrop={(e) => {
                        e.stopPropagation()
                        handleFileDrop(e)
                    }}
                >
                    <div className="border-accent bg-panel-background rounded-2xl border-2 border-dashed px-12 py-8">
                        <p className="text-foreground text-lg font-medium">Drop files to upload</p>
                        <p className="text-text-secondary mt-1 text-sm">PDF, DOC, DOCX, TXT, MD</p>
                    </div>
                </div>
            )}
        </div>
    )
}
