export type Graph3DPhysicsTuning = {
    d3AlphaDecay: number
    d3VelocityDecay: number
    warmupTicks: number
}

export const GRAPH_3D_PHYSICS_DEFAULT: Graph3DPhysicsTuning = {
    d3AlphaDecay: 0.01,
    d3VelocityDecay: 0.4,
    warmupTicks: 300,
}
