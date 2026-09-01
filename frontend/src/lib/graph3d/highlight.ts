import * as THREE from "three"

export function createHighlightSprite({ color, opacity = 0.8 }: { color: string; opacity?: number }): THREE.Sprite {
    const size = 128
    const canvas = document.createElement("canvas")
    canvas.width = size
    canvas.height = size

    const ctx = canvas.getContext("2d")
    if (!ctx) {
        const material = new THREE.SpriteMaterial({ color })
        return new THREE.Sprite(material)
    }

    const center = size / 2
    const radius = size / 2

    const gradient = ctx.createRadialGradient(center, center, 0, center, center, radius)
    gradient.addColorStop(0, `rgba(255,255,255,${opacity})`)
    gradient.addColorStop(0.35, `rgba(255,255,255,${opacity * 0.35})`)
    gradient.addColorStop(1, "rgba(255,255,255,0)")

    ctx.clearRect(0, 0, size, size)
    ctx.fillStyle = gradient
    ctx.beginPath()
    ctx.arc(center, center, radius, 0, Math.PI * 2)
    ctx.fill()

    const texture = new THREE.CanvasTexture(canvas)
    texture.needsUpdate = true

    const material = new THREE.SpriteMaterial({
        map: texture,
        color,
        transparent: true,
        depthWrite: false,
        depthTest: true,
        opacity,
    })

    return new THREE.Sprite(material)
}

export function getNodeHighlightSprite(params: {
    node: object
    cache: WeakMap<object, THREE.Sprite>
    color: string
    baseOpacity?: number
    radius: number
    isSelected: boolean
}): THREE.Sprite {
    const { node, cache, color, baseOpacity = 0.9, radius, isSelected } = params

    const cached = cache.get(node)
    const sprite = cached ?? createHighlightSprite({ color, opacity: baseOpacity })
    if (!cached) cache.set(node, sprite)

    sprite.scale.set(radius, radius, 1)

    const material = (sprite as unknown as { material?: unknown }).material
    if (material instanceof THREE.SpriteMaterial) {
        ;(material as unknown as { opacity: number }).opacity = isSelected ? baseOpacity : Math.min(baseOpacity, 0.6)
        ;(material as unknown as { needsUpdate: boolean }).needsUpdate = true
    }

    return sprite
}
