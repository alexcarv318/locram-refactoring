export type CanvasLabelPlacement = "inside" | "side";

export type CanvasLabelDirection = "ltr" | "rtl";

export interface CanvasLabelLayout {
    textX: number
    textY: number
    textAlign: CanvasTextAlign
    textBaseline: CanvasTextBaseline
    direction: CanvasLabelDirection
    placement: CanvasLabelPlacement
}

export interface CanvasLabelLayoutOptions {
    x: number
    y: number
    nodeSize: number
    direction: CanvasLabelDirection
    placement: CanvasLabelPlacement
    sideOffset?: number
}

export interface CanvasLabelBackgroundOptions {
    layout: CanvasLabelLayout
    textWidth: number
    textHeight: number
    paddingX?: number
    paddingY?: number
}

export interface CanvasLabelBackgroundRect {
    x: number
    y: number
    width: number
    height: number
}

export function computeCanvasLabelLayout(
    options: CanvasLabelLayoutOptions,
): CanvasLabelLayout {
    const { x, y, nodeSize, direction, placement, sideOffset = 5 } = options
    if (placement === "side") {
        const offset = nodeSize + sideOffset
        if (direction === "rtl") {
            return {
                textX: x - offset,
                textY: y,
                textAlign: "right",
                textBaseline: "middle",
                direction,
                placement,
            }
        }
        return {
            textX: x + offset,
            textY: y,
            textAlign: "left",
            textBaseline: "middle",
            direction,
            placement,
        }
    }
    return {
        textX: x,
        textY: y,
        textAlign: "center",
        textBaseline: "middle",
        direction,
        placement,
    }
}

export function computeCanvasLabelBackgroundRect(
    options: CanvasLabelBackgroundOptions,
): CanvasLabelBackgroundRect {
    const { layout, textWidth, textHeight, paddingX = 2, paddingY = 2 } = options
    const width = textWidth + paddingX * 2
    const height = textHeight + paddingY * 2
    const y = layout.textY - textHeight / 2 - paddingY
    if (layout.textAlign === "right") {
        return { x: layout.textX - textWidth - paddingX, y, width, height }
    }
    if (layout.textAlign === "center") {
        return { x: layout.textX - textWidth / 2 - paddingX, y, width, height }
    }
    return { x: layout.textX - paddingX, y, width, height }
}

export function applyCanvasLabelDirection(
    ctx: CanvasRenderingContext2D,
    direction: CanvasLabelDirection,
): void {
    const target = ctx as CanvasRenderingContext2D & { direction?: string }
    if (typeof target.direction === "string") {
        target.direction = direction
    }
}
