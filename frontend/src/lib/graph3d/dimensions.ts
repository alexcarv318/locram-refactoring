export type GraphDimensions = { width: number; height: number }

export function measureGraphContainer(params: {
    container: HTMLElement | null
    width?: number
    height?: number
    fallback?: GraphDimensions
}): GraphDimensions {
    const { container, width, height, fallback = { width: 800, height: 600 } } = params

    if (container) {
        const rect = container.getBoundingClientRect()
        return {
            width: width || rect.width || fallback.width,
            height: height || rect.height || fallback.height,
        }
    }

    return {
        width: width || window.innerWidth * 0.9,
        height: height || window.innerHeight * 0.9,
    }
}
