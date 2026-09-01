export const LOCRAM_LINK_TYPES = [
  "related",
  "extends",
  "extended_by",
  "supports",
  "supported_by",
  "contradicts",
  "contradicted_by",
  "refines",
  "refined_by",
  "questions",
  "questioned_by",
  "reference",
] as const;

export const LOCRAM_GRAPH_LINK_FILTER_ORDER: string[] = ["parent", ...LOCRAM_LINK_TYPES, "tag"];
