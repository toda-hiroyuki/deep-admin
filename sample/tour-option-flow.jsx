// tour-option-flow.jsx — TourOption「1画面1操作」フロー
// 作成・編集・確認のモード切り替えを廃止し、独立した画面に分離する。
//   A) 一覧        TourOptionFlowList   各行「詳細を見る」「編集」／上部「＋ 新規作成」
//   B) 新規作成    TOFormScreen(create) STEP1〜6（空）／「下書き保存」「キャンセル」
//   C) 詳細確認    TODetailScreen       STEP1〜6タブで読み取り専用表示／「編集する」
//   D) 編集        TOFormScreen(edit)   STEP1〜6（データ入り）／「保存」「キャンセル」
//   E) チャネルURL編集  ChannelEditScreen  チャネル名(表示のみ)・URL・有効/無効・備考
//   F) チャネルURL新規  ChannelAddScreen   チャネル選択・URL・有効/無効・備考
//
// STEP6 のチャネルURLテーブルは行展開インライン編集を廃止し、行の「編集」/「＋新規追加」で別画面へ遷移。

const { useState: useTState, useMemo: useTMemo, useRef: useTRef, useEffect: useTEffect } = React;
const { SearchBar: TSearchBar, MultiSelectDropdown: TMultiSelect, SingleSelectDropdown: TSingleSelect, ToggleFilter: TToggleFilter, ResultCounter: TCounter, ClearFiltersButton: TClear } = window.ListFilters;
const TB = window.UIBlocks;
const TIcon = window.UIBlocks.Icon;

const TO_TABS = window.SEED.tabs.tourOption;                  // [["basic","基本情報"], ... ["channels","チャネル別URL"]]
const CHANNEL_MASTER = window.SEED.channelMaster || [];

// ── helpers ──────────────────────────────────────────────────────────────────

function TStatusBadge({ status }) {
  const variant = status === "掲載中" ? "green" : status === "非公開" ? "muted" : status === "下書き" ? "blue" : "muted";
  return <span className={`badge ${variant}`}><span className="dot" />{status}</span>;
}

function validateTO(t, strict) {
  const v = {};
  if (strict && (!t.code || !/^[A-Z]-[A-Z]{3}-\d{3}-\d-[A-Z]{2}$/i.test(t.code))) {
    v.code = "コード形式が正しくありません（例: G-KYO-003-1-PR）";
  }
  if (!t.name) v.name = "TourOption名は必須です";
  return v;
}

function blankTO() {
  return {
    id: "TO-自動採番", code: "", theme: "", name: "", officialName: "", selectionName: "",
    shortDescription: "", detailDescription: "", tags: [], type: "ガイドツアー", category: "Food & Drink",
    prefecture: "", city: "", area: "", duration: "", minBooking: "1", maxBooking: "8", capacity: "",
    meetingPlace: "", meetingPlaceEn: "", mapUrl: "", pickup: "なし", dropoff: "",
    guestSchedule: "", inclusions: "", exclusions: "", cutoff: "", cancelPolicy: "",
    freeCancelDeadline: "", cancellationFeeRate: 0, nonRefundable: false, nonRefundableNote: "",
    reschedulePolicy: "要相談", exceptionalRefundMemo: "", cancelInternalMemo: "", cancelPolicyTemplateId: "",
    price: "¥0", costCheck: "未確認", guideMemo: "", salesStatus: "下書き",
    tieredPricingEnabled: false, tieredPrices: [],
  };
}

function ownChannelRow() {
  return { id: `ch-own-${Math.random().toString(36).slice(2, 6)}`, channel: "自社サイト", url: "自動取得（商品ページから）", enabled: null, updatedAt: "", auto: true, note: "" };
}

function buildInitialTO() {
  const tos = {}, channels = {};
  const main = window.SEED.tourOption;
  tos[main.id] = { ...main };
  channels[main.id] = (window.SEED.channelUrls || []).map(c => ({ note: "", ...c }));
  (window.SEED.tourOptionList || []).forEach(r => {
    if (!tos[r.id]) {
      tos[r.id] = { ...blankTO(), id: r.id, code: r.code, name: r.name, theme: r.theme, tags: [...(r.tags || [])], salesStatus: r.salesStatus, price: r.price };
      channels[r.id] = [ownChannelRow()];
    }
  });
  return { tos, channels };
}

