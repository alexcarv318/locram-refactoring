import type {
  GraphFilterOptions,
  MetadataRule,
  MetadataRuleGroup,
} from "./contract";

type MetadataCarrier = {
  subject: string[];
  tags: string[];
  title: string;
};

function normalizeMetadataRuleValues(rule: MetadataRule) {
  return Array.from(new Set(rule.values.map((value) => value.trim().toLowerCase()).filter(Boolean)));
}

function getAvailableMetadataValues(field: MetadataRule["field"], options?: GraphFilterOptions) {
  if (!options || field === "title") {
    return [];
  }

  const values = field === "subject" ? options.subjects : options.tags;
  return Array.from(new Set(values.map((value) => value.trim().toLowerCase()).filter(Boolean)));
}

export function isMetadataRuleActive(rule: MetadataRule, options?: GraphFilterOptions) {
  const normalizedValues = normalizeMetadataRuleValues(rule);
  if (normalizedValues.length === 0) {
    return false;
  }

  if (rule.field === "title" || rule.operator !== "has_any_of") {
    return true;
  }

  const availableValues = getAvailableMetadataValues(rule.field, options);
  if (availableValues.length === 0) {
    return true;
  }

  const selectedValues = new Set(normalizedValues);
  return !availableValues.every((value) => selectedValues.has(value));
}

export function getActiveMetadataRules(group: MetadataRuleGroup, options?: GraphFilterOptions) {
  return group.rules.filter((rule) => isMetadataRuleActive(rule, options));
}

function evaluateMetadataRule(node: MetadataCarrier, rule: MetadataRule) {
  const normalizedValues = normalizeMetadataRuleValues(rule);
  if (normalizedValues.length === 0) {
    return true;
  }

  if (rule.field === "title") {
    const title = node.title.toLowerCase();
    if (rule.operator === "does_not_contain") {
      return normalizedValues.every((value) => !title.includes(value));
    }
    return normalizedValues.every((value) => title.includes(value));
  }

  const fieldValues = (rule.field === "subject" ? node.subject : node.tags).map((value) => value.toLowerCase());
  if (rule.operator === "has_all_of") {
    return normalizedValues.every((value) => fieldValues.includes(value));
  }
  if (rule.operator === "has_none_of" || rule.operator === "does_not_contain") {
    return normalizedValues.every((value) => !fieldValues.includes(value));
  }
  return normalizedValues.some((value) => fieldValues.includes(value));
}

export function matchesMetadataRuleGroups(
  node: MetadataCarrier,
  groups: MetadataRuleGroup[],
  options?: GraphFilterOptions,
) {
  if (groups.length === 0) {
    return true;
  }

  return groups.every((group) => {
    const activeRules = getActiveMetadataRules(group, options);
    if (activeRules.length === 0) {
      return true;
    }
    const groupMatches =
      group.joiner === "or"
        ? activeRules.some((rule) => evaluateMetadataRule(node, rule))
        : activeRules.every((rule) => evaluateMetadataRule(node, rule));
    return group.negated ? !groupMatches : groupMatches;
  });
}
