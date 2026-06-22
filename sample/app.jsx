// app.jsx — Main shell + state + tweaks for deep_Admin
// Mounts at #root. Composes the sidebar, topbar, status strip, editor, preview,
// and check list. Form edits flow live into the preview because all data lives
// in this component's React state.

const { useState, useEffect, useMemo, useCallback } = React;

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "density": "regular",
  "side": "default",
  "accent": "teal",
  "validation": "live",
  "fontScale": 1.0
}/*EDITMODE-END*/;

// Accent presets — applied via inline CSS vars on <body>.
const ACCENTS = {
  teal:   { "--accent": "#0a5e5a", "--accent-strong": "#064a47", "--accent-soft": "#d6ebe8" },
  indigo: { "--accent": "#3a4ea3", "--accent-strong": "#293a82", "--accent-soft": "#dde3f6" },
  plum:   { "--accent": "#7a3859", "--accent-strong": "#5e2944", "--accent-soft": "#f0dee8" },
  ink:    { "--accent": "#1a1816", "--accent-strong": "#000000", "--accent-soft": "#e9e3d6" },
};

function applyAccent(name) {
  const cfg = ACCENTS[name] ?? ACCENTS.teal;
  for (const [k, v] of Object.entries(cfg)) document.body.style.setProperty(k, v);
}

// ── Validation logic — easy to demo via the Tweaks panel ───────────────────
function validate(tourOpt, mode, strict) {
  const v = {};
  if (!tourOpt.code || !/^[A-Z]-[A-Z]{3}-\d{3}-\d-[A-Z]{2}$/i.test(tourOpt.code)) {
    v.code = strict ? "コード形式が正しくありません（例: G-KYO-003-1-PR）" : null;
  }
  if (!tourOpt.name) v.name = "TourOption名は必須です";
  if (strict && Number(tourOpt.minBooking) > Number(tourOpt.maxBooking)) {
    v.minBooking = "最小人数が最大人数を超えています";
  }
  return v;
}

