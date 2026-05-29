// list-views.jsx — Resource list views with search & filters
// Each list renders a sticky-header table that opens a detail view on row click.

const { useState: useLState, useMemo: useLMemo } = React;
const { SearchBar, MultiSelectDropdown, SingleSelectDropdown, ToggleFilter, TabFilter, ResultCounter, ClearFiltersButton } = window.ListFilters;

function StatusBadge({ status }) {
  const variant =
    status === "掲載中" ? "green" :
    status === "非公開" ? "muted" :
    status === "下書き" ? "blue" : "muted";
  return (
    <span className={`badge ${variant}`}>
      <span className="dot" />
      {status}
    </span>
  );
}

function StatusSummary({ counts }) {
  return (
    <div className="list-summary">
      <div className="summary-item">
        <span className="dot green" />
        <span className="label">掲載中</span>
        <strong>{counts["掲載中"] ?? 0}</strong>
        <span className="unit">件</span>
      </div>
      <div className="summary-item">
        <span className="dot muted" />
        <span className="label">非公開</span>
        <strong>{counts["非公開"] ?? 0}</strong>
        <span className="unit">件</span>
      </div>
      <div className="summary-item">
        <span className="dot blue" />
        <span className="label">下書き</span>
        <strong>{counts["下書き"] ?? 0}</strong>
        <span className="unit">件</span>
      </div>
    </div>
  );
}

function ListHeader({ title, desc, onCreate, createLabel, counter, clearButton }) {
  return (
    <div className="list-header">
      <div>
        <h1>{title}</h1>
        <p className="list-desc">{desc}</p>
        <div className="list-meta-row">
          {counter}
          {clearButton}
        </div>
      </div>
      <div className="flex-row" style={{gap:10,alignSelf:'flex-start'}}>
        <button className="btn primary" onClick={onCreate}>＋ {createLabel}</button>
      </div>
    </div>
  );
}

// ── TourOption List ──────────────────────────────────────────────

const PRICE_RANGES = [
  { label: "〜¥5,000", min: 0, max: 5000 },
  { label: "¥5,001〜¥10,000", min: 5001, max: 10000 },
  { label: "¥10,001〜¥20,000", min: 10001, max: 20000 },
  { label: "¥20,001〜", min: 20001, max: Infinity },
];

