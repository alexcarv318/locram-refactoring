export type NodeId = string

export type Graph3DNode = {
    id: NodeId
    scope_origin?: "seed" | "context"
    scopeOrigin?: "seed" | "context"
    labels?: string[]
    tags?: string[]
    color?: string
    heading?: string
    name?: string
    title?: string
    content?: string
    x?: number
    y?: number
    z?: number
    vx?: number
    vy?: number
    vz?: number
    fx?: number
    fy?: number
    fz?: number
    [key: string]: unknown
}

export type Graph3DLink = {
    source: NodeId | { id: NodeId }
    target: NodeId | { id: NodeId }
    id?: string
    type?: string
    parentChild?: boolean
    [key: string]: unknown
}

export type ForceGraph3DRef = {
    scene?: () => any
    zoomToFit?: (ms?: number, padding?: number) => void
    d3Force?: {
        (name: string): any
        (name: string, force: any): any
    }
}
