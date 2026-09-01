import SearchableMultiSelect from "@/components/filters/SearchableMultiSelect";
import Input from "@/components/ui/Input";
import PopoverSelect from "@/components/ui/PopoverSelect";
import { useT } from "@/i18n/useT";
import type { Translator } from "@/i18n/translate";
import type {
  MetadataRule,
  MetadataRuleField,
  MetadataRuleGroup,
  MetadataRuleOperator,
} from "@/lib/graph/filter-state/index";
import { LuX } from "react-icons/lu";

type MetadataRulesBuilderProps = {
  subjectOptions: string[];
  tagOptions: string[];
  groups: MetadataRuleGroup[];
  onChange: (groups: MetadataRuleGroup[]) => void;
};

function getFieldOptions(
  t: Translator,
): Array<{ label: string; value: MetadataRuleField }> {
  return [
    { label: t("filters.metadata.titleField"), value: "title" },
    { label: t("filters.metadata.subjectField"), value: "subject" },
    { label: t("filters.metadata.tagField"), value: "tag" },
  ];
}

function getTitleOperators(
  t: Translator,
): Array<{ label: string; value: MetadataRuleOperator }> {
  return [
    { label: t("filters.metadata.op.contains"), value: "contains" },
    { label: t("filters.metadata.op.doesNotContain"), value: "does_not_contain" },
  ];
}

function getTokenOperators(
  t: Translator,
): Array<{ label: string; value: MetadataRuleOperator }> {
  return [
    { label: t("filters.metadata.op.hasAnyOf"), value: "has_any_of" },
    { label: t("filters.metadata.op.hasAllOf"), value: "has_all_of" },
    { label: t("filters.metadata.op.hasNoneOf"), value: "has_none_of" },
  ];
}

