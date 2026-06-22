// product-page-flow.jsx — 商品ページ「1画面1操作」フロー
// 作成・編集・確認を1つの画面でモード切り替えしていたのをやめ、独立した画面に分離する。
//   A) 一覧        ProductPageFlowList
//   B) 新規作成    PageFormScreen(mode="create")   STEP1〜3（空）／下書き保存・キャンセル
//   C) 詳細確認    PageDetailScreen                読み取り専用／編集する
//   D) 編集        PageFormScreen(mode="edit")     STEP1〜3（データ入り）／保存・キャンセル
//   E) 紐付け追加  LinkAddScreen                   TourOption検索→紐付ける／キャンセル
//   F) 紐付け編集  LinkEditScreen                  表示/販売/順/既定/備考／保存・キャンセル
//
// 紐付けレコードの作成・更新・削除は専用画面で行い、テーブル行内のインライン操作は廃止。

const { useState: usePState, useMemo: usePMemo, useRef: usePRef, useEffect: usePEffect } = React;
const { SearchBar: PSearchBar, MultiSelectDropdown: PMultiSelect, ResultCounter: PCounter, ClearFiltersButton: PClear } = window.ListFilters;
const PB = window.UIBlocks;          // SectionHead, Field, SelectField, TagField, ToggleRow, InfoNote, Icon
const PIcon = window.UIBlocks.Icon;

const PG_LOOKUP = window.SEED.tourOptionsLookup;
const CODE_TO_TOID = (() => {
  const m = {};
  (window.SEED.tourOptionList || []).forEach(r => { m[r.code] = r.id; });
  return m;
})();

// ── helpers ────────────────────────────────────────────────────────────────

function PStatusBadge({ status }) {
  const variant = status === "掲載中" ? "green" : status === "非公開" ? "muted" : status === "下書き" ? "blue" : "muted";
  return <span className={`badge ${variant}`}><span className="dot" />{status}</span>;
}

function blankPage() {
  return {
    id: "PG-自動採番", url: "", name: "", pageType: "通常商品ページ", category: "",
    displayTitle: "", subtitle: "", template: "標準商品ページ", optionLayout: "標準リスト型",
    status: "下書き", lead: "", overview: "", points: "", audience: "", cautions: "",
    includedNote: "", excludedNote: "",
  };
}

function buildInitial() {
  const pages = {}, links = {};
  const main = window.SEED.productPage;
  pages[main.id] = { ...main };
  links[main.id] = (window.SEED.linkedOptions || []).map(l => ({ ...l }));
  (window.SEED.productPageList || []).forEach(r => {
    if (!pages[r.id]) {
      pages[r.id] = {
        ...blankPage(), id: r.id, url: r.url, name: r.displayTitle, displayTitle: r.displayTitle, status: r.status,
      };
      links[r.id] = [];
    }
  });
  return { pages, links };
}

// ── STEP1 / STEP2 field groups (shared by form + detail) ─────────────────────

