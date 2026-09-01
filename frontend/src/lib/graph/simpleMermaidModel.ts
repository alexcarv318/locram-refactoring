export type SimpleMermaidDirection = "TD" | "LR" | "BT" | "RL"

export type SimpleMermaidNodeShape = "rect" | "round" | "diamond" | "circle" | "stadium"

export type SimpleMermaidEdgeStyle = "solid" | "dotted" | "thick"

export interface SimpleMermaidSubgraph {
    id: string
    label: string
}

export interface SimpleMermaidNode {
    id: string
    label: string
    shape: SimpleMermaidNodeShape
    semanticClass: string
    subgraphId?: string
}

export interface SimpleMermaidEdge {
    id: string
    source: string
    target: string
    label: string
    style: SimpleMermaidEdgeStyle
}

export interface SimpleMermaidGraph {
    direction: SimpleMermaidDirection
    nodes: SimpleMermaidNode[]
    edges: SimpleMermaidEdge[]
    subgraphs: SimpleMermaidSubgraph[]
}
