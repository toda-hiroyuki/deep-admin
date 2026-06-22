// guide-doc-flow.jsx — ガイド資料「1画面1操作」フロー
// 作成・編集・確認のモード切り替えを廃止し、独立した画面に分離する。
//   A) 一覧        GuideDocFlowList  各行「詳細を見る」「編集」／上部「＋ 新規作成」（ここだけ）
//   B) 新規作成    DocFormScreen(create)  種別・スコープ・資料種別・資料名・参考URL・本文・注意点・備考
//   C) 詳細確認    DocDetailScreen        全フィールド読み取り専用＋割り当てテーブル読み取り専用／「編集する」
//   D) 編集        DocFormScreen(edit)    フォーム編集／「保存」「キャンセル」
//
// 詳細確認・編集は1件の資料に絞った表示。詳細内のSTEP1（資料一覧タブ）と二重の新規作成導線を撤去。

const { useState: useGState, useMemo: useGMemo, useRef: useGRef, useEffect: useGEffect } = React;
const { SearchBar: GSearchBar, MultiSelectDropdown: GMultiSelect, ToggleFilter: GToggleFilter, TabFilter: GTabFilter, ResultCounter: GCounter, ClearFiltersButton: GClear } = window.ListFilters;
const GB = window.UIBlocks;
const GIcon = window.UIBlocks.Icon;

const DOC_TYPES = ["行程", "観光情報", "施設情報", "文化背景", "運営注意", "過去トラブル"];

function blankDoc() {
  return { id: "GD-自動採番", type: "参考資料", scope: "共通", docType: "観光情報", name: "", url: "", content: "", cautions: "", note: "", assignedTo: [] };
}

// ── shared field group (form + detail) ───────────────────────────────────────

function GuideDocFields({ doc, update, readonly, isCreate }) {
  const { Field, SelectField } = GB;
  const isItinerary = doc.docType === "行程";
  return (
    <div className="field-grid">
      <Field label="資料ID" value={isCreate ? "GD-自動採番" : doc.id} readOnly mono help={isCreate ? "保存時に発番" : null} />
      <SelectField label="種別" required value={doc.type} onChange={x => update({ type: x })} options={["参考資料", "注意事項"]} readOnly={readonly} />
      <SelectField label="スコープ" required value={doc.scope} onChange={x => update({ scope: x })} options={["共通", "個別"]} readOnly={readonly} />
      <SelectField label="資料種別" required value={doc.docType} onChange={x => update({ docType: x })} options={DOC_TYPES} readOnly={readonly} help="「行程」はガイド向けの詳細行程です。ゲスト向けスケジュールとは別に管理します。" />
      <Field label="資料名" required value={doc.name} onChange={x => update({ name: x })} wide readOnly={readonly} maxLen={60} />
      <Field label="参考URL" value={doc.url} onChange={x => update({ url: x })} wide readOnly={readonly} type="url" placeholder="Google Drive, Notion等のリンク" />
      <Field label={isItinerary ? "行程内容" : "本文 / 案内ポイント"} required value={doc.content} onChange={x => update({ content: x })} wide multiline readOnly={readonly} rows={8} />
      <Field label="注意点" value={doc.cautions} onChange={x => update({ cautions: x })} wide multiline readOnly={readonly} />
      <Field label="備考" value={doc.note} onChange={x => update({ note: x })} wide readOnly={readonly} />
    </div>
  );
}

