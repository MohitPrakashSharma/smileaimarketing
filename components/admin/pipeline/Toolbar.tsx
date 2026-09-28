"use client";

import { COLUMN_KEYS, DEFAULT_COLUMNS, FIELD_KEYS, GROUP_KEYS, PAGE_SIZES, type ColumnKey, type FieldKey, type FilterCondition, type ViewConfig } from "@/lib/pipelineViews";
import { IconFilter, IconSearch, IconTrendingUp, IconLayout, IconGrid, IconClose, IconPlus, IconChevronDown } from "@/components/icons";
import {
  FIELDS,
  GROUP_LABELS,
  OPERATORS_BY_TYPE,
  OPERATOR_LABELS,
  VALUELESS,
  defaultCondition,
  describeCondition,
  isComplete,
} from "@/components/admin/pipeline/fields";
import { COLUMN_LABELS, Popover, fieldControl } from "@/components/admin/pipeline/ui";

type Patch = (patch: Partial<ViewConfig>) => void;

/** Search · Filter · Sort · Group · Columns — every control edits the active view's config. */
export function Toolbar({ config, onChange }: { config: ViewConfig; onChange: Patch }) {
  const activeFilters = config.filters.filter(isComplete).length;
  const groupable = config.type === "table" || config.type === "list";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative w-full sm:w-72">
        <IconSearch className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="search"
          value={config.search}
          onChange={(e) => onChange({ search: e.target.value })}
          placeholder="Search name, city, contact…"
          aria-label="Search leads"
          className="h-10 w-full rounded-full border border-border bg-surface pl-11 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
      </div>

      <Popover label="Filter" icon={<IconFilter className="h-4 w-4" />} badge={activeFilters} active={activeFilters > 0} width="w-[560px]">
        {() => <FilterBuilder config={config} onChange={onChange} />}
      </Popover>

      <Popover label="Sort" icon={<IconTrendingUp className="h-4 w-4" />} width="w-96">
        {() => <SortEditor config={config} onChange={onChange} />}
      </Popover>

      <Popover
        label={groupable && config.groupBy ? `Group: ${GROUP_LABELS[config.groupBy]}` : "Group"}
        icon={<IconGrid className="h-4 w-4" />}
        active={groupable && config.groupBy !== null}
        width="w-64"
      >
        {(close) => (
          <div>
            <p className="text-xs font-semibold text-foreground">Group rows by</p>
            {!groupable && <p className="mt-1 text-[11px] text-muted-foreground">Board always groups by stage. Grouping applies to Table and List.</p>}
            <div className="mt-2 space-y-0.5">
              {[null, ...GROUP_KEYS].map((key) => (
                <button
                  key={key ?? "none"}
                  onClick={() => {
                    onChange({ groupBy: key });
                    close();
                  }}
                  className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm hover:bg-surface-muted ${
                    config.groupBy === key ? "font-semibold text-primary-ink" : "text-foreground"
                  }`}
                >
                  {key ? GROUP_LABELS[key] : "No grouping"}
                  {config.groupBy === key && <span aria-hidden>✓</span>}
                </button>
              ))}
            </div>
          </div>
        )}
      </Popover>

      <Popover label="Columns" icon={<IconLayout className="h-4 w-4" />} width="w-72">
        {() => <ColumnEditor config={config} onChange={onChange} />}
      </Popover>
    </div>
  );
}

/** Active filter chips under the toolbar, each removable. */
export function FilterChips({ config, onChange }: { config: ViewConfig; onChange: Patch }) {
  const active = config.filters.filter(isComplete);
  if (active.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-2">
      {active.map((c, i) => (
        <span key={c.id} className="flex items-center gap-2">
          {i > 0 && <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{config.match === "all" ? "and" : "or"}</span>}
          <span className="inline-flex items-center gap-1.5 rounded-full bg-accent-soft py-1 pl-3 pr-1.5 text-xs font-semibold text-primary-ink">
            {describeCondition(c)}
            <button
              onClick={() => onChange({ filters: config.filters.filter((f) => f.id !== c.id) })}
              aria-label={`Remove filter: ${describeCondition(c)}`}
              className="flex h-5 w-5 items-center justify-center rounded-full hover:bg-primary/15"
            >
              <IconClose className="h-3 w-3" />
            </button>
          </span>
        </span>
      ))}
      <button onClick={() => onChange({ filters: [] })} className="text-xs font-semibold text-muted-foreground underline-offset-2 hover:text-foreground hover:underline">
        Clear all
      </button>
    </div>
  );
}

function FilterBuilder({ config, onChange }: { config: ViewConfig; onChange: Patch }) {
  const update = (id: string, patch: Partial<FilterCondition>) =>
    onChange({ filters: config.filters.map((f) => (f.id === id ? { ...f, ...patch } : f)) });

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-foreground">Filters</p>
        {config.filters.length > 1 && (
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            Match
            <select value={config.match} onChange={(e) => onChange({ match: e.target.value as "all" | "any" })} className={fieldControl}>
              <option value="all">all conditions (AND)</option>
              <option value="any">any condition (OR)</option>
            </select>
          </label>
        )}
      </div>

      {config.filters.length === 0 && <p className="mt-2 text-xs text-muted-foreground">No filters yet — every lead is shown.</p>}

      <ol className="mt-3 space-y-2">
        {config.filters.map((c, i) => {
          const def = FIELDS[c.field];
          return (
            <li key={c.id} className="flex flex-wrap items-center gap-2 rounded-2xl bg-surface-muted/60 p-2">
              <span className="w-9 text-center text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                {i === 0 ? "where" : config.match === "all" ? "and" : "or"}
              </span>
              <select
                value={c.field}
                onChange={(e) => update(c.id, { ...defaultCondition(e.target.value as FieldKey), id: c.id })}
                aria-label="Field"
                className={fieldControl}
              >
                {FIELD_KEYS.map((k) => (
                  <option key={k} value={k}>
                    {FIELDS[k].label}
                  </option>
                ))}
              </select>
              <select
                value={c.op}
                onChange={(e) => {
                  const op = e.target.value as FilterCondition["op"];
                  update(c.id, { op, value: op === "between" ? [0, 100] : c.op === "between" ? undefined : c.value });
                }}
                aria-label="Operator"
                className={fieldControl}
              >
                {OPERATORS_BY_TYPE[def.type].map((op) => (
                  <option key={op} value={op}>
                    {OPERATOR_LABELS[op]}
                  </option>
                ))}
              </select>
              {!VALUELESS.includes(c.op) && <ValueInput condition={c} onChange={(value) => update(c.id, { value })} />}
              <button
                onClick={() => onChange({ filters: config.filters.filter((f) => f.id !== c.id) })}
                aria-label="Remove condition"
                className="ml-auto flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-surface hover:text-foreground"
              >
                <IconClose className="h-4 w-4" />
              </button>
            </li>
          );
        })}
      </ol>

      <div className="mt-3 flex items-center justify-between">
        <button
          onClick={() => onChange({ filters: [...config.filters, defaultCondition("stage")] })}
          className="inline-flex h-9 items-center gap-1.5 rounded-full border border-border px-3 text-xs font-semibold text-foreground hover:bg-surface-muted"
        >
          <IconPlus className="h-3.5 w-3.5" /> Add condition
        </button>
        {config.filters.length > 0 && (
          <button onClick={() => onChange({ filters: [] })} className="text-xs font-semibold text-muted-foreground hover:text-foreground">
            Clear all
          </button>
        )}
      </div>
    </div>
  );
}

function ValueInput({ condition: c, onChange }: { condition: FilterCondition; onChange: (v: FilterCondition["value"]) => void }) {
  const def = FIELDS[c.field];

  if (def.type === "enum") {
    const selected = Array.isArray(c.value) ? (c.value as string[]) : [];
    return (
      <div className="flex max-w-full flex-wrap gap-1">
        {def.options!.map((o) => {
          const on = selected.includes(o.value);
          return (
            <button
              key={o.value}
              type="button"
              aria-pressed={on}
              onClick={() => onChange(on ? selected.filter((v) => v !== o.value) : [...selected, o.value])}
              className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                on ? "bg-background-dark text-white" : "bg-surface text-muted-foreground hover:text-foreground"
              }`}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    );
  }

  if (c.op === "between") {
    const [lo, hi] = Array.isArray(c.value) ? (c.value as [number, number]) : [0, 100];
    return (
      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <input type="number" value={lo} onChange={(e) => onChange([Number(e.target.value), hi])} aria-label="From" className={`${fieldControl} w-20`} />
        and
        <input type="number" value={hi} onChange={(e) => onChange([lo, Number(e.target.value)])} aria-label="To" className={`${fieldControl} w-20`} />
      </span>
    );
  }

  if (def.type === "number" || c.op === "last_days" || c.op === "older_days") {
    return (
      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <input
          type="number"
          value={typeof c.value === "number" ? c.value : ""}
          onChange={(e) => onChange(e.target.value === "" ? undefined : Number(e.target.value))}
          aria-label="Value"
          className={`${fieldControl} w-24`}
        />
        {def.type === "date" ? "days" : def.unit}
      </span>
    );
  }

  if (def.type === "date") {
    return (
      <input
        type="date"
        value={typeof c.value === "string" ? c.value : ""}
        onChange={(e) => onChange(e.target.value)}
        aria-label="Date"
        className={fieldControl}
      />
    );
  }

  return (
    <input
      type="text"
      value={typeof c.value === "string" ? c.value : ""}
      onChange={(e) => onChange(e.target.value)}
      placeholder={def.label === "Country" ? "e.g. CA" : def.label.startsWith("Province") ? "e.g. ON" : "Value"}
      aria-label="Value"
      className={`${fieldControl} w-36`}
    />
  );
}

function SortEditor({ config, onChange }: { config: ViewConfig; onChange: Patch }) {
  const setRule = (i: number, rule: ViewConfig["sort"][number]) => onChange({ sort: config.sort.map((r, j) => (j === i ? rule : r)) });
  return (
    <div>
      <p className="text-sm font-semibold text-foreground">Sort by</p>
      <ol className="mt-3 space-y-2">
        {config.sort.map((rule, i) => (
          <li key={i} className="flex items-center gap-2">
            <span className="w-10 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{i === 0 ? "sort" : "then"}</span>
            <select value={rule.field} onChange={(e) => setRule(i, { ...rule, field: e.target.value as FieldKey })} aria-label="Sort field" className={`${fieldControl} flex-1`}>
              {FIELD_KEYS.filter((k) => FIELDS[k].type !== "bool").map((k) => (
                <option key={k} value={k}>
                  {FIELDS[k].label}
                </option>
              ))}
            </select>
            <button
              onClick={() => setRule(i, { ...rule, dir: rule.dir === "asc" ? "desc" : "asc" })}
              aria-label={`Direction: ${rule.dir === "asc" ? "ascending" : "descending"}`}
              className="inline-flex h-9 items-center gap-1 rounded-full border border-border px-3 text-xs font-semibold text-foreground hover:bg-surface-muted"
            >
              <IconChevronDown className={`h-3.5 w-3.5 ${rule.dir === "asc" ? "rotate-180" : ""}`} />
              {rule.dir === "asc" ? "Asc" : "Desc"}
            </button>
            <button
              onClick={() => onChange({ sort: config.sort.filter((_, j) => j !== i) })}
              aria-label="Remove sort"
              className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-surface-muted hover:text-foreground"
            >
              <IconClose className="h-4 w-4" />
            </button>
          </li>
        ))}
      </ol>
      {config.sort.length < 3 && (
        <button
          onClick={() => onChange({ sort: [...config.sort, { field: "opportunityScore", dir: "desc" }] })}
          className="mt-3 inline-flex h-9 items-center gap-1.5 rounded-full border border-border px-3 text-xs font-semibold text-foreground hover:bg-surface-muted"
        >
          <IconPlus className="h-3.5 w-3.5" /> Add sort
        </button>
      )}
    </div>
  );
}

function ColumnEditor({ config, onChange }: { config: ViewConfig; onChange: Patch }) {
  const visible = config.columns;
  const hidden = COLUMN_KEYS.filter((k) => !visible.includes(k));
  const move = (i: number, d: -1 | 1) => {
    const next = [...visible];
    [next[i], next[i + d]] = [next[i + d], next[i]];
    onChange({ columns: next });
  };
  const toggle = (k: ColumnKey) => onChange({ columns: visible.includes(k) ? visible.filter((c) => c !== k) : [...visible, k] });

  return (
    <div>
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-foreground">Table columns</p>
        <button onClick={() => onChange({ columns: DEFAULT_COLUMNS })} className="text-xs font-semibold text-muted-foreground hover:text-foreground">
          Reset
        </button>
      </div>
      <p className="mt-0.5 text-[11px] text-muted-foreground">Practice is always shown first.</p>
      <ol className="mt-3 space-y-1">
        {visible.map((k, i) => (
          <li key={k} className="flex items-center gap-2 rounded-xl px-2 py-1.5 hover:bg-surface-muted">
            <input type="checkbox" checked onChange={() => toggle(k)} aria-label={`Hide ${COLUMN_LABELS[k]}`} />
            <span className="flex-1 text-sm text-foreground">{COLUMN_LABELS[k]}</span>
            <button onClick={() => move(i, -1)} disabled={i === 0} aria-label={`Move ${COLUMN_LABELS[k]} up`} className="flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground hover:bg-surface disabled:opacity-30">
              <IconChevronDown className="h-3.5 w-3.5 rotate-180" />
            </button>
            <button
              onClick={() => move(i, 1)}
              disabled={i === visible.length - 1}
              aria-label={`Move ${COLUMN_LABELS[k]} down`}
              className="flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground hover:bg-surface disabled:opacity-30"
            >
              <IconChevronDown className="h-3.5 w-3.5" />
            </button>
          </li>
        ))}
      </ol>
      {hidden.length > 0 && (
        <>
          <p className="mt-3 border-t border-border pt-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Hidden</p>
          <ul className="mt-1 space-y-1">
            {hidden.map((k) => (
              <li key={k} className="flex items-center gap-2 rounded-xl px-2 py-1.5 hover:bg-surface-muted">
                <input type="checkbox" checked={false} onChange={() => toggle(k)} aria-label={`Show ${COLUMN_LABELS[k]}`} />
                <span className="text-sm text-muted-foreground">{COLUMN_LABELS[k]}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

export function PageSizeSelect({ config, onChange }: { config: ViewConfig; onChange: Patch }) {
  return (
    <select value={config.pageSize} onChange={(e) => onChange({ pageSize: Number(e.target.value) })} aria-label="Rows per page" className={fieldControl}>
      {PAGE_SIZES.map((n) => (
        <option key={n} value={n}>
          {n} per page
        </option>
      ))}
    </select>
  );
}
