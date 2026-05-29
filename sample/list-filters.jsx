// list-filters.jsx — Reusable filter primitives for list views
// Components: SearchBar, MultiSelectDropdown, SingleSelectDropdown,
// ToggleFilter, TabFilter, ResultCounter, ClearFiltersButton

const { useState: useFState, useRef: useFRef, useEffect: useFEffect } = React;

// ── SearchBar ────────────────────────────────────────────────────
function SearchBar({ value, onChange, placeholder }) {
  return (
    <div className="lf-search">
      <span className="lf-search-ico" aria-hidden="true">⌕</span>
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
      />
      {value && (
        <button className="lf-search-clear" onClick={() => onChange("")} aria-label="クリア">×</button>
      )}
    </div>
  );
}

// ── Hook: click-outside ──────────────────────────────────────────
function useClickOutside(ref, onOutside) {
  useFEffect(() => {
    function handle(e) {
      if (ref.current && !ref.current.contains(e.target)) onOutside();
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [ref, onOutside]);
}

// ── MultiSelectDropdown ──────────────────────────────────────────
function MultiSelectDropdown({ label, options, values, onChange }) {
  const [open, setOpen] = useFState(false);
  const ref = useFRef(null);
  useClickOutside(ref, () => setOpen(false));

  const toggle = (v) => {
    if (values.includes(v)) onChange(values.filter(x => x !== v));
    else onChange([...values, v]);
  };

  const active = values.length > 0;

  return (
    <div className={`lf-dropdown ${active ? "is-active" : ""}`} ref={ref}>
      <button type="button" className="lf-dropdown-btn" onClick={() => setOpen(o => !o)}>
        <span className="lf-dropdown-label">{label}</span>
        {active && <span className="lf-dropdown-count">×{values.length}</span>}
        <span className="lf-caret">▾</span>
      </button>
      {open && (
        <div className="lf-dropdown-menu">
          {options.map(opt => {
            const checked = values.includes(opt);
            return (
              <label key={opt} className="lf-dropdown-item">
                <input type="checkbox" checked={checked} onChange={() => toggle(opt)} />
                <span>{opt}</span>
              </label>
            );
          })}
          {active && (
            <div className="lf-dropdown-foot">
              <button type="button" className="lf-link" onClick={() => onChange([])}>選択をクリア</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── SingleSelectDropdown ─────────────────────────────────────────
function SingleSelectDropdown({ label, options, value, onChange, allLabel = "すべて" }) {
  const [open, setOpen] = useFState(false);
  const ref = useFRef(null);
  useClickOutside(ref, () => setOpen(false));

  const active = value && value !== allLabel;
  const selectedLabel = active ? value : null;

  return (
    <div className={`lf-dropdown ${active ? "is-active" : ""}`} ref={ref}>
      <button type="button" className="lf-dropdown-btn" onClick={() => setOpen(o => !o)}>
        <span className="lf-dropdown-label">{label}</span>
        {active && <span className="lf-dropdown-count">{selectedLabel}</span>}
        <span className="lf-caret">▾</span>
      </button>
      {open && (
        <div className="lf-dropdown-menu">
          <label className="lf-dropdown-item">
            <input
              type="radio"
              name={`single-${label}`}
              checked={!active}
              onChange={() => { onChange(allLabel); setOpen(false); }}
            />
            <span>{allLabel}</span>
          </label>
          {options.map(opt => (
            <label key={opt} className="lf-dropdown-item">
              <input
                type="radio"
                name={`single-${label}`}
                checked={value === opt}
                onChange={() => { onChange(opt); setOpen(false); }}
              />
              <span>{opt}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

// ── ToggleFilter ─────────────────────────────────────────────────
function ToggleFilter({ label, value, onChange }) {
  return (
    <label className={`lf-toggle ${value ? "is-active" : ""}`}>
      <input
        type="checkbox"
        checked={value}
        onChange={e => onChange(e.target.checked)}
      />
      <span className="lf-toggle-track" aria-hidden="true">
        <span className="lf-toggle-thumb" />
      </span>
      <span className="lf-toggle-label">{label}</span>
    </label>
  );
}

// ── TabFilter ────────────────────────────────────────────────────
function TabFilter({ options, value, onChange }) {
  return (
    <div className="lf-tabs" role="tablist">
      {options.map(opt => (
        <button
          key={opt}
          role="tab"
          aria-selected={value === opt}
          className={`lf-tab ${value === opt ? "active" : ""}`}
          onClick={() => onChange(opt)}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}

// ── ResultCounter ────────────────────────────────────────────────
function ResultCounter({ total, shown, hasFilter }) {
  return (
    <span className="lf-counter">
      <strong>{total}</strong>件中
      <strong className={hasFilter ? "is-filtered" : ""}> {shown}</strong>件を表示
    </span>
  );
}

// ── ClearFiltersButton ───────────────────────────────────────────
function ClearFiltersButton({ onClick, show }) {
  if (!show) return null;
  return (
    <button type="button" className="lf-link clear-all" onClick={onClick}>
      フィルターを解除
    </button>
  );
}

window.ListFilters = {
  SearchBar,
  MultiSelectDropdown,
  SingleSelectDropdown,
  ToggleFilter,
  TabFilter,
  ResultCounter,
  ClearFiltersButton,
};