// ── Main App ───────────────────────────────────────────────────────────────

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);

  // When a standalone per-screen page sets window.DEEP_SCREEN, lock this app to
  // that single resource and let the sidebar navigate across the separate files.
  const LOCKED = (typeof window !== "undefined" && window.DEEP_SCREEN) || null;

  const [resource, setResource] = useState(LOCKED || "tourOption");
  const [view, setView] = useState(LOCKED ? "list" : "detail"); // "list" | "detail"
  const [mode, setMode] = useState("edit");
  const [tab, setTab] = useState("sales");
  const [selectedLink, setSelectedLink] = useState("link-01");
  const [selectedDoc, setSelectedDoc] = useState("doc-001");
  const [selectedTemplate, setSelectedTemplate] = useState((SEED.cancelTemplates && SEED.cancelTemplates[0] && SEED.cancelTemplates[0].id) || null);
  const [navSignal, setNavSignal] = useState(0); // bumped when the active sidebar item is re-clicked (lets ProductPageFlow reset to its list)

  // Domain state — single source of truth, all forms write here, preview reads from here
  const [tourOption, setTourOption] = useState(SEED.tourOption);
  const [productPage, setProductPage] = useState(SEED.productPage);
  const [linkedOptions, setLinkedOptions] = useState(SEED.linkedOptions);
  const [guideDocs, setGuideDocs] = useState(SEED.guideDocs);
  const [cancelTemplates, setCancelTemplates] = useState(SEED.cancelTemplates);

  // Apply tweaks to body
  useEffect(() => {
    document.body.dataset.density = t.density;
    document.body.dataset.side = t.side;
    document.body.style.fontSize = (14 * t.fontScale) + "px";
    applyAccent(t.accent);
  }, [t.density, t.side, t.accent, t.fontScale]);

  // When resource changes, reset to list view + first tab
  const didMountRef = React.useRef(false);
  useEffect(() => {
    if (!didMountRef.current) { didMountRef.current = true; return; }
    setView("list");
    const first = SEED.tabs[resource][0][0];
    if (!SEED.tabs[resource].some(([k]) => k === tab)) setTab(first);
  }, [resource]);

  // Sidebar wrapper that resets view to list whenever clicked
  const handleSetResource = useCallback((r) => {
    setResource(r);
    setView("list");
    setNavSignal(s => s + 1);
  }, []);

  const openDetail = useCallback((rowMode = "edit") => {
    setMode(rowMode);
    setView("detail");
  }, []);

  const modeData = SEED.modes[mode];
  const tabsForResource = SEED.tabs[resource];
  const isReview = mode === "review";

  const updateTourOption = useCallback((patch) => setTourOption(s => ({ ...s, ...patch })), []);
  const updateProductPage = useCallback((patch) => setProductPage(s => ({ ...s, ...patch })), []);
  const updateLink = useCallback((id, patch) => setLinkedOptions(list =>
    list.map(l => l.id === id ? { ...l, ...patch, salesStatus: patch.sellable === false ? "販売OFF" : patch.sellable === true ? "販売ON" : l.salesStatus } : l)
  ), []);
  const updateDoc = useCallback((id, patch) => setGuideDocs(list =>
    list.map(d => d.id === id ? { ...d, ...patch } : d)
  ), []);
  const updateTemplate = useCallback((id, patch) => setCancelTemplates(list =>
    list.map(x => x.id === id ? { ...x, ...patch } : x)
  ), []);

  const validation = useMemo(() => validate(tourOption, mode, t.validation === "strict"), [tourOption, mode, t.validation]);

  // Build lookup live from tourOption (so edits to the displayed TourOption flow into the product page preview's option picker too)
  const lookup = useMemo(() => ({
    ...SEED.tourOptionsLookup,
    [tourOption.code]: {
      selectionName: tourOption.selectionName,
      shortDescription: tourOption.shortDescription,
      tags: tourOption.tags,
      price: tourOption.price,
      duration: tourOption.duration,
      capacity: `${tourOption.minBooking}〜${tourOption.maxBooking}名`,
    },
  }), [tourOption]);

  // Status strip values
  const statusValues = useMemo(() => {
    if (resource === "tourOption") return {
      id: mode === "create" ? "TO-自動採番" : tourOption.id,
      code: tourOption.code,
      status: mode === "create" ? "下書き" : tourOption.salesStatus,
      statusVariant: tourOption.salesStatus === "掲載中" ? "green" : tourOption.salesStatus === "非公開" ? "muted" : "blue",
      sub: tourOption.name,
    };
    if (resource === "guideDoc") {
      const d = guideDocs.find(x => x.id === selectedDoc) ?? guideDocs[0];
      return {
        id: d.id, code: `${d.scope} / ${d.type}`,
        status: `${d.assignedTo.length}件割り当て`,
        statusVariant: d.assignedTo.length > 0 ? "teal" : "muted",
        sub: d.name,
      };
    }
    if (resource === "cancelTemplate") {
      const x = cancelTemplates.find(c => c.id === selectedTemplate) ?? cancelTemplates[0];
      return {
        id: x.id, code: x.lang,
        status: x.enabled ? "有効" : "無効",
        statusVariant: x.enabled ? "teal" : "muted",
        sub: x.name,
      };
    }
    return {
      id: mode === "create" ? "PG-自動採番" : productPage.id,
      code: productPage.url,
      status: mode === "create" ? "下書き" : productPage.status,
      statusVariant: productPage.status === "掲載中" ? "green" : "blue",
      sub: productPage.displayTitle,
    };
  }, [resource, mode, tourOption, productPage, guideDocs, selectedDoc, cancelTemplates, selectedTemplate]);

  // Header label
  const headerLabel = resource === "tourOption" ? "TourOption" : resource === "productPage" ? "商品ページ" : resource === "cancelTemplate" ? "キャンセルポリシー文言" : "ガイド向け資料";

  // For productPage, preview pane is only shown on the 表示確認 tab
  const previewHidden = (resource === "productPage" && tab !== "pagePreview") || resource === "cancelTemplate";

  // ── Checks ────────────────────────────────────────────────────────────────
  const checks = useMemo(() => buildChecks(resource, { tourOption, productPage, guideDocs, selectedDoc, linkedOptions, validation, mode }), [resource, tourOption, productPage, guideDocs, selectedDoc, linkedOptions, validation, mode]);
  const doneCount = checks.filter(c => c[0] === "done").length;

  return (
    <div className="app-shell">
      <Sidebar resource={resource} setResource={handleSetResource} locked={LOCKED}
        counts={{ to: (SEED.tourOptionList||[]).length, pg: (SEED.productPageList||[]).length, gd: guideDocs.length, ct: cancelTemplates.length }} />

      <main className="workspace">
        {resource === "productPage" ? (
          <ProductPageFlow navSignal={navSignal} />
        ) : resource === "tourOption" ? (
          <TourOptionFlow navSignal={navSignal} />
        ) : resource === "guideDoc" ? (
          <GuideDocFlow navSignal={navSignal} />
        ) : resource === "cancelTemplate" ? (
          <CancelPolicyFlow navSignal={navSignal} />
        ) : view === "list" ? (
          <ListShell
            resource={resource}
            headerLabel={headerLabel}
            onOpen={openDetail}
            guideDocs={guideDocs}
            cancelTemplates={cancelTemplates}
          />
        ) : (
        <React.Fragment>
        <div className="topbar">
          <div>
            <div className="crumbs">
              <span>deep_Admin</span>
              <span className="sep">/</span>
              <a className="crumb-link" onClick={() => setView("list")}>{headerLabel}</a>
              <span className="sep">/</span>
              <span className="current">{statusValues.sub || statusValues.id}</span>
            </div>
            <div className="title-row">
              <button className="btn ghost sm back-btn" onClick={() => setView("list")}>← 一覧に戻る</button>
              <h1>{headerLabel} 作成・編集・確認</h1>
              <span className={`status-pill ${statusValues.statusVariant}`}>
                <span className="dot"/>
                {statusValues.status}
              </span>
            </div>
          </div>
          <div className="flex-row" style={{gap:10}}>
            <div className="mode-switch" role="tablist">
              {Object.entries(SEED.modes).map(([k, m]) => (
                <button key={k} className={`mode-button ${mode === k ? "active" : ""}`} onClick={() => setMode(k)}>{m.label}</button>
              ))}
            </div>
          </div>
        </div>

        <div className="status-strip">
          <div className="status-cell id">
            <span className="status-label">内部ID</span>
            <strong>{statusValues.id}</strong>
          </div>
          <div className="status-cell">
            <span className="status-label">業務コード / URL</span>
            <strong className="code-mono" style={{fontSize:13}}>{statusValues.code}</strong>
          </div>
          <div className="status-cell">
            <span className="status-label">{resource === "guideDoc" ? "対象" : "ステータス"}</span>
            <strong>{statusValues.status}</strong>
          </div>
          <div className="status-cell">
            <span className="status-label">{resource === "guideDoc" ? "資料名" : resource === "tourOption" ? "TourOption名" : "表示タイトル"}</span>
            <strong>{statusValues.sub}</strong>
          </div>
          <div className="status-actions">
            <button className="btn icon" title="前へ" aria-label="前へ">‹</button>
            <button className="btn icon" title="次へ" aria-label="次へ">›</button>
            <button className="btn ghost sm" title="複製">複製</button>
            <button className="btn primary">{modeData.action}</button>
          </div>
        </div>

        <div className="content-grid" data-no-preview={previewHidden ? "true" : "false"}>
          <section className="editor-pane">
            <div className="tab-row" role="tablist">
              {tabsForResource.map(([key, label], i) => (
                <button key={key} className={`tab-button ${tab === key ? "active" : ""}`} onClick={() => setTab(key)}>
                  <span style={{opacity:0.55,fontVariantNumeric:'tabular-nums',marginRight:6,fontSize:11.5}}>{String(i+1).padStart(2,'0')}</span>
                  {label}
                </button>
              ))}
            </div>
            <div className="editor-content">
              {resource === "tourOption" && <TourOptionEditor tab={tab} mode={mode} data={tourOption} update={updateTourOption} validation={validation} />}
              {resource === "productPage" && <ProductPageEditor tab={tab} mode={mode} page={productPage} updatePage={updateProductPage} links={linkedOptions} updateLinks={updateLink} selectedLinkId={selectedLink} selectLink={setSelectedLink} lookup={lookup} />}
              {resource === "guideDoc" && <GuideDocEditor tab={tab} mode={mode} docs={guideDocs} updateDoc={updateDoc} selectedDocId={selectedDoc} selectDoc={setSelectedDoc} setTab={setTab} />}
              {resource === "cancelTemplate" && <CancelTemplateEditor tab={tab} mode={mode} templates={cancelTemplates} updateTemplate={updateTemplate} selectedTemplateId={selectedTemplate} selectTemplate={setSelectedTemplate} setTab={setTab} />}
            </div>
          </section>

          <aside className="preview-pane" style={previewHidden ? {display:'none'} : undefined}>
            <div className="preview-header">
              <div>
                <p className="eyebrow">Live Preview</p>
                <h2>{resource === "tourOption" ? "TourOption表示" : resource === "guideDoc" ? "ガイド表示" : "商品ページ表示"}</h2>
              </div>
              <span className="preview-badge"><span className="dot"/>{modeData.badge}</span>
            </div>
            <div style={{padding:0}}>
              {resource === "tourOption" && <TourOptionPreview t={tourOption} />}
              {resource === "productPage" && <ProductPagePreview page={productPage} links={linkedOptions} lookup={lookup} selectedLinkId={selectedLink} selectLink={setSelectedLink} tourOption={tourOption} />}
              {resource === "guideDoc" && <GuideDocPreview doc={guideDocs.find(d => d.id === selectedDoc) ?? guideDocs[0]} />}
            </div>
            <CheckArea checks={checks} done={doneCount} />
          </aside>
        </div>
        </React.Fragment>
        )}
      </main>

      <TweaksPanel title="Tweaks">
        <TweakSection label="Layout" />
        <TweakRadio label="Density" value={t.density}
          options={["compact","regular","comfy"].map(o => ({value: o === "comfy" ? "comfortable" : o, label: o}))}
          onChange={v => setTweak('density', v)} />
        <TweakSlider label="Font scale" value={t.fontScale} min={0.9} max={1.15} step={0.05} unit="×"
          onChange={v => setTweak('fontScale', v)} />

        <TweakSection label="Theme" />
        <AccentPicker value={t.accent} onChange={v => setTweak('accent', v)} />
        <TweakRadio label="Sidebar" value={t.side}
          options={[{value:"default",label:"green"},{value:"mono",label:"dark"},{value:"light",label:"light"}]}
          onChange={v => setTweak('side', v)} />

        <TweakSection label="Validation" />
        <TweakRadio label="Mode" value={t.validation}
          options={[{value:"live",label:"live"},{value:"strict",label:"strict"}]}
          onChange={v => setTweak('validation', v)} />
      </TweaksPanel>
    </div>
  );
}

