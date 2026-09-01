import { GraphCanvasView } from "@/components/sources/GraphCanvasView"
import { GraphModal } from "@/components/sources/GraphModal"
import { useGraphModalStore } from "@/stores/graphModalStore"

export function GraphCanvas({ isModal = false }: { isModal?: boolean }) {
    const isGraphModalOpen = useGraphModalStore((state) => state.isOpen)
    const setGraphModalOpen = useGraphModalStore((state) => state.setOpen)

    return (
        <>
            {!isGraphModalOpen || isModal ? (
                <GraphCanvasView isModal={isModal} onExpand={!isModal ? () => setGraphModalOpen(true) : undefined} />
            ) : (
                <div className="h-full w-full" />
            )}
            {!isModal && <GraphModal open={isGraphModalOpen} onOpenChange={setGraphModalOpen} />}
        </>
    )
}