function ChannelMark({ name }) {
  const map = {
    "Viator": { bg: "#0d6e63", initials: "V" },
    "GetYourGuide": { bg: "#ff5533", initials: "GYG" },
    "Klook": { bg: "#ff5b00", initials: "K" },
    "Airbnb Experiences": { bg: "#ff385c", initials: "A" },
    "Expedia / Activities": { bg: "#003580", initials: "E" },
    "自社サイト": { bg: "var(--ink)", initials: "d." },
  };
  const m = map[name] || { bg: "var(--muted)", initials: (name || "?").slice(0, 1) };
  return (
    <div className="channel-mark">
      <span className="channel-logo" style={{ background: m.bg }}>{m.initials}</span>
      <strong>{name}</strong>
    </div>
  );
}

// ── STEP6 — チャネル別URL（行展開インライン編集を廃止） ───────────────────────

function ChannelsFlowTab({ channels, readonly, onAddChannel, onEditChannel }) {
  const { SectionHead, InfoNote, Icon } = TB;
  return (
    <div className="form-section">
      <SectionHead
        eyebrow="STEP 6"
        title="チャネル別URL"
        desc="各OTA・自社サイトでの掲載URLを管理します。担当ガイドの案件詳細でゲストが見ていたページを表示するために使用されます。"
      />
      <InfoNote>
        URLが未設定のチャネルから予約が入った場合、運営画面にアラートが表示されます。販売を停止したチャネルはレコードを削除してください。
      </InfoNote>

      <div className="section-title" style={{ marginTop: 4 }}>
        <div>
          <h3>チャネル別掲載URL一覧</h3>
          <p style={{ margin: "4px 0 0", color: "var(--muted)", fontSize: 12.5 }}>
            {readonly ? "読み取り専用。変更するには「編集する」を押してください。" : "各行は「編集」から専用画面で編集します。新しいチャネルは「＋ 新規追加」から登録します。"}
          </p>
        </div>
        <div className="flex-row" style={{ gap: 8 }}>
          <span className="badge teal">{channels.length}件</span>
          {!readonly && <button className="btn primary" onClick={onAddChannel}>＋ 新規追加</button>}
        </div>
      </div>

      <div className="table-wrap">
        <div className="table-scroll">
          <table className="channels-table">
            <thead>
              <tr>
                <th style={{ width: 148 }}>チャネル</th>
                <th>掲載URL</th>
                <th className="center" style={{ width: 96 }}>有効/無効</th>
                <th style={{ width: 110 }}>最終更新</th>
                <th className="actions" style={{ width: 96 }}>操作</th>
              </tr>
            </thead>
            <tbody>
              {channels.map(row => {
                const isUnset = !row.url && !row.auto;
                return (
                  <tr key={row.id} className={`${isUnset ? "row-unset" : ""} ${row.auto ? "row-auto" : ""}`} style={{ cursor: "default" }}>
                    <td><ChannelMark name={row.channel} /></td>
                    <td>
                      {row.auto ? (
                        <span className="muted tiny" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                          <Icon.info /> 自動取得（商品ページから）
                        </span>
                      ) : row.url ? (
                        <a href={row.url} onClick={e => e.preventDefault()} className="channel-url-link">
                          <span className="url-text">{row.url}</span><Icon.ext />
                        </a>
                      ) : (
                        <span className="muted tiny">（未設定）</span>
                      )}
                    </td>
                    <td className="center">
                      {row.auto ? <span className="muted tiny">—</span>
                        : row.enabled ? <span className="badge green"><span className="dot" />有効</span>
                          : <span className="badge muted"><span className="dot" />無効</span>}
                    </td>
                    <td className="muted tiny" style={{ fontVariantNumeric: "tabular-nums" }}>{row.updatedAt || "—"}</td>
                    <td className="actions">
                      {row.auto || readonly ? <span className="muted tiny">—</span>
                        : <button className="btn sm" onClick={() => onEditChannel(row.id)}>編集</button>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <span className="muted tiny" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
        <Icon.info />
        自社サイト経由の予約は、商品ページのURLが自動的に適用されます（手動設定不要）
      </span>
    </div>
  );
}

// ── preview pane ──────────────────────────────────────────────────────────────

function TOPreviewPane({ t, badge }) {
  return (
    <aside className="preview-pane">
      <div className="preview-header">
        <div>
          <p className="eyebrow">Live Preview</p>
          <h2>TourOption表示</h2>
        </div>
        <span className="preview-badge"><span className="dot" />{badge}</span>
      </div>
      <div style={{ padding: 0 }}>
        {window.TourOptionPreview({ t })}
      </div>
    </aside>
  );
}

// ── A) 一覧 ─────────────────────────────────────────────────────────────────

const TO_PRICE_RANGES = [
  { label: "〜¥5,000", min: 0, max: 5000 },
  { label: "¥5,001〜¥10,000", min: 5001, max: 10000 },
  { label: "¥10,001〜¥20,000", min: 10001, max: 20000 },
  { label: "¥20,001〜", min: 20001, max: Infinity },
];

function TourOptionFlowList({ rows, onCreate, onView, onEdit }) {
  const [search, setSearch] = useTState("");
  const [statuses, setStatuses] = useTState([]);
  const [priceRange, setPriceRange] = useTState("すべて");

  const filtered = useTMemo(() => {
    const s = search.trim().toLowerCase();
    const pr = TO_PRICE_RANGES.find(p => p.label === priceRange);
    return rows.filter(r => {
      if (s && !`${r.name} ${r.theme || ""} ${r.code}`.toLowerCase().includes(s)) return false;
      if (statuses.length && !statuses.includes(r.salesStatus)) return false;
      if (pr && (r.priceValue < pr.min || r.priceValue > pr.max)) return false;
      return true;
    });
  }, [rows, search, statuses, priceRange]);

  const counts = filtered.reduce((a, r) => { a[r.salesStatus] = (a[r.salesStatus] ?? 0) + 1; return a; }, {});
  const hasFilter = !!search || statuses.length > 0 || priceRange !== "すべて";
  const clearAll = () => { setSearch(""); setStatuses([]); setPriceRange("すべて"); };

  return (
    <div className="list-shell" data-screen-label="TourOption一覧">
      <div className="topbar list-topbar">
        <div><div className="crumbs"><span>deep_Admin</span><span className="sep">/</span><span className="current">TourOption</span></div></div>
      </div>

      <div className="list-view">
        <div className="list-header">
          <div>
            <h1>TourOption 一覧</h1>
            <p className="list-desc">ツアーの実体となるTourOptionを管理します。行から詳細確認・編集に進みます。</p>
            <div className="list-meta-row">
              <TCounter total={rows.length} shown={filtered.length} hasFilter={hasFilter} />
              <TClear show={hasFilter} onClick={clearAll} />
            </div>
          </div>
          <div className="flex-row" style={{ gap: 10, alignSelf: "flex-start" }}>
            <button className="btn primary" onClick={onCreate}>＋ 新規作成</button>
          </div>
        </div>

        <div className="list-filters">
          <TSearchBar value={search} onChange={setSearch} placeholder="TourOption名・テーマ・コードで検索..." />
          <div className="lf-controls">
            <TMultiSelect label="販売ステータス" options={["掲載中", "非公開", "下書き"]} values={statuses} onChange={setStatuses} />
            <TSingleSelect label="価格帯" options={TO_PRICE_RANGES.map(r => r.label)} value={priceRange} onChange={setPriceRange} />
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
                  <th style={{ width: 170 }}>TourOptionコード</th>
                  <th>TourOption名</th>
                  <th style={{ width: 150 }}>タグ</th>
                  <th style={{ width: 120 }}>販売ステータス</th>
                  <th className="num" style={{ width: 120 }}>基準販売価格</th>
                  <th className="actions" style={{ width: 196 }}>アクション</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && <tr><td colSpan="6" className="list-empty">該当するTourOptionがありません</td></tr>}
                {filtered.map(r => (
                  <tr key={r.id} className="list-row" onClick={() => onView(r.id)}>
                    <td><span className="code-mono" style={{ fontSize: 12, fontWeight: 600 }}>{r.code || "—"}</span></td>
                    <td><strong>{r.name || "（無題）"}</strong><div className="row-sub">{r.theme}</div></td>
                    <td><div className="tag-pile">{(r.tags || []).map(t => <span key={t} className="tag-chip">{t}</span>)}</div></td>
                    <td><TStatusBadge status={r.salesStatus} /></td>
                    <td className="num"><strong>{r.price}</strong></td>
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

// ── STEP tab bar (shared) ──────────────────────────────────────────────────────

function StepTabs({ tab, setTab }) {
  return (
    <div className="tab-row" role="tablist">
      {TO_TABS.map(([key, label], i) => (
        <button key={key} className={`tab-button ${tab === key ? "active" : ""}`} onClick={() => setTab(key)}>
          <span style={{ opacity: 0.55, fontVariantNumeric: "tabular-nums", marginRight: 6, fontSize: 11.5 }}>{String(i + 1).padStart(2, "0")}</span>
          {label}
        </button>
      ))}
    </div>
  );
}

// ── B) 新規作成 / D) 編集 ───────────────────────────────────────────────────────

function TOFormScreen({ mode, t, channels, update, validation, tab, setTab, onAddChannel, onEditChannel, onSave, onCancel }) {
  const isCreate = mode === "create";
  const noPreview = tab === "channels";
  return (
    <React.Fragment>
      <div className="topbar" data-screen-label={isCreate ? "TourOption新規作成" : "TourOption編集"}>
        <div>
          <div className="crumbs">
            <span>deep_Admin</span><span className="sep">/</span>
            <a className="crumb-link" onClick={onCancel}>TourOption</a><span className="sep">/</span>
            {!isCreate && <><span>{t.name || t.id}</span><span className="sep">/</span></>}
            <span className="current">{isCreate ? "新規作成" : "編集"}</span>
          </div>
          <div className="title-row">
            <button className="btn ghost sm back-btn" onClick={onCancel}>← キャンセル</button>
            <h1>{isCreate ? "TourOption 新規作成" : "TourOption 編集"}</h1>
            <span className={`status-pill ${isCreate ? "blue" : t.salesStatus === "掲載中" ? "green" : "muted"}`}>
              <span className="dot" />{isCreate ? "下書き作成中" : "編集中"}
            </span>
          </div>
        </div>
        <div className="flex-row" style={{ gap: 8 }}>
          <button className="btn" onClick={onCancel}>キャンセル</button>
          <button className="btn primary" onClick={onSave}>{isCreate ? "下書き保存" : "保存"}</button>
        </div>
      </div>

      <div className="content-grid" data-no-preview={noPreview ? "true" : "false"}>
        <section className="editor-pane">
          <StepTabs tab={tab} setTab={setTab} />
          <div className="editor-content">
            {tab === "channels"
              ? <ChannelsFlowTab channels={channels} readonly={false} onAddChannel={onAddChannel} onEditChannel={onEditChannel} />
              : window.TourOptionEditor({ tab, mode, data: t, update, validation })}
          </div>
        </section>
        {!noPreview && <TOPreviewPane t={t} badge={isCreate ? "作成プレビュー" : "編集プレビュー"} />}
      </div>
    </React.Fragment>
  );
}

// ── C) 詳細確認 ────────────────────────────────────────────────────────────────

function TODetailScreen({ t, channels, tab, setTab, onBack, onEdit }) {
  const noPreview = tab === "channels";
  return (
    <React.Fragment>
      <div className="topbar" data-screen-label="TourOption詳細確認">
        <div>
          <div className="crumbs">
            <span>deep_Admin</span><span className="sep">/</span>
            <a className="crumb-link" onClick={onBack}>TourOption</a><span className="sep">/</span>
            <span className="current">{t.name || t.id}</span>
          </div>
          <div className="title-row">
            <button className="btn ghost sm back-btn" onClick={onBack}>← 一覧に戻る</button>
            <h1>{t.name || "（無題）"}</h1>
            <TStatusBadge status={t.salesStatus} />
          </div>
        </div>
        <div className="flex-row" style={{ gap: 8 }}>
          <button className="btn primary" onClick={onEdit}>編集する</button>
        </div>
      </div>

      <div className="status-strip">
        <div className="status-cell id"><span className="status-label">内部ID</span><strong>{t.id}</strong></div>
        <div className="status-cell"><span className="status-label">TourOptionコード</span><strong className="code-mono" style={{ fontSize: 13 }}>{t.code || "—"}</strong></div>
        <div className="status-cell"><span className="status-label">販売ステータス</span><strong>{t.salesStatus}</strong></div>
        <div className="status-cell"><span className="status-label">基準販売価格</span><strong>{t.tieredPricingEnabled ? "段階価格" : t.price}</strong></div>
        <div className="status-actions"><button className="btn primary" onClick={onEdit}>編集する</button></div>
      </div>

      <div className="content-grid" data-no-preview={noPreview ? "true" : "false"}>
        <section className="editor-pane">
          <StepTabs tab={tab} setTab={setTab} />
          <div className="editor-content">
            {tab === "channels"
              ? <ChannelsFlowTab channels={channels} readonly={true} />
              : window.TourOptionEditor({ tab, mode: "review", data: t, update: () => {}, validation: {} })}
          </div>
        </section>
        {!noPreview && <TOPreviewPane t={t} badge="確認プレビュー" />}
      </div>
    </React.Fragment>
  );
}

// ── E) チャネルURL編集 ──────────────────────────────────────────────────────────

function ChannelEditScreen({ t, row, onSave, onCancel, onRemove }) {
  const { Field, ToggleRow, SectionHead, InfoNote } = TB;
  const [draft, setDraft] = useTState({ url: row.url || "", enabled: !!row.enabled, note: row.note || "" });
  const set = patch => setDraft(d => ({ ...d, ...patch }));
  return (
    <React.Fragment>
      <div className="topbar" data-screen-label="チャネルURL編集">
        <div>
          <div className="crumbs">
            <span>deep_Admin</span><span className="sep">/</span><span>TourOption</span><span className="sep">/</span>
            <a className="crumb-link" onClick={onCancel}>{t.name || t.id}</a><span className="sep">/</span>
            <span className="current">チャネルURL編集</span>
          </div>
          <div className="title-row">
            <button className="btn ghost sm back-btn" onClick={onCancel}>← 戻る</button>
            <h1>チャネルURL編集</h1>
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
              <SectionHead title="チャネルURL編集" desc={`「${row.channel}」の掲載URL・有効状態を編集します。`} />
              <div className="field-grid">
                <div className="field">
                  <label className="field-label"><span>チャネル</span></label>
                  <div className="readonly-text"><ChannelMark name={row.channel} /></div>
                </div>
                <Field label="紐付けID" value={row.id} readOnly mono />
                <div className="field-wide">
                  <div className="field-label"><span className="req" /><span>掲載URL</span></div>
                  <div className="input-affix">
                    <div className="affix">https://</div>
                    <input type="url" value={(draft.url || "").replace(/^https?:\/\//, "")}
                      onChange={e => set({ url: "https://" + e.target.value.replace(/^https?:\/\//, "") })}
                      placeholder="www.viator.com/tours/..." style={{ fontFamily: '"JetBrains Mono", ui-monospace, monospace', fontSize: 12.5 }} />
                  </div>
                  <div className="field-help"><TIcon.info /><span>OTA商品ページの完全URLを入力</span></div>
                </div>
                <div className="field-wide">
                  <div className="field-label"><span>有効 / 無効</span></div>
                  <ToggleRow checked={draft.enabled} onChange={v => set({ enabled: v })}
                    title={draft.enabled ? "有効" : "無効"} desc="無効にすると、このチャネルからの予約導線が停止します" />
                </div>
                <Field label="備考" value={draft.note} onChange={x => set({ note: x })} wide placeholder="運用メモなど（社外非公開）" />
              </div>

              <InfoNote amber icon={<TIcon.alert />}>
                URLが未設定・無効のチャネルから予約が入った場合、運営画面にアラートが表示されます。
              </InfoNote>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, borderTop: "1px solid var(--line)", paddingTop: "var(--sp-4)" }}>
                <button className="btn danger" onClick={onRemove}>このチャネルを削除</button>
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

// ── F) チャネルURL新規追加 ──────────────────────────────────────────────────────

function ChannelAddScreen({ t, existingChannels, onSave, onCancel }) {
  const { Field, SelectField, ToggleRow, SectionHead, InfoNote } = TB;
  const options = CHANNEL_MASTER.filter(c => c.code !== "own").map(c => c.name);
  const firstFree = options.find(o => !existingChannels.includes(o)) || options[0] || "";
  const [draft, setDraft] = useTState({ channel: firstFree, url: "", enabled: true, note: "" });
  const set = patch => setDraft(d => ({ ...d, ...patch }));
  const dup = existingChannels.includes(draft.channel);
  return (
    <React.Fragment>
      <div className="topbar" data-screen-label="チャネルURL新規追加">
        <div>
          <div className="crumbs">
            <span>deep_Admin</span><span className="sep">/</span><span>TourOption</span><span className="sep">/</span>
            <a className="crumb-link" onClick={onCancel}>{t.name || t.id}</a><span className="sep">/</span>
            <span className="current">チャネルURL新規追加</span>
          </div>
          <div className="title-row">
            <button className="btn ghost sm back-btn" onClick={onCancel}>← 戻る</button>
            <h1>チャネルURL新規追加</h1>
          </div>
        </div>
        <div className="flex-row" style={{ gap: 8 }}>
          <button className="btn" onClick={onCancel}>キャンセル</button>
          <button className="btn primary" disabled={!draft.url || dup} onClick={() => onSave(draft)}>保存</button>
        </div>
      </div>

      <div className="content-grid" data-no-preview="true">
        <section className="editor-pane">
          <div className="editor-content">
            <div className="form-section">
              <SectionHead title="チャネルURL新規追加" desc="チャネルマスターから選び、掲載URLを登録します。" />
              <div className="field-grid">
                <div className="field">
                  <label className="field-label"><span className="req" /><span>チャネル</span></label>
                  <select value={draft.channel} onChange={e => set({ channel: e.target.value })}>
                    {options.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                  <div className={`field-help ${dup ? "warn" : ""}`}>
                    {dup ? <TIcon.alert /> : <TIcon.info />}
                    <span>{dup ? "このチャネルは既に登録済みです" : "チャネルマスターから選択"}</span>
                  </div>
                </div>
                <div className="field" />
                <div className="field-wide">
                  <div className="field-label"><span className="req" /><span>掲載URL</span></div>
                  <div className="input-affix">
                    <div className="affix">https://</div>
                    <input type="url" value={(draft.url || "").replace(/^https?:\/\//, "")}
                      onChange={e => set({ url: "https://" + e.target.value.replace(/^https?:\/\//, "") })}
                      placeholder="www.viator.com/tours/..." style={{ fontFamily: '"JetBrains Mono", ui-monospace, monospace', fontSize: 12.5 }} />
                  </div>
                  <div className="field-help"><TIcon.info /><span>OTA商品ページの完全URLを入力</span></div>
                </div>
                <div className="field-wide">
                  <div className="field-label"><span>有効 / 無効</span></div>
                  <ToggleRow checked={draft.enabled} onChange={v => set({ enabled: v })}
                    title={draft.enabled ? "有効" : "無効"} desc="登録直後から予約導線を有効にする場合はON" />
                </div>
                <Field label="備考" value={draft.note} onChange={x => set({ note: x })} wide placeholder="運用メモなど（社外非公開）" />
              </div>
              <InfoNote>自社サイトURLは商品ページから自動取得されるため、ここで追加する必要はありません。</InfoNote>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, borderTop: "1px solid var(--line)", paddingTop: "var(--sp-4)" }}>
                <button className="btn" onClick={onCancel}>キャンセル</button>
                <button className="btn primary" disabled={!draft.url || dup} onClick={() => onSave(draft)}>保存</button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </React.Fragment>
  );
}

// ── Orchestrator ─────────────────────────────────────────────────────────────

function TourOptionFlow({ navSignal }) {
  const init = useTRef(buildInitialTO()).current;
  const [tos, setTos] = useTState(init.tos);
  const [channelsByTO, setChannelsByTO] = useTState(init.channels);

  const [view, setView] = useTState("list");   // list | detail | create | edit | channelAdd | channelEdit
  const [currentId, setCurrentId] = useTState(null);
  const [draft, setDraft] = useTState(null);    // {TO fields..., channels:[]}
  const [formTab, setFormTab] = useTState("basic");
  const [detailTab, setDetailTab] = useTState("basic");
  const [editingChannelId, setEditingChannelId] = useTState(null);
  const [returnView, setReturnView] = useTState("edit");

  const firstNav = useTRef(true);
  useTEffect(() => {
    if (firstNav.current) { firstNav.current = false; return; }
    setView("list"); setCurrentId(null); setDraft(null);
  }, [navSignal]);

  const listRows = useTMemo(() => Object.values(tos).map(t => ({
    id: t.id, code: t.code, name: t.name, theme: t.theme, tags: t.tags || [],
    salesStatus: t.salesStatus, price: t.price,
    priceValue: Number((t.price || "").replace(/[^\d]/g, "")) || 0,
  })), [tos]);

  const validation = useTMemo(() => draft ? validateTO(draft, false) : {}, [draft]);

  // navigation
  const goList = () => setView("list");
  const openView = (id) => { setCurrentId(id); setDetailTab("basic"); setView("detail"); };
  const openCreate = () => { setDraft({ ...blankTO(), channels: [ownChannelRow()] }); setFormTab("basic"); setView("create"); };
  const openEdit = (id) => {
    setCurrentId(id);
    setDraft({ ...tos[id], channels: (channelsByTO[id] || []).map(c => ({ ...c })) });
    setFormTab("basic"); setView("edit");
  };
  const cancelForm = () => { (view === "create") ? goList() : openView(currentId); setDraft(null); };
  const saveCreate = () => {
    const id = `to_${Date.now().toString(36)}`;
    const { channels, ...fields } = draft;
    setTos(m => ({ ...m, [id]: { ...fields, id, name: fields.name || "（無題）" } }));
    setChannelsByTO(m => ({ ...m, [id]: channels }));
    setDraft(null); setCurrentId(id); setDetailTab("basic"); setView("detail");
  };
  const saveEdit = () => {
    const { channels, ...fields } = draft;
    setTos(m => ({ ...m, [currentId]: { ...fields, id: currentId } }));
    setChannelsByTO(m => ({ ...m, [currentId]: channels }));
    setDraft(null); setDetailTab(formTab); setView("detail");
  };

  // channel ops — always operate on the form draft
  const openChannelAdd = () => { setReturnView(view); setView("channelAdd"); };
  const openChannelEdit = (chId) => { setReturnView(view); setEditingChannelId(chId); setView("channelEdit"); };
  const backFromChannel = () => setView(returnView);

  const addChannel = (data) => {
    setDraft(d => ({
      ...d, channels: [...d.channels, {
        id: `ch-${Date.now().toString(36)}`, channel: data.channel, url: data.url,
        enabled: data.enabled, note: data.note, auto: false, updatedAt: "2026/06/02",
      }],
    }));
    backFromChannel();
  };
  const saveChannel = (data) => {
    setDraft(d => ({
      ...d, channels: d.channels.map(c => c.id === editingChannelId
        ? { ...c, url: data.url, enabled: data.enabled, note: data.note, updatedAt: "2026/06/02" } : c),
    }));
    backFromChannel();
  };
  const removeChannel = () => {
    setDraft(d => ({ ...d, channels: d.channels.filter(c => c.id !== editingChannelId) }));
    backFromChannel();
  };

  // render
  if (view === "list") {
    return <TourOptionFlowList rows={listRows} onCreate={openCreate} onView={openView} onEdit={openEdit} />;
  }
  if (view === "create" || view === "edit") {
    return (
      <TOFormScreen
        mode={view} t={draft} channels={draft.channels}
        update={patch => setDraft(d => ({ ...d, ...patch }))}
        validation={validation} tab={formTab} setTab={setFormTab}
        onAddChannel={openChannelAdd} onEditChannel={openChannelEdit}
        onSave={view === "create" ? saveCreate : saveEdit} onCancel={cancelForm}
      />
    );
  }
  if (view === "detail") {
    return (
      <TODetailScreen
        t={tos[currentId]} channels={channelsByTO[currentId] || []}
        tab={detailTab} setTab={setDetailTab} onBack={goList} onEdit={() => openEdit(currentId)}
      />
    );
  }
  if (view === "channelAdd") {
    return <ChannelAddScreen t={draft} existingChannels={(draft.channels || []).map(c => c.channel)} onSave={addChannel} onCancel={backFromChannel} />;
  }
  if (view === "channelEdit") {
    const row = (draft.channels || []).find(c => c.id === editingChannelId);
    if (!row) { backFromChannel(); return null; }
    return <ChannelEditScreen t={draft} row={row} onSave={saveChannel} onCancel={backFromChannel} onRemove={removeChannel} />;
  }
  return null;
}

window.TourOptionFlow = TourOptionFlow;