function PageBasicFields({ page, update, readonly, isCreate }) {
  const { Field, SelectField } = PB;
  return (
    <div className="field-grid">
      <Field label="商品ページID" value={isCreate ? "PG-自動採番" : page.id} readOnly mono help={isCreate ? "保存時に発番" : null} />
      <Field label="URL" required value={(page.url || "").replace(/^\/tours\//, "")}
        onChange={x => update({ url: `/tours/${x.replace(/^\//, "")}` })}
        affixLeft="/tours/" placeholder="kyoto-night-food" readOnly={readonly} mono />
      <Field label="商品ページ名（内部）" required value={page.name} onChange={x => update({ name: x })} wide readOnly={readonly} />
      <SelectField label="ページ種別" value={page.pageType} onChange={x => update({ pageType: x })} options={["通常商品ページ", "キャンペーンLP", "特集ページ", "その他"]} readOnly={readonly} />
      <Field label="表示カテゴリ" value={page.category} onChange={x => update({ category: x })} readOnly={readonly} />
      <Field label="商品ページ表示タイトル" required value={page.displayTitle} onChange={x => update({ displayTitle: x })} wide readOnly={readonly} maxLen={50} />
      <Field label="サブタイトル" value={page.subtitle} onChange={x => update({ subtitle: x })} wide readOnly={readonly} maxLen={80} />
      <SelectField label="テンプレート種別" value={page.template} onChange={x => update({ template: x })} options={["標準商品ページ", "LP型", "特集型"]} readOnly={readonly} />
      <SelectField label="オプション表示方式" value={page.optionLayout} onChange={x => update({ optionLayout: x })} options={["標準リスト型", "カード型", "コンパクト型"]} readOnly={readonly} />
      <SelectField label="掲載ステータス" value={page.status} onChange={x => update({ status: x })} options={["下書き", "掲載中", "非公開"]} readOnly={readonly} />
    </div>
  );
}

function PageContentFields({ page, update, readonly }) {
  const { Field } = PB;
  return (
    <div className="field-grid">
      <Field label="共通紹介文 / リード文" required value={page.lead} onChange={x => update({ lead: x })} wide multiline readOnly={readonly} maxLen={150} />
      <Field label="共通の体験概要" value={page.overview} onChange={x => update({ overview: x })} wide multiline readOnly={readonly} />
      <Field label="共通のおすすめポイント" value={page.points} onChange={x => update({ points: x })} wide multiline readOnly={readonly} />
      <Field label="対象顧客" value={page.audience} onChange={x => update({ audience: x })} wide multiline readOnly={readonly} />
      <Field label="共通の注意事項" value={page.cautions} onChange={x => update({ cautions: x })} wide multiline readOnly={readonly} />
      <Field label="共通の含まれるもの補足" value={page.includedNote} onChange={x => update({ includedNote: x })} readOnly={readonly} />
      <Field label="共通の含まれないもの補足" value={page.excludedNote} onChange={x => update({ excludedNote: x })} readOnly={readonly} />
    </div>
  );
}

// ── STEP3 — 掲載TourOption（行内スイッチ廃止・行ごとに「設定を編集」） ─────────

function LinkSection({ links, onAddLink, onEditLink }) {
  const { SectionHead, InfoNote } = PB;
  return (
    <div className="form-section" style={{ gap: "var(--sp-4)" }}>
      <SectionHead
        eyebrow="STEP 3"
        title="掲載TourOption"
        desc="商品ページ上での表示順・表示可否・販売可否を管理します。表示内容はTourOption側から参照します。"
        action={<button className="btn primary" onClick={onAddLink}>＋ TourOptionを追加</button>}
      />
      <InfoNote>
        <strong>1画面1操作：</strong>表示・販売・表示順などの設定は行の「設定を編集」から専用画面で行います。新しい紐付けは「TourOptionを追加」から作成します。
      </InfoNote>

      {links.length === 0 ? (
        <div className="empty-state">
          <strong>紐付けられたTourOptionがありません</strong>
          <span>「＋ TourOptionを追加」から、この商品ページで掲載するTourOptionを選択してください。</span>
        </div>
      ) : (
        <div className="table-wrap">
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th className="num" style={{ width: 44 }}>順</th>
                  <th className="center" style={{ width: 56 }}>既定</th>
                  <th className="center" style={{ width: 74 }}>表示</th>
                  <th className="center" style={{ width: 84 }}>販売</th>
                  <th>TourOption</th>
                  <th>選択表示名（TO参照）</th>
                  <th className="num" style={{ width: 90 }}>価格</th>
                  <th className="actions" style={{ width: 110 }}>操作</th>
                </tr>
              </thead>
              <tbody>
                {links.slice().sort((a, b) => a.order - b.order).map(link => {
                  const info = PG_LOOKUP[link.code] ?? {};
                  return (
                    <tr key={link.id} style={{ cursor: "default" }}>
                      <td className="num">{link.order}</td>
                      <td className="center">{link.default ? <span className="badge teal" style={{ padding: "1px 6px" }}>既定</span> : <span className="muted tiny">—</span>}</td>
                      <td className="center">
                        {link.visible ? <span className="badge teal">表示</span> : <span className="badge muted">非表示</span>}
                      </td>
                      <td className="center">
                        {link.sellable ? <span className="badge green"><span className="dot" />販売</span> : <span className="badge muted"><span className="dot" />停止</span>}
                      </td>
                      <td>
                        <div className="code-mono" style={{ fontSize: 12, fontWeight: 600 }}>{link.code}</div>
                        <div className="row-sub code-mono">{link.tourOptionId}</div>
                      </td>
                      <td>
                        <strong>{info.selectionName ?? "—"}</strong>
                        <div className="row-sub">{info.duration ? `${info.duration} · ${info.capacity}` : (link.note || "")}</div>
                      </td>
                      <td className="num"><strong>{info.price ?? "—"}</strong></td>
                      <td className="actions">
                        <button className="btn sm" onClick={() => onEditLink(link.id)}>設定を編集</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ── customer preview pane wrapper ────────────────────────────────────────────

function PreviewPane({ page, links, selectedLinkId, selectLink, badge }) {
  return (
    <aside className="preview-pane">
      <div className="preview-header">
        <div>
          <p className="eyebrow">Live Preview</p>
          <h2>商品ページ表示</h2>
        </div>
        <span className="preview-badge"><span className="dot" />{badge}</span>
      </div>
      <div style={{ padding: 0 }}>
        {window.ProductPagePreview({ page, links, lookup: PG_LOOKUP, selectedLinkId, selectLink, tourOption: window.SEED.tourOption })}
      </div>
    </aside>
  );
}

// ── A) 一覧 ───────────────────────────────────────────────────────────────

function ProductPageFlowList({ rows, onCreate, onView, onEdit }) {
  const [search, setSearch] = usePState("");
  const [statuses, setStatuses] = usePState([]);

  const filtered = usePMemo(() => {
    const s = search.trim().toLowerCase();
    return rows.filter(r => {
      if (s && !`${r.displayTitle} ${r.url}`.toLowerCase().includes(s)) return false;
      if (statuses.length && !statuses.includes(r.status)) return false;
      return true;
    });
  }, [rows, search, statuses]);

  const counts = filtered.reduce((a, r) => { a[r.status] = (a[r.status] ?? 0) + 1; return a; }, {});
  const hasFilter = !!search || statuses.length > 0;
  const clearAll = () => { setSearch(""); setStatuses([]); };

  return (
    <div className="list-shell" data-screen-label="商品ページ一覧">
      <div className="topbar list-topbar">
        <div>
          <div className="crumbs"><span>deep_Admin</span><span className="sep">/</span><span className="current">商品ページ</span></div>
        </div>
      </div>

      <div className="list-view">
        <div className="list-header">
          <div>
            <h1>商品ページ 一覧</h1>
            <p className="list-desc">顧客向けの商品ページを管理します。行から詳細確認・編集に進みます。</p>
            <div className="list-meta-row">
              <PCounter total={rows.length} shown={filtered.length} hasFilter={hasFilter} />
              <PClear show={hasFilter} onClick={clearAll} />
            </div>
          </div>
          <div className="flex-row" style={{ gap: 10, alignSelf: "flex-start" }}>
            <button className="btn primary" onClick={onCreate}>＋ 新規作成</button>
          </div>
        </div>

        <div className="list-filters">
          <PSearchBar value={search} onChange={setSearch} placeholder="表示タイトル・URLで検索..." />
          <div className="lf-controls">
            <PMultiSelect label="掲載ステータス" options={["掲載中", "非公開", "下書き"]} values={statuses} onChange={setStatuses} />
          </div>
        </div>

        <div className="list-summary">
          {[["掲載中", "green"], ["非公開", "muted"], ["下書き", "blue"]].map(([k, c]) => (
            <div className="summary-item" key={k}>
              <span className={`dot ${c}`} /><span className="label">{k}</span>
              <strong>{counts[k] ?? 0}</strong><span className="unit">件</span>
            </div>
          ))}
        </div>

        <div className="list-table-wrap">
          <div className="table-scroll">
            <table className="list-table">
              <thead>
                <tr>
                  <th style={{ width: 260 }}>URL</th>
                  <th>表示タイトル</th>
                  <th style={{ width: 120 }}>掲載ステータス</th>
                  <th className="num" style={{ width: 150 }}>掲載TourOption数</th>
                  <th className="actions" style={{ width: 196 }}>アクション</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && <tr><td colSpan="5" className="list-empty">該当する商品ページがありません</td></tr>}
                {filtered.map(r => (
                  <tr key={r.id} className="list-row" onClick={() => onView(r.id)}>
                    <td><span className="code-mono" style={{ fontSize: 12, fontWeight: 600 }}>{r.url || "—"}</span></td>
                    <td>
                      <strong>{r.displayTitle || "（無題）"}</strong>
                      <div className="row-sub code-mono">{r.id}</div>
                    </td>
                    <td><PStatusBadge status={r.status} /></td>
                    <td className="num">
                      <strong>{r.linkedVisible}</strong><span className="muted"> / {r.linkedTotal}</span>
                      <div className="row-sub tiny">表示中 / 全体</div>
                    </td>
                    <td className="actions" onClick={e => e.stopPropagation()}>
                      <div style={{ display: "inline-flex", gap: 6, justifyContent: "flex-end" }}>
                        <button className="btn sm" onClick={() => onView(r.id)}>詳細を見る</button>
                        <button className="btn sm primary" onClick={() => onEdit(r.id)}>編集</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── B) 新規作成 / D) 編集 — 共通フォーム ──────────────────────────────────────

const FORM_TABS = [["pageBasic", "ページ基本"], ["pageContent", "共通コンテンツ"], ["links", "掲載TourOption"]];

function PageFormScreen({ mode, page, links, update, tab, setTab, onAddLink, onEditLink, onSave, onCancel, selPreview, setSelPreview }) {
  const isCreate = mode === "create";
  const title = isCreate ? "商品ページ 新規作成" : "商品ページ 編集";
  const crumbTail = isCreate ? "新規作成" : "編集";
  return (
    <React.Fragment>
      <div className="topbar" data-screen-label={isCreate ? "商品ページ新規作成" : "商品ページ編集"}>
        <div>
          <div className="crumbs">
            <span>deep_Admin</span><span className="sep">/</span>
            <a className="crumb-link" onClick={onCancel}>商品ページ</a><span className="sep">/</span>
            {!isCreate && <><span>{page.displayTitle || page.id}</span><span className="sep">/</span></>}
            <span className="current">{crumbTail}</span>
          </div>
          <div className="title-row">
            <button className="btn ghost sm back-btn" onClick={onCancel}>← キャンセル</button>
            <h1>{title}</h1>
            <span className={`status-pill ${isCreate ? "blue" : page.status === "掲載中" ? "green" : "muted"}`}>
              <span className="dot" />{isCreate ? "下書き作成中" : "編集中"}
            </span>
          </div>
        </div>
        <div className="flex-row" style={{ gap: 8 }}>
          <button className="btn" onClick={onCancel}>キャンセル</button>
          <button className="btn primary" onClick={onSave}>{isCreate ? "下書き保存" : "保存"}</button>
        </div>
      </div>

      <div className="content-grid" data-no-preview={tab === "links" ? "true" : "false"}>
        <section className="editor-pane">
          <div className="tab-row" role="tablist">
            {FORM_TABS.map(([key, label], i) => (
              <button key={key} className={`tab-button ${tab === key ? "active" : ""}`} onClick={() => setTab(key)}>
                <span style={{ opacity: 0.55, fontVariantNumeric: "tabular-nums", marginRight: 6, fontSize: 11.5 }}>{String(i + 1).padStart(2, "0")}</span>
                {label}
              </button>
            ))}
          </div>
          <div className="editor-content">
            {tab === "pageBasic" && (
              <div className="form-section">
                <PB.SectionHead eyebrow="STEP 1" title="商品ページ基本情報" desc="商品ページ全体の表示・検索・公開状態を管理します。" />
                <PageBasicFields page={page} update={update} readonly={false} isCreate={isCreate} />
              </div>
            )}
            {tab === "pageContent" && (
              <div className="form-section">
                <PB.SectionHead eyebrow="STEP 2" title="共通コンテンツ" desc="ページに紐付くTourOption群に共通する見せ方を管理します。" />
                <PageContentFields page={page} update={update} readonly={false} />
              </div>
            )}
            {tab === "links" && (
              <LinkSection links={links} onAddLink={onAddLink} onEditLink={onEditLink} />
            )}
          </div>
        </section>

        {tab !== "links" && (
          <PreviewPane page={page} links={links} selectedLinkId={selPreview} selectLink={setSelPreview} badge={isCreate ? "作成プレビュー" : "編集プレビュー"} />
        )}
      </div>
    </React.Fragment>
  );
}

// ── C) 詳細確認 ──────────────────────────────────────────────────────────────

function PageDetailScreen({ page, links, onBack, onEdit, onAddLink, onEditLink, selPreview, setSelPreview }) {
  return (
    <React.Fragment>
      <div className="topbar" data-screen-label="商品ページ詳細確認">
        <div>
          <div className="crumbs">
            <span>deep_Admin</span><span className="sep">/</span>
            <a className="crumb-link" onClick={onBack}>商品ページ</a><span className="sep">/</span>
            <span className="current">{page.displayTitle || page.id}</span>
          </div>
          <div className="title-row">
            <button className="btn ghost sm back-btn" onClick={onBack}>← 一覧に戻る</button>
            <h1>{page.displayTitle || "（無題）"}</h1>
            <PStatusBadge status={page.status} />
          </div>
        </div>
        <div className="flex-row" style={{ gap: 8 }}>
          <button className="btn primary" onClick={onEdit}>編集する</button>
        </div>
      </div>

      <div className="status-strip">
        <div className="status-cell id"><span className="status-label">内部ID</span><strong>{page.id}</strong></div>
        <div className="status-cell"><span className="status-label">URL</span><strong className="code-mono" style={{ fontSize: 13 }}>{page.url || "—"}</strong></div>
        <div className="status-cell"><span className="status-label">掲載ステータス</span><strong>{page.status}</strong></div>
        <div className="status-cell"><span className="status-label">掲載TourOption</span><strong>{links.filter(l => l.visible).length} / {links.length} 件表示</strong></div>
        <div className="status-actions">
          <button className="btn primary" onClick={onEdit}>編集する</button>
        </div>
      </div>

      <div className="content-grid">
        <section className="editor-pane">
          <div className="editor-content" style={{ display: "grid", gap: "var(--sp-6)" }}>
            <div className="form-section readonly-mode">
              <PB.SectionHead eyebrow="STEP 1" title="商品ページ基本情報" desc="読み取り専用。変更するには「編集する」を押してください。" />
              <PageBasicFields page={page} update={() => {}} readonly isCreate={false} />
            </div>
            <div className="form-section readonly-mode">
              <PB.SectionHead eyebrow="STEP 2" title="共通コンテンツ" />
              <PageContentFields page={page} update={() => {}} readonly />
            </div>
            <LinkSection links={links} onAddLink={onAddLink} onEditLink={onEditLink} />
          </div>
        </section>

        <PreviewPane page={page} links={links} selectedLinkId={selPreview} selectLink={setSelPreview} badge="掲載プレビュー" />
      </div>
    </React.Fragment>
  );
}

// ── E) TourOption紐付け追加 ──────────────────────────────────────────────────

function LinkAddScreen({ page, existingCodes, onLink, onCancel }) {
  const [search, setSearch] = usePState("");
  const entries = usePMemo(() => {
    const s = search.trim().toLowerCase();
    return Object.entries(PG_LOOKUP).filter(([code, info]) => {
      if (!s) return true;
      return `${code} ${info.selectionName} ${info.shortDescription}`.toLowerCase().includes(s);
    });
  }, [search]);

  return (
    <React.Fragment>
      <div className="topbar" data-screen-label="TourOption紐付け追加">
        <div>
          <div className="crumbs">
            <span>deep_Admin</span><span className="sep">/</span>
            <span>商品ページ</span><span className="sep">/</span>
            <a className="crumb-link" onClick={onCancel}>{page.displayTitle || page.id}</a><span className="sep">/</span>
            <span className="current">TourOptionを追加</span>
          </div>
          <div className="title-row">
            <button className="btn ghost sm back-btn" onClick={onCancel}>← 戻る</button>
            <h1>TourOption紐付け追加</h1>
          </div>
        </div>
        <div className="flex-row" style={{ gap: 8 }}>
          <button className="btn" onClick={onCancel}>キャンセル</button>
        </div>
      </div>

      <div className="list-view">
        <div className="list-header">
          <div>
            <h1 style={{ fontSize: 18 }}>紐付けるTourOptionを選択</h1>
            <p className="list-desc">登録済みのTourOptionから選んで、この商品ページに紐付けます。表示・販売などの詳細は追加後に「設定を編集」で調整できます。</p>
          </div>
        </div>
        <div className="list-filters">
          <PSearchBar value={search} onChange={setSearch} placeholder="コード・選択表示名で検索..." />
        </div>
        <div className="list-table-wrap">
          <div className="table-scroll">
            <table className="list-table">
              <thead>
                <tr>
                  <th style={{ width: 170 }}>コード</th>
                  <th>選択表示名</th>
                  <th className="num" style={{ width: 110 }}>価格</th>
                  <th style={{ width: 90 }}>所要</th>
                  <th className="actions" style={{ width: 150 }}>操作</th>
                </tr>
              </thead>
              <tbody>
                {entries.length === 0 && <tr><td colSpan="5" className="list-empty">該当するTourOptionがありません</td></tr>}
                {entries.map(([code, info]) => {
                  const inUse = existingCodes.includes(code);
                  return (
                    <tr key={code} className="list-row" style={{ cursor: "default" }}>
                      <td><strong className="code-mono" style={{ fontSize: 12 }}>{code}</strong></td>
                      <td>
                        <strong>{info.selectionName}</strong>
                        <div className="row-sub">{info.shortDescription}</div>
                      </td>
                      <td className="num"><strong>{info.price}</strong></td>
                      <td><span className="muted tiny">{info.duration}</span></td>
                      <td className="actions">
                        <button className="btn sm primary" disabled={inUse} title={inUse ? "既に紐付け済み" : "この商品ページに紐付ける"} onClick={() => onLink(code)}>
                          {inUse ? "紐付け済" : "紐付ける"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </React.Fragment>
  );
}

// ── F) 紐付け設定編集 ────────────────────────────────────────────────────────

function LinkEditScreen({ page, link, onSave, onCancel, onRemove }) {
  const { Field, ToggleRow, SectionHead, InfoNote } = PB;
  const info = PG_LOOKUP[link.code] ?? {};
  const [draft, setDraft] = usePState({
    order: link.order, default: !!link.default, visible: !!link.visible, sellable: !!link.sellable, note: link.note || "",
  });
  const set = patch => setDraft(d => ({ ...d, ...patch }));

  return (
    <React.Fragment>
      <div className="topbar" data-screen-label="紐付け設定編集">
        <div>
          <div className="crumbs">
            <span>deep_Admin</span><span className="sep">/</span>
            <span>商品ページ</span><span className="sep">/</span>
            <a className="crumb-link" onClick={onCancel}>{page.displayTitle || page.id}</a><span className="sep">/</span>
            <span className="current">紐付け設定編集</span>
          </div>
          <div className="title-row">
            <button className="btn ghost sm back-btn" onClick={onCancel}>← 戻る</button>
            <h1>紐付け設定編集</h1>
          </div>
        </div>
        <div className="flex-row" style={{ gap: 8 }}>
          <button className="btn" onClick={onCancel}>キャンセル</button>
          <button className="btn primary" onClick={() => onSave(draft)}>保存</button>
        </div>
      </div>

      <div className="content-grid" data-no-preview="true">
        <section className="editor-pane">
          <div className="editor-content">
            <div className="form-section">
              <SectionHead
                title="紐付け設定"
                desc={`「${info.selectionName ?? link.code}」の紐付けレコードを編集します。表示名・説明・価格などの表示内容はTourOption画面で編集します。`}
              />
              <div className="field-grid">
                <Field label="紐付けID" value={link.id} readOnly mono />
                <Field label="TourOptionコード" value={link.code} readOnly mono />
                <Field label="選択表示名（TO参照）" value={info.selectionName ?? "—"} readOnly />
                <Field label="基準価格（TO参照）" value={info.price ?? "—"} readOnly />
                <Field label="表示順" value={draft.order} onChange={x => set({ order: Number(x) || 1 })} type="number" />
                <div className="field" />
                <div className="field-wide">
                  <div className="field-label"><span>表示・販売設定</span></div>
                  <div className="toggle-list" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
                    <ToggleRow checked={draft.default} onChange={v => set({ default: v })} title="既定として表示" desc="初期選択されるOption" />
                    <ToggleRow checked={draft.visible} onChange={v => set({ visible: v })} title="商品ページ上に表示" desc="OFFでも紐付けは保持" />
                    <ToggleRow checked={draft.sellable} onChange={v => set({ sellable: v })} title="商品ページ上で販売" desc="OFF時は閲覧のみ" />
                  </div>
                </div>
                <Field label="備考（紐付け固有）" value={draft.note} onChange={x => set({ note: x })} wide placeholder="この紐付けに関するメモがあれば入力" />
              </div>

              <InfoNote amber icon={<PIcon.alert />}>
                <strong>TourOption自体が非公開の場合、この商品ページの販売設定にかかわらず販売OFFになります。</strong><br />
                表示内容を変更する場合はTourOption画面で編集してください。同じTourOptionを掲載している全商品ページに反映されます。
              </InfoNote>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, borderTop: "1px solid var(--line)", paddingTop: "var(--sp-4)" }}>
                <button className="btn danger" onClick={onRemove}>この紐付けを解除</button>
                <div className="flex-row" style={{ gap: 8 }}>
                  <button className="btn" onClick={onCancel}>キャンセル</button>
                  <button className="btn primary" onClick={() => onSave(draft)}>保存</button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </React.Fragment>
  );
}

// ── Orchestrator ─────────────────────────────────────────────────────────────

function ProductPageFlow({ navSignal }) {
  const init = usePRef(buildInitial()).current;
  const [pages, setPages] = usePState(init.pages);
  const [linksMap, setLinksMap] = usePState(init.links);

  const [view, setView] = usePState("list");      // list | detail | create | edit | linkAdd | linkEdit
  const [currentId, setCurrentId] = usePState(null);
  const [draft, setDraft] = usePState(null);        // {page fields..., links:[]}
  const [formTab, setFormTab] = usePState("pageBasic");
  const [editingLinkId, setEditingLinkId] = usePState(null);
  const [returnView, setReturnView] = usePState("detail");
  const [selPreview, setSelPreview] = usePState(null);

  // Sidebar re-click on 商品ページ → reset to list
  const firstNav = usePRef(true);
  usePEffect(() => {
    if (firstNav.current) { firstNav.current = false; return; }
    setView("list"); setCurrentId(null); setDraft(null);
  }, [navSignal]);

  const listRows = usePMemo(() => Object.values(pages).map(p => {
    const ls = linksMap[p.id] || [];
    return {
      id: p.id, url: p.url, displayTitle: p.displayTitle, status: p.status,
      linkedTotal: ls.length, linkedVisible: ls.filter(l => l.visible).length, linkedSellable: ls.filter(l => l.sellable).length,
    };
  }), [pages, linksMap]);

  // ── navigation ──
  const goList = () => { setView("list"); setSelPreview(null); };
  const openView = (id) => { setCurrentId(id); setSelPreview(null); setView("detail"); };
  const openCreate = () => { setDraft({ ...blankPage(), links: [] }); setFormTab("pageBasic"); setSelPreview(null); setView("create"); };
  const openEdit = (id) => {
    setCurrentId(id);
    setDraft({ ...pages[id], links: (linksMap[id] || []).map(l => ({ ...l })) });
    setFormTab("pageBasic"); setSelPreview(null); setView("edit");
  };
  const cancelForm = () => {
    if (view === "create") goList();
    else openView(currentId);
    setDraft(null);
  };
  const saveCreate = () => {
    const id = `pg_${Date.now().toString(36)}`;
    const { links, ...pageFields } = draft;
    const page = { ...pageFields, id, displayTitle: pageFields.displayTitle || pageFields.name || "（無題）" };
    setPages(m => ({ ...m, [id]: page }));
    setLinksMap(m => ({ ...m, [id]: links }));
    setDraft(null); setCurrentId(id); setSelPreview(null); setView("detail");
  };
  const saveEdit = () => {
    const { links, ...pageFields } = draft;
    setPages(m => ({ ...m, [currentId]: { ...pageFields, id: currentId } }));
    setLinksMap(m => ({ ...m, [currentId]: links }));
    setDraft(null); setSelPreview(null); setView("detail");
  };

  // links context: detail → committed linksMap[currentId]; create/edit → draft.links
  const linkCtxIsDraft = () => returnView === "create" || returnView === "edit";
  const getCtxLinks = () => linkCtxIsDraft() ? (draft?.links || []) : (linksMap[currentId] || []);
  const setCtxLinks = (next) => {
    if (linkCtxIsDraft()) setDraft(d => ({ ...d, links: next }));
    else setLinksMap(m => ({ ...m, [currentId]: next }));
  };

  const openLinkAdd = () => { setReturnView(view); setView("linkAdd"); };
  const openLinkEdit = (linkId) => { setReturnView(view); setEditingLinkId(linkId); setView("linkEdit"); };
  const backFromLink = () => setView(returnView);

  const addLink = (code) => {
    const ls = getCtxLinks();
    if (ls.some(l => l.code === code)) return;
    const newLink = {
      id: `link-${Date.now().toString(36)}`, order: ls.length + 1, default: ls.length === 0,
      visible: true, sellable: false, code, tourOptionId: CODE_TO_TOID[code] || `to_${code}`,
      note: "", salesStatus: "販売OFF",
    };
    setCtxLinks([...ls, newLink]);
    backFromLink();
  };
  const saveLink = (patch) => {
    let ls = getCtxLinks().map(l => l.id === editingLinkId ? {
      ...l, ...patch, salesStatus: patch.sellable ? "販売ON" : "販売OFF",
    } : l);
    if (patch.default) ls = ls.map(l => l.id === editingLinkId ? l : { ...l, default: false }); // single default
    setCtxLinks(ls);
    backFromLink();
  };
  const removeLink = () => {
    setCtxLinks(getCtxLinks().filter(l => l.id !== editingLinkId));
    backFromLink();
  };

  // ── render ──
  if (view === "list") {
    return <ProductPageFlowList rows={listRows} onCreate={openCreate} onView={openView} onEdit={openEdit} />;
  }
  if (view === "create" || view === "edit") {
    const page = draft;
    return (
      <PageFormScreen
        mode={view} page={page} links={page.links}
        update={patch => setDraft(d => ({ ...d, ...patch }))}
        tab={formTab} setTab={setFormTab}
        onAddLink={openLinkAdd} onEditLink={openLinkEdit}
        onSave={view === "create" ? saveCreate : saveEdit} onCancel={cancelForm}
        selPreview={selPreview} setSelPreview={setSelPreview}
      />
    );
  }
  if (view === "detail") {
    const page = pages[currentId];
    const links = linksMap[currentId] || [];
    return (
      <PageDetailScreen
        page={page} links={links} onBack={goList} onEdit={() => openEdit(currentId)}
        onAddLink={openLinkAdd} onEditLink={openLinkEdit}
        selPreview={selPreview} setSelPreview={setSelPreview}
      />
    );
  }
  if (view === "linkAdd") {
    const page = linkCtxIsDraft() ? draft : pages[currentId];
    return <LinkAddScreen page={page} existingCodes={getCtxLinks().map(l => l.code)} onLink={addLink} onCancel={backFromLink} />;
  }
  if (view === "linkEdit") {
    const page = linkCtxIsDraft() ? draft : pages[currentId];
    const link = getCtxLinks().find(l => l.id === editingLinkId);
    if (!link) { backFromLink(); return null; }
    return <LinkEditScreen page={page} link={link} onSave={saveLink} onCancel={backFromLink} onRemove={removeLink} />;
  }
  return null;
}

window.ProductPageFlow = ProductPageFlow;
