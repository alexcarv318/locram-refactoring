import type { ForceGraph3DRef } from "@/lib/graph3d/types"

export function startOrbitRotation(params: {
    graph: ForceGraph3DRef | null | undefined
    isEnabledRef: { current: boolean }
    speed?: number
}): () => void {
    const { graph, isEnabledRef, speed = 0.005 } = params

    let frameId: number | null = null

    const tick = () => {
        if (!isEnabledRef.current) return

        const scene = graph?.scene?.()
        if (!scene) {
            frameId = requestAnimationFrame(tick)
            return
        }

        const graphObj = scene.children?.find?.((child: unknown) => {
            return Boolean(child && typeof child === "object" && (child as { type?: unknown }).type === "Group")
        })
        if (graphObj) {
            const rot = (graphObj as { rotation?: { y?: number } }).rotation
            if (rot && typeof rot.y === "number") rot.y -= speed
        }

        frameId = requestAnimationFrame(tick)
    }

    tick()

    return () => {
        if (frameId != null) cancelAnimationFrame(frameId)
    }
}