function TourOptionList({ rows, onOpen, onCreate }) {
  const [search, setSearch] = useLState("");
  const [statuses, setStatuses] = useLState([]);
  const [priceRange, setPriceRange] = useLState("すべて");
  const [tags, setTags] = useLState([]);
  const [uncheckedOnly, setUncheckedOnly] = useLState(false);

  const allTags = useLMemo(() => {
    const s = new Set();
    rows.forEach(r => (r.tags || []).forEach(t => s.add(t)));
    return Array.from(s);
  }, [rows]);

  const filtered = useLMemo(() => {
    const s = search.trim().toLowerCase();
    const pr = PRICE_RANGES.find(p => p.label === priceRange);
    return rows.filter(r => {
      if (s) {
        const hay = `${r.name} ${r.theme || ""} ${r.code}`.toLowerCase();
        if (!hay.includes(s)) return false;
      }
      if (statuses.length && !statuses.includes(r.salesStatus)) return false;
      if (pr) {
        if (r.priceValue < pr.min || r.priceValue > pr.max) return false;
      }
      if (tags.length) {
        if (!tags.some(t => (r.tags || []).includes(t))) return false;
      }
      if (uncheckedOnly && r.checksPassed) return false;
      return true;
    });
  }, [rows, search, statuses, priceRange, tags, uncheckedOnly]);

  const counts = filtered.reduce((acc, r) => {
    acc[r.salesStatus] = (acc[r.salesStatus] ?? 0) + 1;
    return acc;
  }, {});

  const hasFilter = !!search || statuses.length > 0 || priceRange !== "すべて" || tags.length > 0 || uncheckedOnly;
  const clearAll = () => {
    setSearch(""); setStatuses([]); setPriceRange("すべて"); setTags([]); setUncheckedOnly(false);
  };

  return (
    <div className="list-view">
      <ListHeader
        title="TourOption 一覧"
        desc="ツアーの実体となるTourOptionを管理します。"
        onCreate={onCreate}
        createLabel="新規作成"
        counter={<ResultCounter total={rows.length} shown={filtered.length} hasFilter={hasFilter} />}
        clearButton={<ClearFiltersButton show={hasFilter} onClick={clearAll} />}
      />

      <div className="list-filters">
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="TourOption名・テーマ・コードで検索..."
        />
        <div className="lf-controls">
          <MultiSelectDropdown
            label="販売ステータス"
            options={["掲載中", "非公開", "下書き"]}
            values={statuses}
            onChange={setStatuses}
          />
          <SingleSelectDropdown
            label="価格帯"
            options={PRICE_RANGES.map(r => r.label)}
            value={priceRange}
            onChange={setPriceRange}
          />
          <MultiSelectDropdown
            label="タグ"
            options={allTags}
            values={tags}
            onChange={setTags}
          />
          <ToggleFilter
            label="未通過のみ"
            value={uncheckedOnly}
            onChange={setUncheckedOnly}
          />
        </div>
      </div>

      <StatusSummary counts={counts} />
      <div className="list-table-wrap">
        <div className="table-scroll">
          <table className="list-table">
            <thead>
              <tr>
                <th style={{width:170}}>TourOptionコード</th>
                <th>TourOption名</th>
                <th style={{width:160}}>タグ</th>
                <th style={{width:130}}>販売ステータス</th>
                <th className="num" style={{width:130}}>基準販売価格</th>
                <th style={{width:120}}>最終更新</th>
                <th className="actions" style={{width:90}}>アクション</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan="7" className="list-empty">該当するTourOptionがありません</td></tr>
              )}
              {filtered.map(r => (
                <tr key={r.id} onClick={() => onOpen(r)} className="list-row">
                  <td><span className="code-mono" style={{fontSize:12,fontWeight:600}}>{r.code}</span></td>
                  <td>
                    <strong>{r.name}</strong>
                    <div className="row-sub">{r.theme}</div>
                  </td>
                  <td>
                    <div className="tag-pile">
                      {(r.tags || []).map(t => <span key={t} className="tag-chip">{t}</span>)}
                    </div>
                  </td>
                  <td><StatusBadge status={r.salesStatus} /></td>
                  <td className="num"><strong>{r.price}</strong></td>
                  <td><span className="muted tiny">{r.updatedAt}</span></td>
                  <td className="actions" onClick={e => e.stopPropagation()}>
                    <button className="btn sm" onClick={() => onOpen(r)}>編集</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── ProductPage List ─────────────────────────────────────────────

function ProductPageList({ rows, onOpen, onCreate }) {
  const [search, setSearch] = useLState("");
  const [statuses, setStatuses] = useLState([]);
  const [unlinkedOnly, setUnlinkedOnly] = useLState(false);
  const [noSellableOnly, setNoSellableOnly] = useLState(false);

  const filtered = useLMemo(() => {
    const s = search.trim().toLowerCase();
    return rows.filter(r => {
      if (s) {
        const hay = `${r.displayTitle} ${r.url}`.toLowerCase();
        if (!hay.includes(s)) return false;
      }
      if (statuses.length && !statuses.includes(r.status)) return false;
      if (unlinkedOnly && r.linkedTotal > 0) return false;
      if (noSellableOnly && r.linkedSellable > 0) return false;
      return true;
    });
  }, [rows, search, statuses, unlinkedOnly, noSellableOnly]);

  const counts = filtered.reduce((acc, r) => {
    acc[r.status] = (acc[r.status] ?? 0) + 1;
    return acc;
  }, {});

  const hasFilter = !!search || statuses.length > 0 || unlinkedOnly || noSellableOnly;
  const clearAll = () => {
    setSearch(""); setStatuses([]); setUnlinkedOnly(false); setNoSellableOnly(false);
  };

  return (
    <div className="list-view">
      <ListHeader
        title="商品ページ 一覧"
        desc="顧客向けの商品ページを管理します。"
        onCreate={onCreate}
        createLabel="新規作成"
        counter={<ResultCounter total={rows.length} shown={filtered.length} hasFilter={hasFilter} />}
        clearButton={<ClearFiltersButton show={hasFilter} onClick={clearAll} />}
      />

      <div className="list-filters">
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="表示タイトル・URLで検索..."
        />
        <div className="lf-controls">
          <MultiSelectDropdown
            label="掲載ステータス"
            options={["掲載中", "非公開", "下書き"]}
            values={statuses}
            onChange={setStatuses}
          />
          <ToggleFilter
            label="未紐付けのみ"
            value={unlinkedOnly}
            onChange={setUnlinkedOnly}
          />
          <ToggleFilter
            label="販売OFFのみ"
            value={noSellableOnly}
            onChange={setNoSellableOnly}
          />
        </div>
      </div>

      <StatusSummary counts={counts} />
      <div className="list-table-wrap">
        <div className="table-scroll">
          <table className="list-table">
            <thead>
              <tr>
                <th style={{width:280}}>URL</th>
                <th>表示タイトル</th>
                <th style={{width:130}}>掲載ステータス</th>
                <th className="num" style={{width:160}}>掲載TourOption数</th>
                <th className="actions" style={{width:90}}>アクション</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan="5" className="list-empty">該当する商品ページがありません</td></tr>
              )}
              {filtered.map(r => (
                <tr key={r.id} onClick={() => onOpen(r)} className="list-row">
                  <td><span className="code-mono" style={{fontSize:12,fontWeight:600}}>{r.url}</span></td>
                  <td>
                    <strong>{r.displayTitle}</strong>
                    <div className="row-sub code-mono">{r.id}</div>
                  </td>
                  <td><StatusBadge status={r.status} /></td>
                  <td className="num">
                    <strong>{r.linkedVisible}</strong>
                    <span className="muted"> / {r.linkedTotal}</span>
                    <div className="row-sub tiny">表示中 / 全体</div>
                  </td>
                  <td className="actions" onClick={e => e.stopPropagation()}>
                    <button className="btn sm" onClick={() => onOpen(r)}>編集</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── GuideDoc List ────────────────────────────────────────────────

function GuideDocList({ rows, onOpen, onCreate }) {
  const [search, setSearch] = useLState("");
  const [scope, setScope] = useLState("すべて");
  const [docTypes, setDocTypes] = useLState([]);
  const [unassignedOnly, setUnassignedOnly] = useLState(false);

  const allDocTypes = useLMemo(() => {
    const s = new Set();
    rows.forEach(r => r.docType && s.add(r.docType));
    return Array.from(s);
  }, [rows]);

  const filtered = useLMemo(() => {
    const s = search.trim().toLowerCase();
    return rows.filter(r => {
      if (s) {
        if (!r.name.toLowerCase().includes(s)) return false;
      }
      if (scope !== "すべて" && r.scope !== scope) return false;
      if (docTypes.length && !docTypes.includes(r.docType)) return false;
      if (unassignedOnly && r.assignedTo.length > 0) return false;
      return true;
    });
  }, [rows, search, scope, docTypes, unassignedOnly]);

  const hasFilter = !!search || scope !== "すべて" || docTypes.length > 0 || unassignedOnly;
  const clearAll = () => {
    setSearch(""); setScope("すべて"); setDocTypes([]); setUnassignedOnly(false);
  };

  return (
    <div className="list-view">
      <ListHeader
        title="ガイド向け資料 一覧"
        desc="ガイドが参照する資料（観光情報・運営注意・行程など）を管理します。"
        onCreate={onCreate}
        createLabel="新規作成"
        counter={<ResultCounter total={rows.length} shown={filtered.length} hasFilter={hasFilter} />}
        clearButton={<ClearFiltersButton show={hasFilter} onClick={clearAll} />}
      />

      <div className="list-scope-row">
        <span className="lf-scope-label">スコープ</span>
        <TabFilter
          options={["すべて", "共通", "個別"]}
          value={scope}
          onChange={setScope}
        />
      </div>

      <div className="list-filters">
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="資料名で検索..."
        />
        <div className="lf-controls">
          <MultiSelectDropdown
            label="資料種別"
            options={allDocTypes}
            values={docTypes}
            onChange={setDocTypes}
          />
          <ToggleFilter
            label="未割り当てのみ"
            value={unassignedOnly}
            onChange={setUnassignedOnly}
          />
        </div>
      </div>

      <div className="list-table-wrap">
        <div className="table-scroll">
          <table className="list-table">
            <thead>
              <tr>
                <th>資料名</th>
                <th style={{width:90}}>スコープ</th>
                <th style={{width:140}}>資料種別</th>
                <th className="num" style={{width:200}}>割り当てTourOption数</th>
                <th className="actions" style={{width:90}}>アクション</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan="5" className="list-empty">該当する資料がありません</td></tr>
              )}
              {filtered.map(r => (
                <tr key={r.id} onClick={() => onOpen(r)} className="list-row">
                  <td>
                    <strong>{r.name}</strong>
                    <div className="row-sub code-mono">{r.id}</div>
                  </td>
                  <td>
                    <span className={`badge ${r.scope === "共通" ? "teal" : "blue"}`}>
                      {r.scope}
                    </span>
                  </td>
                  <td>{r.docType}</td>
                  <td className="num">
                    <strong>{r.assignedTo.length}</strong>
                    <span className="muted"> 件</span>
                  </td>
                  <td className="actions" onClick={e => e.stopPropagation()}>
                    <button className="btn sm" onClick={() => onOpen(r)}>編集</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── Cancel Policy Template List ──────────────────────────────────

function CancelTemplateList({ rows, onOpen, onCreate }) {
  const [search, setSearch] = useLState("");
  const [lang, setLang] = useLState("すべて");
  const [enabledOnly, setEnabledOnly] = useLState(false);

  const filtered = useLMemo(() => {
    const s = search.trim().toLowerCase();
    return rows.filter(r => {
      if (s && !`${r.name} ${r.body}`.toLowerCase().includes(s)) return false;
      if (lang !== "すべて" && r.lang !== lang) return false;
      if (enabledOnly && !r.enabled) return false;
      return true;
    });
  }, [rows, search, lang, enabledOnly]);

  const hasFilter = !!search || lang !== "すべて" || enabledOnly;
  const clearAll = () => { setSearch(""); setLang("すべて"); setEnabledOnly(false); };

  return (
    <div className="list-view">
      <ListHeader
        title="キャンセルポリシー文言テンプレート 一覧"
        desc="OTA掲載やゲスト通知に使う定型文を管理します。変数を埋め込むとTourOptionの設定値に置き換わります。"
        onCreate={onCreate}
        createLabel="新規作成"
        counter={<ResultCounter total={rows.length} shown={filtered.length} hasFilter={hasFilter} />}
        clearButton={<ClearFiltersButton show={hasFilter} onClick={clearAll} />}
      />

      <div className="list-scope-row">
        <span className="lf-scope-label">言語</span>
        <TabFilter
          options={["すべて", "日本語", "English"]}
          value={lang}
          onChange={setLang}
        />
      </div>

      <div className="list-filters">
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="テンプレート名・本文で検索..."
        />
        <div className="lf-controls">
          <ToggleFilter
            label="有効のみ"
            value={enabledOnly}
            onChange={setEnabledOnly}
          />
        </div>
      </div>

      <div className="list-table-wrap">
        <div className="table-scroll">
          <table className="list-table">
            <thead>
              <tr>
                <th>テンプレート名</th>
                <th style={{width:110}}>言語</th>
                <th style={{width:110}}>有効/無効</th>
                <th style={{width:130}}>更新日</th>
                <th className="actions" style={{width:90}}>アクション</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan="5" className="list-empty">該当するテンプレートがありません</td></tr>
              )}
              {filtered.map(r => (
                <tr key={r.id} onClick={() => onOpen(r)} className="list-row">
                  <td>
                    <strong>{r.name}</strong>
                    <div className="row-sub code-mono">{r.id}</div>
                  </td>
                  <td>
                    <span className={`badge ${r.lang === "日本語" ? "blue" : "outline"}`}>{r.lang}</span>
                  </td>
                  <td>
                    {r.enabled
                      ? <span className="badge teal"><span className="dot"/>有効</span>
                      : <span className="badge muted"><span className="dot"/>無効</span>}
                  </td>
                  <td className="muted" style={{fontVariantNumeric:'tabular-nums'}}>{r.updatedAt || "—"}</td>
                  <td className="actions" onClick={e => e.stopPropagation()}>
                    <button className="btn sm" onClick={() => onOpen(r)}>編集</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

window.ListViews = { TourOptionList, ProductPageList, GuideDocList, CancelTemplateList };
