const LABEL_PRIORITY: Record<string, number> = {
    hub: 1,
    structure: 2,
    permanent: 3,
    "note-taking": 4,
    fleeting: 5,
    tag: 6,
}

export function getPrimaryLabel(labels: string[]): string {
    if (labels.length === 0) return "Node"
    return labels.reduce((best, label) => {
        const bestPrio = LABEL_PRIORITY[best] ?? 50
        const labelPrio = LABEL_PRIORITY[label] ?? 50
        return labelPrio < bestPrio ? label : best
    })
}
