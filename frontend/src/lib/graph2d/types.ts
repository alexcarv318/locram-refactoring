export type NodeId = string

export type Graph2DNode = {
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
    number?: string | number
    opacity?: number
    x?: number
    y?: number
    vx?: number
    vy?: number
    fx?: number
    fy?: number
    [key: string]: unknown
}

export type Graph2DLink = {
    source: NodeId | { id: NodeId }
    target: NodeId | { id: NodeId }
    id?: string
    type?: string
    parentChild?: boolean
    [key: string]: unknown
}

export type Graph2DData = {
    nodes: Graph2DNode[]
    links: Graph2DLink[]
}

export type ForceGraph2DRef = {
    d3Force?: (name: string) => any
    zoomToFit?: (ms?: number, padding?: number) => void
    centerAt?: (x: number, y: number, ms?: number) => void
    zoom?: (k: number, ms?: number) => void
}
