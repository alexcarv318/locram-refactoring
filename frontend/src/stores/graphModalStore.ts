import { create } from "zustand"

interface GraphModalState {
    isOpen: boolean
    setOpen: (open: boolean) => void
}

export const useGraphModalStore = create<GraphModalState>((set) => ({
    isOpen: false,
    setOpen: (open) => set({ isOpen: open }),
}))