// ── ListShell — wraps the per-resource list view in the main workspace area
function ListShell({ resource, headerLabel, onOpen, guideDocs, cancelTemplates }) {
  return (
    <div className="list-shell">
      <div className="topbar list-topbar">
        <div>
          <div className="crumbs">
            <span>deep_Admin</span>
            <span className="sep">/</span>
            <span className="current">{headerLabel}</span>
          </div>
        </div>
      </div>
      {resource === "tourOption" && (
        <ListViews.TourOptionList rows={SEED.tourOptionList} onOpen={() => onOpen("edit")} onCreate={() => onOpen("create")} />
      )}
      {resource === "productPage" && (
        <ListViews.ProductPageList rows={SEED.productPageList} onOpen={() => onOpen("edit")} onCreate={() => onOpen("create")} />
      )}
      {resource === "guideDoc" && (
        <ListViews.GuideDocList rows={guideDocs} onOpen={() => onOpen("edit")} onCreate={() => onOpen("create")} />
      )}
      {resource === "cancelTemplate" && (
        <ListViews.CancelTemplateList rows={cancelTemplates} onOpen={() => onOpen("edit")} onCreate={() => onOpen("create")} />
      )}
    </div>
  );
}

// AccentPicker — small custom swatch row that emits the named key, not the hex
function AccentPicker({ value, onChange }) {
  const opts = [
    { value: "teal",   hex: "#0a5e5a" },
    { value: "indigo", hex: "#3a4ea3" },
    { value: "plum",   hex: "#7a3859" },
    { value: "ink",    hex: "#1a1816" },
  ];
  return (
    <div className="twk-row">
      <div className="twk-lbl"><span>Accent</span><span className="twk-val">{value}</span></div>
      <div style={{display:'flex',gap:6}}>
        {opts.map(o => (
          <button key={o.value} type="button" onClick={() => onChange(o.value)}
            title={o.value}
            style={{
              flex:1, height:30, padding:0, borderRadius:6, cursor:'pointer',
              background:o.hex, border:0,
              boxShadow: value === o.value
                ? '0 0 0 2px #fff, 0 0 0 3.5px rgba(0,0,0,.85)'
                : '0 0 0 .5px rgba(0,0,0,.12), 0 1px 2px rgba(0,0,0,.06)',
              transition:'box-shadow .12s',
            }} />
        ))}
      </div>
    </div>
  );
}

