type ScopeOriginCarrier = {
  scope_origin?: string;
  scopeOrigin?: string;
};

export function getScopeOrigin(value: ScopeOriginCarrier | null | undefined): "seed" | "context" | null {
  const scopeOrigin = value?.scope_origin ?? value?.scopeOrigin;
  if (scopeOrigin === "seed" || scopeOrigin === "context") {
    return scopeOrigin;
  }
  return null;
}

export function isContextScopeNode(value: ScopeOriginCarrier | null | undefined): boolean {
  return getScopeOrigin(value) === "context";
}

export function isSeedScopeNode(value: ScopeOriginCarrier | null | undefined): boolean {
  return getScopeOrigin(value) === "seed";
}

export function countSeedScopeNodes<T extends ScopeOriginCarrier>(items: T[]): number {
  return items.filter((item) => isSeedScopeNode(item)).length;
}

export function countContextScopeNodes<T extends ScopeOriginCarrier>(items: T[]): number {
  return items.filter((item) => isContextScopeNode(item)).length;
}
