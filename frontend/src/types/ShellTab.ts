import type { ComponentType } from "react"

export interface ShellTab {
    id: string
    label: string
    isVisible: boolean
    width: number
    component: ComponentType
    persistWidth?: boolean
}