// ── Sidebar ────────────────────────────────────────────────────────────────

function Sidebar({ resource, setResource, counts, locked }) {
  const items = [
    { key: "tourOption",  icon: "TO", label: "TourOption", count: counts.to, hint: "ツアーの実体", href: "TourOption.html" },
    { key: "productPage", icon: "PG", label: "商品ページ",   count: counts.pg, hint: "顧客表示", href: "商品ページ.html" },
    { key: "guideDoc",    icon: "GD", label: "ガイド資料",   count: counts.gd, hint: "運営注意・行程", href: "ガイド資料.html" },
    { key: "cancelTemplate", icon: "CP", label: "キャンセルポリシー文言", count: counts.ct, hint: "キャンセル文言", href: "キャンセルポリシー文言.html" },
  ];
  const handleClick = (it) => {
    if (locked) {
      if (it.key !== resource) { window.location.href = it.href; return; }
      setResource(it.key); // same screen → reset to list view
      return;
    }
    setResource(it.key);
  };
  return (
    <aside className="side-nav">
      <div className="brand-block">
        <div className="brand-mark">d.</div>
        <div>
          <div className="brand-name">deep_Admin</div>
          <div className="brand-caption">Product & Sales · Phase 1</div>
        </div>
      </div>

      <div>
        <div className="nav-section-label">Manage</div>
        <div className="nav-group">
          {items.map(it => (
            <button key={it.key}
              className={`nav-item ${resource === it.key ? "active" : ""}`}
              onClick={() => handleClick(it)}>
              <span className="nav-icon">{it.icon}</span>
              <span style={{flex:1,minWidth:0}}>
                <div>{it.label}</div>
              </span>
              <span className="nav-count">{it.count}</span>
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="nav-section-label">Tools</div>
        <div className="nav-group">
          <button className="nav-item"><span className="nav-icon" style={{fontSize:11}}>⌕</span><span>検索</span></button>
          <button className="nav-item"><span className="nav-icon" style={{fontSize:11}}>≡</span><span>変更履歴</span></button>
          <button className="nav-item"><span className="nav-icon" style={{fontSize:11}}>?</span><span>ヘルプ</span></button>
        </div>
      </div>

      <div className="side-note">
        <strong>Phase 1 設計原則</strong>
        同じTourOptionを複数ページに紐付ける場合、全ページで同じ表示内容を使います。ページごとの見せ方変更は将来フェーズで設計します。
      </div>
    </aside>
  );
}

// ── Check area ─────────────────────────────────────────────────────────────

function CheckArea({ checks, done }) {
  const total = checks.length;
  const pct = total ? (done / total) * 100 : 0;
  const allGood = done === total;
  return (
    <div className="check-area">
      <div className="check-heading">
        <h3>公開前チェック</h3>
        <span className={`count ${allGood ? "" : "warn"}`}>{done} / {total} 完了</span>
      </div>
      <div className="check-progress">
        <div className="fill" style={{width: pct + "%"}}/>
      </div>
      <div className="check-list">
        {checks.map(([type, title, body], i) => (
          <div key={i} className={`check-item ${type}`}>
            <span className="check-mark">{type === "done" ? "✓" : type === "warn" ? "!" : "×"}</span>
            <div className="check-text">
              <strong>{title}</strong>
              <span>{body}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function buildChecks(resource, ctx) {
  const { tourOption, productPage, guideDocs, selectedDoc, linkedOptions, validation, mode } = ctx;

  if (resource === "tourOption") {
    return [
      ["done", "TourOption ID", "保存時に自動生成される"],
      [validation.code ? "error" : "done", "TourOptionコード", validation.code ?? "業務コードが一意に設定されている"],
      [tourOption.name ? "done" : "warn", "TourOption名", tourOption.name ? "設定済み" : "未設定"],
      [tourOption.shortDescription?.length > 80 ? "warn" : "done", "短い説明", tourOption.shortDescription?.length > 80 ? "80文字を超えています" : "適切な文字数"],
      [tourOption.meetingPlace ? "done" : "warn", "集合場所", tourOption.meetingPlace ? "設定済み" : "未設定"],
      [tourOption.price ? "done" : "warn", "基準販売価格", tourOption.price ? `${tourOption.price} で設定済み` : "未設定"],
      ["warn", "代表画像", "差し替え候補あり"],
      [tourOption.guestSchedule ? "done" : "warn", "ゲスト向けスケジュール", tourOption.guestSchedule ? "設定済み" : "未設定"],
    ];
  }
  if (resource === "guideDoc") {
    const doc = guideDocs.find(d => d.id === selectedDoc) ?? guideDocs[0];
    return [
      ["done", "資料ID", "保存時に自動生成される"],
      [doc.scope ? "done" : "warn", "スコープ", doc.scope ? `${doc.scope}として設定済み` : "未設定"],
      [doc.type ? "done" : "warn", "種別", doc.type ? `${doc.type}として設定済み` : "未設定"],
      [doc.name ? "done" : "warn", "資料名", doc.name ? "設定済み" : "未設定"],
      [doc.content ? "done" : "warn", "本文 / 案内ポイント", doc.content ? "設定済み" : "未設定"],
      [doc.assignedTo.length > 0 ? "done" : "warn", "TourOption割り当て", `${doc.assignedTo.length}件割り当て済み`],
    ];
  }
  const visible = linkedOptions.filter(l => l.visible);
  const sellable = linkedOptions.filter(l => l.sellable);
  const hasDefault = linkedOptions.some(l => l.default);
  return [
    ["done", "商品ページID", "保存時に自動生成される"],
    [productPage.displayTitle ? "done" : "warn", "ページ共通情報", productPage.displayTitle ? "タイトル・リード文・画像が設定済み" : "タイトル未設定"],
    [visible.length > 0 ? "done" : "error", "掲載TourOption", `${visible.length}件が表示中`],
    [sellable.length > 0 ? "done" : "warn", "販売ON", `${sellable.length}件が販売中`],
    [hasDefault ? "done" : "warn", "デフォルト選択", hasDefault ? "指定済み" : "未指定"],
    ["done", "プレビュー", "選択UIと詳細表示を確認済み"],
  ];
}

// Mount
ReactDOM.createRoot(document.getElementById("root")).render(<App />);
