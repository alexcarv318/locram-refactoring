import type { ForceGraph3DRef } from "@/lib/graph3d/types"

export type Force3DParams = {
    chargeStrength: number
    linkDistance: number
    distanceMax: number
    collisionRadius: number
    collisionStrength: number
    linkStrength: number
    gravityStrength: number
}

type SimNode = { x?: number; y?: number; z?: number; vx?: number; vy?: number; vz?: number }

function createGravityForce(strength: number) {
    let nodes: SimNode[] = []

    const force = ((alpha: number) => {
        const k = strength * alpha
        for (const n of nodes) {
            const x = n.x ?? 0
            const y = n.y ?? 0
            const z = n.z ?? 0

            n.vx = (n.vx ?? 0) - x * k
            n.vy = (n.vy ?? 0) - y * k
            n.vz = (n.vz ?? 0) - z * k
        }
    }) as ((alpha: number) => void) & { initialize: (ns: SimNode[]) => void }

    force.initialize = (ns: SimNode[]) => {
        nodes = ns
    }

    return force
}

export function compute3DForceParams(nodeCount: number): Force3DParams {
    const safeCount = Number.isFinite(nodeCount) ? nodeCount : 0

    return {
        chargeStrength: Math.max(-180, -40 - safeCount * 0.35),
        linkDistance: Math.max(18, Math.min(140, 32 + safeCount * 0.55)),
        distanceMax: Math.max(180, Math.min(550, 220 + safeCount * 1.6)),
        collisionRadius: 14,
        collisionStrength: 0.25,
        linkStrength: 0.06,
        gravityStrength: Math.min(0.001, 0.008 + safeCount * 0.00002),
    }
}

export function apply3DForces(graph: ForceGraph3DRef | null | undefined, params: Force3DParams): void {
    if (!graph?.d3Force) return

    graph.d3Force("charge")?.strength(params.chargeStrength)?.distanceMax(params.distanceMax)
    graph.d3Force("link")?.distance(params.linkDistance)?.strength(params.linkStrength)
    graph.d3Force("gravity", createGravityForce(params.gravityStrength))
    graph
        .d3Force("collide")
        ?.radius(() => params.collisionRadius)
        ?.strength(params.collisionStrength)
}
