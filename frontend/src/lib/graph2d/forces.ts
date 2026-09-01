import type { ForceGraph2DRef } from "@/lib/graph2d/types"

export type Force2DParams = {
    chargeStrength: number
    linkDistance: number
    distanceMax: number
    collisionRadius: number
    collisionStrength: number
    linkStrength: number
}

export function compute2DForceParams(nodeCount: number): Force2DParams {
    const safeCount = Number.isFinite(nodeCount) ? nodeCount : 0

    return {
        chargeStrength: Math.max(-300, -80 - safeCount * 1.0),
        linkDistance: Math.max(30, Math.min(130, 40 + safeCount * 0.9)),
        distanceMax: Math.max(150, Math.min(600, 200 + safeCount * 2)),
        collisionRadius: 22,
        collisionStrength: 0.1,
        linkStrength: 0.02,
    }
}

export function apply2DForces(graph: ForceGraph2DRef | null | undefined, params: Force2DParams): void {
    if (!graph?.d3Force) return

    graph.d3Force("charge")?.strength(params.chargeStrength)?.distanceMax(params.distanceMax)
    graph.d3Force("link")?.distance(params.linkDistance)?.strength(params.linkStrength)
    graph
        .d3Force("collide")
        ?.radius(() => params.collisionRadius)
        ?.strength(params.collisionStrength)
}
