import { create } from "zustand"

interface SourcesToolbarState {
    isGraphCollapsed: boolean
    isFiltersOpen: boolean
    isEditMode: boolean

    graphView: "2d" | "3d" | "mermaid"
    graphDepth: number
    showNodeLabels: boolean
    showTagNodes: boolean
    isOrbitEnabled: boolean
    zoomToFitRequestId: number

    usedContextLayerEnabled: boolean
    fetchedContextLayerEnabled: boolean
    selectionAction: "remove" | "add"

    toggleGraph: () => void
    toggleFilters: () => void
    toggleEditMode: () => void
    setEditMode: (value: boolean, action?: "remove" | "add") => void

    setGraphView: (value: "2d" | "3d" | "mermaid") => void
    setGraphDepth: (value: number) => void
    toggleNodeLabels: () => void
    toggleTagNodes: () => void
    toggleOrbit: () => void
    requestZoomToFit: () => void

    toggleUsedContextLayer: () => void
    toggleFetchedContextLayer: () => void
}

export const useSourcesToolbarStore = create<SourcesToolbarState>((set) => ({
    isGraphCollapsed: false,
    isFiltersOpen: false,

    graphView: "2d",
    graphDepth: 2,
    showNodeLabels: true,
    showTagNodes: false,
    isOrbitEnabled: false,
    zoomToFitRequestId: 0,

    usedContextLayerEnabled: true,
    fetchedContextLayerEnabled: true,
    isEditMode: false,
    selectionAction: "remove",

    toggleGraph: () => set((state) => ({ isGraphCollapsed: !state.isGraphCollapsed })),

    toggleFilters: () => set((state) => ({ isFiltersOpen: !state.isFiltersOpen })),

    toggleEditMode: () =>
        set((state) => ({
            isEditMode: !state.isEditMode,
            selectionAction: state.isEditMode ? state.selectionAction : "remove",
        })),

    setEditMode: (value, action) =>
        set((state) => ({
            isEditMode: value,
            selectionAction: action ?? state.selectionAction,
        })),

    setGraphView: (value) => set({ graphView: value }),

    setGraphDepth: (value) => set({ graphDepth: Math.max(1, Math.min(5, Math.round(value))) }),

    toggleNodeLabels: () => set((state) => ({ showNodeLabels: !state.showNodeLabels })),

    toggleTagNodes: () => set((state) => ({ showTagNodes: !state.showTagNodes })),

    toggleOrbit: () => set((state) => ({ isOrbitEnabled: !state.isOrbitEnabled })),

    requestZoomToFit: () => set((state) => ({ zoomToFitRequestId: state.zoomToFitRequestId + 1 })),

    toggleUsedContextLayer: () => set((state) => ({ usedContextLayerEnabled: !state.usedContextLayerEnabled })),

    toggleFetchedContextLayer: () =>
        set((state) => ({ fetchedContextLayerEnabled: !state.fetchedContextLayerEnabled })),
}))