function createId(prefix: string) {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function createEmptyRule(field: MetadataRuleField = "subject"): MetadataRule {
  return {
    id: createId("rule"),
    field,
    operator: field === "title" ? "contains" : "has_any_of",
    values: [],
  };
}

function createEmptyGroup(): MetadataRuleGroup {
  return {
    id: createId("group"),
    joiner: "and",
    negated: false,
    rules: [createEmptyRule()],
  };
}

function getOperatorOptions(t: Translator, field: MetadataRuleField) {
  return field === "title" ? getTitleOperators(t) : getTokenOperators(t);
}

function getFieldPlaceholder(t: Translator, field: MetadataRuleField) {
  if (field === "title") {
    return t("filters.metadata.titlePlaceholder");
  }
  if (field === "subject") {
    return t("filters.metadata.searchSubject");
  }
  return t("filters.metadata.searchTag");
}

function getFieldTitle(t: Translator, field: MetadataRuleField) {
  if (field === "subject") {
    return t("filters.metadata.subjectField");
  }
  return t("filters.metadata.tagField");
}

function getFieldEmptyLabel(t: Translator, field: MetadataRuleField) {
  if (field === "subject") {
    return t("filters.metadata.emptySubject");
  }
  return t("filters.metadata.emptyTag");
}

function formatRuleValueLabel(value: string) {
  return value.replace(/_/g, " ");
}

function RuleSelect<T extends string>({
  label,
  options,
  value,
  onChange,
  hideLabel = false,
  triggerClassName,
}: {
  label: string;
  options: Array<{ label: string; value: T }>;
  value: T;
  onChange: (value: T) => void;
  hideLabel?: boolean;
  triggerClassName?: string;
}) {
  return (
    <label className="space-y-1">
      {hideLabel ? null : (
        <span className="text-text-secondary text-[10px] font-medium tracking-[0.14em] uppercase">{label}</span>
      )}
      <PopoverSelect<T>
        ariaLabel={label}
        options={options}
        value={value}
        onChange={onChange}
        align="left"
        side="bottom"
        triggerClassName={triggerClassName ?? "w-full min-w-0"}
      />
    </label>
  );
}

export default function MetadataRulesBuilder({
  subjectOptions,
  tagOptions,
  groups,
  onChange,
}: MetadataRulesBuilderProps) {
  const t = useT();
  const resolvedGroups = groups.length > 0 ? groups : [createEmptyGroup()];
  const fieldOptions = getFieldOptions(t);
  const joinerOptions: Array<{ label: string; value: "and" | "or" }> = [
    { label: t("filters.metadata.and"), value: "and" },
    { label: t("filters.metadata.or"), value: "or" },
  ];

  function replaceGroups(nextGroups: MetadataRuleGroup[]) {
    onChange(nextGroups);
  }

  function updateGroup(groupId: string, updater: (group: MetadataRuleGroup) => MetadataRuleGroup) {
    replaceGroups(resolvedGroups.map((group) => (group.id === groupId ? updater(group) : group)));
  }

  function updateRule(
    groupId: string,
    ruleId: string,
    updater: (rule: MetadataRule) => MetadataRule,
  ) {
    updateGroup(groupId, (group) => ({
      ...group,
      rules: group.rules.map((rule) => (rule.id === ruleId ? updater(rule) : rule)),
    }));
  }

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-foreground/80 text-[9px] font-medium tracking-[0.14em] uppercase">
            {t("filters.metadata.heading")}
          </div>
          <p className="text-text-secondary mt-1 text-xs">
            {t("filters.metadata.descriptionPrefix")}{" "}
            <span className="font-medium text-foreground">{t("filters.metadata.and")}</span>{" "}
            {t("filters.metadata.descriptionMiddle")}{" "}
            <span className="font-medium text-foreground">{t("filters.metadata.or")}</span>
            {t("filters.metadata.descriptionSuffix")}
          </p>
        </div>
        <button
          type="button"
          onClick={() => replaceGroups([...resolvedGroups, createEmptyGroup()])}
          className="text-text-secondary hover:text-foreground hover:bg-menu-hover-bg rounded-lg px-2 py-1 text-xs transition-colors"
        >
          {t("filters.metadata.addGroup")}
        </button>
      </div>

      <div className="space-y-3">
        {resolvedGroups.map((group, groupIndex) => (
          <div key={group.id} className="border-border bg-background/30 rounded-2xl border p-3">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-text-secondary text-[10px] font-semibold tracking-[0.14em] uppercase">
                  {t("filters.metadata.group", { index: groupIndex + 1 })}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    updateGroup(group.id, (current) => ({
                      ...current,
                      negated: !current.negated,
                    }))}
                  className={
                    group.negated
                      ? "bg-menu-hover-bg text-foreground rounded-xl border border-border px-3 py-2 text-xs font-medium transition-colors"
                      : "border-border bg-background/40 text-text-secondary hover:bg-menu-hover-bg hover:text-foreground rounded-xl border px-3 py-2 text-xs font-medium transition-colors"
                  }
                >
                  {t("filters.metadata.not")}
                </button>
                <RuleSelect
                  label={t("filters.metadata.groupJoinerLabel")}
                  options={joinerOptions}
                  value={group.joiner}
                  hideLabel
                  triggerClassName="w-[76px]"
                  onChange={(joiner) =>
                    updateGroup(group.id, (current) => ({
                      ...current,
                      joiner,
                    }))}
                />
              </div>
              {resolvedGroups.length > 1 ? (
                <button
                  type="button"
                  onClick={() => replaceGroups(resolvedGroups.filter((current) => current.id !== group.id))}
                  className="text-text-secondary hover:text-destructive rounded-md px-2 py-1 text-xs transition-colors"
                >
                  {t("filters.metadata.removeGroup")}
                </button>
              ) : null}
            </div>

            <div className="space-y-3">
              {group.rules.map((rule, ruleIndex) => {
                const operatorOptions = getOperatorOptions(t, rule.field);
                const optionValues = rule.field === "subject" ? subjectOptions : tagOptions;

                return (
                  <div key={rule.id} className="rounded-xl border border-transparent bg-panel-background/60 p-3">
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <span className="text-text-secondary text-[10px] font-semibold tracking-[0.14em] uppercase">
                        {t("filters.metadata.rule", { index: ruleIndex + 1 })}
                      </span>
                      {group.rules.length > 1 ? (
                        <button
                          type="button"
                          onClick={() =>
                            updateGroup(group.id, (current) => ({
                              ...current,
                              rules: current.rules.filter((currentRule) => currentRule.id !== rule.id),
                            }))}
                          className="text-text-secondary hover:text-destructive rounded-md px-2 py-1 text-xs transition-colors"
                        >
                          {t("filters.metadata.removeRule")}
                        </button>
                      ) : null}
                    </div>

                    <div className="grid gap-3 lg:grid-cols-[112px_148px_minmax(0,1fr)]">
                      <RuleSelect
                        label={t("filters.metadata.field")}
                        options={fieldOptions}
                        value={rule.field}
                        onChange={(field) =>
                          updateRule(group.id, rule.id, (current) => ({
                            ...current,
                            field,
                            operator: field === "title" ? "contains" : "has_any_of",
                            values: [],
                          }))}
                      />

                      <RuleSelect
                        label={t("filters.metadata.operator")}
                        options={operatorOptions}
                        value={rule.operator}
                        onChange={(operator) =>
                          updateRule(group.id, rule.id, (current) => ({
                            ...current,
                            operator,
                          }))}
                      />

                      {rule.field === "title" ? (
                        <label className="space-y-1">
                          <span className="text-text-secondary text-[10px] font-medium tracking-[0.14em] uppercase">
                            {t("filters.metadata.titleField")}
                          </span>
                          <Input
                            value={rule.values[0] ?? ""}
                            onValueChange={(value) =>
                              updateRule(group.id, rule.id, (current) => ({
                                ...current,
                                values: value.trim().length > 0 ? [value] : [],
                              }))}
                            placeholder={getFieldPlaceholder(t, rule.field)}
                            className="h-9 rounded-xl px-3 text-sm"
                          />
                        </label>
                      ) : (
                        <div className="space-y-1">
                          <SearchableMultiSelect
                            hideSelectedValues
                            title={getFieldTitle(t, rule.field)}
                            values={optionValues}
                            selectedValues={rule.values}
                            onToggle={(value) =>
                              updateRule(group.id, rule.id, (current) => ({
                                ...current,
                                values: current.values.includes(value)
                                  ? current.values.filter((currentValue) => currentValue !== value)
                                  : [...current.values, value],
                              }))}
                            onSetAll={(values) =>
                              updateRule(group.id, rule.id, (current) => ({ ...current, values }))}
                            placeholder={getFieldPlaceholder(t, rule.field)}
                            emptyLabel={getFieldEmptyLabel(t, rule.field)}
                          />
                        </div>
                      )}
                    </div>

                    {rule.field !== "title" ? (
                      <div className="border-border bg-background/40 mt-3 flex min-h-12 w-full flex-wrap items-center gap-1.5 rounded-xl border px-4 py-2">
                        {rule.values.length > 0 ? (
                          rule.values.map((value) => (
                            <button
                              type="button"
                              key={`${rule.id}:selected:${value}`}
                              onClick={() =>
                                updateRule(group.id, rule.id, (current) => ({
                                  ...current,
                                  values: current.values.filter((currentValue) => currentValue !== value),
                                }))}
                              className="bg-menu-hover-bg text-foreground inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs"
                            >
                              <span>{formatRuleValueLabel(value)}</span>
                              <LuX className="h-3 w-3" />
                            </button>
                          ))
                        ) : (
                          <span className="text-text-secondary text-xs">
                            {getFieldEmptyLabel(t, rule.field)}
                          </span>
                        )}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>

            <div className="mt-3">
              <button
                type="button"
                onClick={() =>
                  updateGroup(group.id, (current) => ({
                    ...current,
                    rules: [...current.rules, createEmptyRule(current.rules[current.rules.length - 1]?.field ?? "subject")],
                  }))}
                className="text-text-secondary hover:text-foreground hover:bg-menu-hover-bg rounded-lg px-2 py-1 text-xs transition-colors"
              >
                {t("filters.metadata.addRule")}
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