function AssignmentTable({ doc, readonly }) {
  const { SectionHead, InfoNote } = GB;
  return (
    <div className="form-section" style={{ gap: "var(--sp-4)" }}>
      <SectionHead
        title="TourOption割り当て"
        desc={`「${doc.name || "この資料"}」が割り当てられているTourOptionです。`}
        action={<span className="badge teal">{doc.assignedTo.length}件</span>}
      />
      {doc.scope === "個別"
        ? <InfoNote amber>個別資料は1つのTourOptionにのみ割り当てられます。</InfoNote>
        : <InfoNote>共通資料は複数のTourOptionに割り当てられます。テーマをまたいだ割り当ても可能です。</InfoNote>}
      <div className="table-wrap">
        <div className="table-scroll">
          <table>
            <thead>
              <tr><th>TourOptionコード</th><th style={{ width: 140 }}>状態</th></tr>
            </thead>
            <tbody>
              {doc.assignedTo.map(code => (
                <tr key={code} style={{ cursor: "default" }}>
                  <td><strong className="code-mono">{code}</strong></td>
                  <td><span className="badge teal"><span className="dot" />割り当て済み</span></td>
                </tr>
              ))}
              {doc.assignedTo.length === 0 && (
                <tr><td colSpan={2} style={{ textAlign: "center", padding: 18, color: "var(--muted)" }}>割り当てなし</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      {readonly && <p className="muted tiny" style={{ margin: 0 }}>※ 割り当ての追加・解除は別途「割り当て管理」操作で行います。</p>}
    </div>
  );
}

function GDPreviewPane({ doc, badge }) {
  return (
    <aside className="preview-pane">
      <div className="preview-header">
        <div><p className="eyebrow">Live Preview</p><h2>ガイド表示</h2></div>
        <span className="preview-badge"><span className="dot" />{badge}</span>
      </div>
      <div style={{ padding: 0 }}>{window.GuideDocPreview({ doc })}</div>
    </aside>
  );
}

// ── A) 一覧 ─────────────────────────────────────────────────────────────────

function GuideDocFlowList({ rows, onCreate, onView, onEdit }) {
  const [search, setSearch] = useGState("");
  const [scope, setScope] = useGState("すべて");
  const [docTypes, setDocTypes] = useGState([]);
  const [unassignedOnly, setUnassignedOnly] = useGState(false);

  const allDocTypes = useGMemo(() => Array.from(new Set(rows.map(r => r.docType).filter(Boolean))), [rows]);
  const filtered = useGMemo(() => {
    const s = search.trim().toLowerCase();
    return rows.filter(r => {
      if (s && !r.name.toLowerCase().includes(s)) return false;
      if (scope !== "すべて" && r.scope !== scope) return false;
      if (docTypes.length && !docTypes.includes(r.docType)) return false;
      if (unassignedOnly && r.assignedTo.length > 0) return false;
      return true;
    });
  }, [rows, search, scope, docTypes, unassignedOnly]);

  const hasFilter = !!search || scope !== "すべて" || docTypes.length > 0 || unassignedOnly;
  const clearAll = () => { setSearch(""); setScope("すべて"); setDocTypes([]); setUnassignedOnly(false); };

  return (
    <div className="list-shell" data-screen-label="ガイド資料一覧">
      <div className="topbar list-topbar">
        <div><div className="crumbs"><span>deep_Admin</span><span className="sep">/</span><span className="current">ガイド資料</span></div></div>
      </div>

      <div className="list-view">
        <div className="list-header">
          <div>
            <h1>ガイド向け資料 一覧</h1>
            <p className="list-desc">ガイドが参照する資料（観光情報・運営注意・行程など）を管理します。行から詳細確認・編集に進みます。</p>
            <div className="list-meta-row">
              <GCounter total={rows.length} shown={filtered.length} hasFilter={hasFilter} />
              <GClear show={hasFilter} onClick={clearAll} />
            </div>
          </div>
          <div className="flex-row" style={{ gap: 10, alignSelf: "flex-start" }}>
            <button className="btn primary" onClick={onCreate}>＋ 新規作成</button>
          </div>
        </div>

        <div className="list-scope-row">
          <span className="lf-scope-label">スコープ</span>
          <GTabFilter options={["すべて", "共通", "個別"]} value={scope} onChange={setScope} />
        </div>

        <div className="list-filters">
          <GSearchBar value={search} onChange={setSearch} placeholder="資料名で検索..." />
          <div className="lf-controls">
            <GMultiSelect label="資料種別" options={allDocTypes} values={docTypes} onChange={setDocTypes} />
            <GToggleFilter label="未割り当てのみ" value={unassignedOnly} onChange={setUnassignedOnly} />
          </div>
        </div>

        <div className="list-table-wrap">
          <div className="table-scroll">
            <table className="list-table">
              <thead>
                <tr>
                  <th>資料名</th>
                  <th style={{ width: 90 }}>スコープ</th>
                  <th style={{ width: 130 }}>資料種別</th>
                  <th className="num" style={{ width: 150 }}>割り当て数</th>
                  <th className="actions" style={{ width: 196 }}>アクション</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && <tr><td colSpan="5" className="list-empty">該当する資料がありません</td></tr>}
                {filtered.map(r => (
                  <tr key={r.id} className="list-row" onClick={() => onView(r.id)}>
                    <td><strong>{r.name || "（無題）"}</strong><div className="row-sub code-mono">{r.id}</div></td>
                    <td><span className={`badge ${r.scope === "共通" ? "teal" : "blue"}`}>{r.scope}</span></td>
                    <td>{r.docType}</td>
                    <td className="num"><strong>{r.assignedTo.length}</strong><span className="muted"> 件</span></td>
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

// ── B) 新規作成 / D) 編集 ───────────────────────────────────────────────────────

function DocFormScreen({ mode, doc, update, onSave, onCancel }) {
  const isCreate = mode === "create";
  return (
    <React.Fragment>
      <div className="topbar" data-screen-label={isCreate ? "ガイド資料新規作成" : "ガイド資料編集"}>
        <div>
          <div className="crumbs">
            <span>deep_Admin</span><span className="sep">/</span>
            <a className="crumb-link" onClick={onCancel}>ガイド資料</a><span className="sep">/</span>
            {!isCreate && <><span>{doc.name || doc.id}</span><span className="sep">/</span></>}
            <span className="current">{isCreate ? "新規作成" : "編集"}</span>
          </div>
          <div className="title-row">
            <button className="btn ghost sm back-btn" onClick={onCancel}>← キャンセル</button>
            <h1>{isCreate ? "ガイド資料 新規作成" : "ガイド資料 編集"}</h1>
            <span className={`status-pill ${isCreate ? "blue" : "teal"}`}><span className="dot" />{isCreate ? "新規作成中" : "編集中"}</span>
          </div>
        </div>
        <div className="flex-row" style={{ gap: 8 }}>
          <button className="btn" onClick={onCancel}>キャンセル</button>
          <button className="btn primary" onClick={onSave}>保存</button>
        </div>
      </div>

      <div className="content-grid">
        <section className="editor-pane">
          <div className="editor-content">
            <div className="form-section">
              <GB.SectionHead eyebrow={isCreate ? "新規作成" : "編集"} title="資料詳細" desc="スコープと種別を設定してから、資料の内容を入力します。" />
              <GuideDocFields doc={doc} update={update} readonly={false} isCreate={isCreate} />
            </div>
          </div>
        </section>
        <GDPreviewPane doc={doc} badge={isCreate ? "作成プレビュー" : "編集プレビュー"} />
      </div>
    </React.Fragment>
  );
}

// ── C) 詳細確認 ────────────────────────────────────────────────────────────────

function DocDetailScreen({ doc, onBack, onEdit }) {
  return (
    <React.Fragment>
      <div className="topbar" data-screen-label="ガイド資料詳細確認">
        <div>
          <div className="crumbs">
            <span>deep_Admin</span><span className="sep">/</span>
            <a className="crumb-link" onClick={onBack}>ガイド資料</a><span className="sep">/</span>
            <span className="current">{doc.name || doc.id}</span>
          </div>
          <div className="title-row">
            <button className="btn ghost sm back-btn" onClick={onBack}>← 一覧に戻る</button>
            <h1>{doc.name || "（無題）"}</h1>
            <span className={`badge ${doc.scope === "共通" ? "teal" : "blue"}`} style={{ marginLeft: 4 }}>{doc.scope}</span>
            <span className={`badge ${doc.type === "注意事項" ? "coral" : "outline"}`}>{doc.type}</span>
          </div>
        </div>
        <div className="flex-row" style={{ gap: 8 }}>
          <button className="btn primary" onClick={onEdit}>編集する</button>
        </div>
      </div>

      <div className="status-strip">
        <div className="status-cell id"><span className="status-label">資料ID</span><strong>{doc.id}</strong></div>
        <div className="status-cell"><span className="status-label">スコープ / 種別</span><strong>{doc.scope} / {doc.type}</strong></div>
        <div className="status-cell"><span className="status-label">資料種別</span><strong>{doc.docType}</strong></div>
        <div className="status-cell"><span className="status-label">割り当て</span><strong>{doc.assignedTo.length}件</strong></div>
        <div className="status-actions"><button className="btn primary" onClick={onEdit}>編集する</button></div>
      </div>

      <div className="content-grid">
        <section className="editor-pane">
          <div className="editor-content" style={{ display: "grid", gap: "var(--sp-6)" }}>
            <div className="form-section readonly-mode">
              <GB.SectionHead title="資料詳細" desc="読み取り専用。変更するには「編集する」を押してください。" />
              <GuideDocFields doc={doc} update={() => {}} readonly isCreate={false} />
            </div>
            <AssignmentTable doc={doc} readonly />
          </div>
        </section>
        <GDPreviewPane doc={doc} badge="確認プレビュー" />
      </div>
    </React.Fragment>
  );
}

// ── Orchestrator ─────────────────────────────────────────────────────────────

function GuideDocFlow({ navSignal }) {
  const [docs, setDocs] = useGState(() => (window.SEED.guideDocs || []).map(d => ({ ...d })));
  const [view, setView] = useGState("list");   // list | detail | create | edit
  const [currentId, setCurrentId] = useGState(null);
  const [draft, setDraft] = useGState(null);

  const firstNav = useGRef(true);
  useGEffect(() => {
    if (firstNav.current) { firstNav.current = false; return; }
    setView("list"); setCurrentId(null); setDraft(null);
  }, [navSignal]);

  const current = docs.find(d => d.id === currentId);

  const goList = () => setView("list");
  const openView = (id) => { setCurrentId(id); setView("detail"); };
  const openCreate = () => { setDraft(blankDoc()); setView("create"); };
  const openEdit = (id) => { setCurrentId(id); setDraft({ ...docs.find(d => d.id === id) }); setView("edit"); };
  const cancelForm = () => { (view === "create") ? goList() : openView(currentId); setDraft(null); };
  const saveCreate = () => {
    const id = `doc-${Date.now().toString(36)}`;
    const doc = { ...draft, id, name: draft.name || "（無題）" };
    setDocs(list => [...list, doc]);
    setDraft(null); setCurrentId(id); setView("detail");
  };
  const saveEdit = () => {
    setDocs(list => list.map(d => d.id === currentId ? { ...draft, id: currentId } : d));
    setDraft(null); setView("detail");
  };

  if (view === "list") {
    return <GuideDocFlowList rows={docs} onCreate={openCreate} onView={openView} onEdit={openEdit} />;
  }
  if (view === "create" || view === "edit") {
    return (
      <DocFormScreen mode={view} doc={draft}
        update={patch => setDraft(d => ({ ...d, ...patch }))}
        onSave={view === "create" ? saveCreate : saveEdit} onCancel={cancelForm} />
    );
  }
  if (view === "detail") {
    if (!current) { goList(); return null; }
    return <DocDetailScreen doc={current} onBack={goList} onEdit={() => openEdit(currentId)} />;
  }
  return null;
}

window.GuideDocFlow = GuideDocFlow;
