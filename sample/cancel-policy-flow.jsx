// cancel-policy-flow.jsx — キャンセルポリシー文言テンプレート「1画面1操作」フロー
//   A) 一覧        TmplFlowList     各行「詳細を見る」「編集」／上部「＋ 新規作成」（ここだけ）
//   B) 新規作成    TmplFormScreen(create)  名称・言語・有効/無効・本文＋変数挿入＋インラインプレビュー
//   C) 詳細確認    TmplDetailScreen        全フィールド読み取り専用＋変数置換プレビュー／「編集する」
//   D) 編集        TmplFormScreen(edit)    編集フォーム／「保存」「キャンセル」
//
// 詳細内のSTEP1（テンプレート一覧タブ）と二重の新規作成導線を撤去し、詳細確認・編集は1件に絞る。

const { useState: useCState, useMemo: useCMemo, useRef: useCRef, useEffect: useCEffect } = React;
const { SearchBar: CSearchBar, ToggleFilter: CToggleFilter, TabFilter: CTabFilter, ResultCounter: CCounter, ClearFiltersButton: CClear } = window.ListFilters;
const CBk = window.UIBlocks;
const CIcon = window.UIBlocks.Icon;

const TMPL_VARS = [
  { token: "{{ freeCancelDeadline }}", label: "無料キャンセル期限" },
  { token: "{{ cancellationFeeRate }}", label: "キャンセル料率" },
  { token: "{{ cancellationFeeStart }}", label: "キャンセル料発生時点" },
];
const TMPL_SAMPLE = {
  freeCancelDeadline: "開始24時間前",
  cancellationFeeRate: "100%",
  cancellationFeeStart: "開始24時間以内",
};
function renderTmplBody(body) {
  return String(body || "").replace(/\{\{\s*(\w+)\s*\}\}/g, (m, k) => (TMPL_SAMPLE[k] != null ? TMPL_SAMPLE[k] : m));
}

function blankTemplate() {
  return { id: "CT-自動採番", name: "", lang: "日本語", enabled: true, body: "", note: "", updatedAt: "" };
}

// ── shared body editor (form + detail) ───────────────────────────────────────

function TemplateBody({ template, update, readonly }) {
  const bodyRef = useCRef(null);
  const insertVar = (token) => {
    if (readonly) return;
    const ta = bodyRef.current;
    const cur = template.body || "";
    let start = cur.length, end = cur.length;
    if (ta) { start = ta.selectionStart ?? cur.length; end = ta.selectionEnd ?? cur.length; }
    const next = cur.slice(0, start) + token + cur.slice(end);
    update({ body: next });
    requestAnimationFrame(() => { if (ta) { ta.focus(); const p = start + token.length; ta.setSelectionRange(p, p); } });
  };

  return (
    <React.Fragment>
      <div className="field-wide">
        <label className="field-label">{!readonly && <span className="req" />}<span>テンプレート本文</span></label>
        <textarea ref={bodyRef} rows={5} value={template.body || ""} readOnly={readonly}
          onChange={e => update({ body: e.target.value })}
          placeholder="無料キャンセルは {{ freeCancelDeadline }} まで可能です。" />
        {!readonly && (
          <div className="var-chip-row">
            <span className="var-chip-label">利用可能変数</span>
            {TMPL_VARS.map(v => (
              <button key={v.token} type="button" className="var-chip" onClick={() => insertVar(v.token)} title={`${v.label} を挿入`}>
                <code>{v.token}</code>
              </button>
            ))}
            <span className="var-chip-hint">クリックでカーソル位置に挿入</span>
          </div>
        )}
      </div>

      <div className="field-wide">
        <div className="field-label"><span>{readonly ? "変数置換プレビュー" : "プレビュー"}</span><span className="opt">サンプル値で表示</span></div>
        <div className="tmpl-preview">{renderTmplBody(template.body) || "（本文未入力）"}</div>
      </div>
    </React.Fragment>
  );
}

function TemplateFields({ template, update, readonly, isCreate }) {
  const { Field, SelectField, ToggleRow } = CBk;
  return (
    <div className="field-grid">
      <Field label="テンプレートID" value={isCreate ? "CT-自動採番" : template.id} readOnly mono help={isCreate ? "保存時に自動採番" : null} />
      <SelectField label="言語" value={template.lang} onChange={x => update({ lang: x })} options={["日本語", "English"]} readOnly={readonly} />
      <Field label="テンプレート名" required value={template.name} onChange={x => update({ name: x })} wide readOnly={readonly} maxLen={60} />
      <div className="field-wide">
        <div className="field-label"><span>有効 / 無効</span></div>
        <ToggleRow checked={!!template.enabled} onChange={readonly ? () => {} : v => update({ enabled: v })}
          title={template.enabled ? "有効" : "無効"} desc="無効にすると新規の文言生成では選択できなくなります" />
      </div>
      <TemplateBody template={template} update={update} readonly={readonly} />
      <Field label="備考" value={template.note} onChange={x => update({ note: x })} wide readOnly={readonly} />
    </div>
  );
}

// ── A) 一覧 ─────────────────────────────────────────────────────────────────

function TmplFlowList({ rows, onCreate, onView, onEdit }) {
  const [search, setSearch] = useCState("");
  const [lang, setLang] = useCState("すべて");
  const [enabledOnly, setEnabledOnly] = useCState(false);

  const filtered = useCMemo(() => {
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
    <div className="list-shell" data-screen-label="テンプレート一覧">
      <div className="topbar list-topbar">
        <div><div className="crumbs"><span>deep_Admin</span><span className="sep">/</span><span className="current">キャンセルポリシー文言</span></div></div>
      </div>

      <div className="list-view">
        <div className="list-header">
          <div>
            <h1>キャンセルポリシー文言テンプレート 一覧</h1>
            <p className="list-desc">OTA掲載やゲスト通知に使う定型文を管理します。行から詳細確認・編集に進みます。</p>
            <div className="list-meta-row">
              <CCounter total={rows.length} shown={filtered.length} hasFilter={hasFilter} />
              <CClear show={hasFilter} onClick={clearAll} />
            </div>
          </div>
          <div className="flex-row" style={{ gap: 10, alignSelf: "flex-start" }}>
            <button className="btn primary" onClick={onCreate}>＋ 新規作成</button>
          </div>
        </div>

        <div className="list-scope-row">
          <span className="lf-scope-label">言語</span>
          <CTabFilter options={["すべて", "日本語", "English"]} value={lang} onChange={setLang} />
        </div>

        <div className="list-filters">
          <CSearchBar value={search} onChange={setSearch} placeholder="テンプレート名・本文で検索..." />
          <div className="lf-controls">
            <CToggleFilter label="有効のみ" value={enabledOnly} onChange={setEnabledOnly} />
          </div>
        </div>

        <div className="list-table-wrap">
          <div className="table-scroll">
            <table className="list-table">
              <thead>
                <tr>
                  <th>テンプレート名</th>
                  <th style={{ width: 110 }}>言語</th>
                  <th style={{ width: 110 }}>有効/無効</th>
                  <th style={{ width: 120 }}>更新日</th>
                  <th className="actions" style={{ width: 196 }}>アクション</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && <tr><td colSpan="5" className="list-empty">該当するテンプレートがありません</td></tr>}
                {filtered.map(r => (
                  <tr key={r.id} className="list-row" onClick={() => onView(r.id)}>
                    <td><strong>{r.name || "（無題）"}</strong><div className="row-sub code-mono">{r.id}</div></td>
                    <td><span className={`badge ${r.lang === "日本語" ? "blue" : "outline"}`}>{r.lang}</span></td>
                    <td>{r.enabled ? <span className="badge teal"><span className="dot" />有効</span> : <span className="badge muted"><span className="dot" />無効</span>}</td>
                    <td className="muted" style={{ fontVariantNumeric: "tabular-nums" }}>{r.updatedAt || "—"}</td>
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

function TmplFormScreen({ mode, template, update, onSave, onCancel }) {
  const isCreate = mode === "create";
  return (
    <React.Fragment>
      <div className="topbar" data-screen-label={isCreate ? "テンプレート新規作成" : "テンプレート編集"}>
        <div>
          <div className="crumbs">
            <span>deep_Admin</span><span className="sep">/</span>
            <a className="crumb-link" onClick={onCancel}>キャンセルポリシー文言</a><span className="sep">/</span>
            {!isCreate && <><span>{template.name || template.id}</span><span className="sep">/</span></>}
            <span className="current">{isCreate ? "新規作成" : "編集"}</span>
          </div>
          <div className="title-row">
            <button className="btn ghost sm back-btn" onClick={onCancel}>← キャンセル</button>
            <h1>{isCreate ? "テンプレート 新規作成" : "テンプレート 編集"}</h1>
            <span className={`status-pill ${isCreate ? "blue" : template.enabled ? "teal" : "muted"}`}>
              <span className="dot" />{isCreate ? "新規作成中" : template.enabled ? "有効" : "無効"}
            </span>
          </div>
        </div>
        <div className="flex-row" style={{ gap: 8 }}>
          <button className="btn" onClick={onCancel}>キャンセル</button>
          <button className="btn primary" onClick={onSave}>保存</button>
        </div>
      </div>

      <div className="content-grid" data-no-preview="true">
        <section className="editor-pane">
          <div className="editor-content">
            <div className="form-section">
              <CBk.SectionHead eyebrow={isCreate ? "新規作成" : "編集"} title="テンプレート編集"
                desc="本文に変数を埋め込むと、適用するTourOptionの値に自動で置き換わります。" />
              {!template.enabled && !isCreate && (
                <CBk.InfoNote amber icon={<CIcon.alert />}>
                  <strong>このテンプレートは無効です。</strong> 文言生成時の選択肢には表示されません。
                </CBk.InfoNote>
              )}
              <TemplateFields template={template} update={update} readonly={false} isCreate={isCreate} />
            </div>
          </div>
        </section>
      </div>
    </React.Fragment>
  );
}

// ── C) 詳細確認 ────────────────────────────────────────────────────────────────

function TmplDetailScreen({ template, onBack, onEdit }) {
  return (
    <React.Fragment>
      <div className="topbar" data-screen-label="テンプレート詳細確認">
        <div>
          <div className="crumbs">
            <span>deep_Admin</span><span className="sep">/</span>
            <a className="crumb-link" onClick={onBack}>キャンセルポリシー文言</a><span className="sep">/</span>
            <span className="current">{template.name || template.id}</span>
          </div>
          <div className="title-row">
            <button className="btn ghost sm back-btn" onClick={onBack}>← 一覧に戻る</button>
            <h1>{template.name || "（無題）"}</h1>
            {template.enabled ? <span className="badge teal" style={{ marginLeft: 4 }}><span className="dot" />有効</span>
              : <span className="badge muted" style={{ marginLeft: 4 }}><span className="dot" />無効</span>}
          </div>
        </div>
        <div className="flex-row" style={{ gap: 8 }}>
          <button className="btn primary" onClick={onEdit}>編集する</button>
        </div>
      </div>

      <div className="status-strip">
        <div className="status-cell id"><span className="status-label">テンプレートID</span><strong>{template.id}</strong></div>
        <div className="status-cell"><span className="status-label">言語</span><strong>{template.lang}</strong></div>
        <div className="status-cell"><span className="status-label">状態</span><strong>{template.enabled ? "有効" : "無効"}</strong></div>
        <div className="status-cell"><span className="status-label">更新日</span><strong>{template.updatedAt || "—"}</strong></div>
        <div className="status-actions"><button className="btn primary" onClick={onEdit}>編集する</button></div>
      </div>

      <div className="content-grid" data-no-preview="true">
        <section className="editor-pane">
          <div className="editor-content">
            <div className="form-section readonly-mode">
              <CBk.SectionHead title="テンプレート詳細" desc="読み取り専用。変更するには「編集する」を押してください。" />
              <TemplateFields template={template} update={() => {}} readonly isCreate={false} />
            </div>
          </div>
        </section>
      </div>
    </React.Fragment>
  );
}

// ── Orchestrator ─────────────────────────────────────────────────────────────

function CancelPolicyFlow({ navSignal }) {
  const [templates, setTemplates] = useCState(() => (window.SEED.cancelTemplates || []).map(t => ({ ...t })));
  const [view, setView] = useCState("list");   // list | detail | create | edit
  const [currentId, setCurrentId] = useCState(null);
  const [draft, setDraft] = useCState(null);

  const firstNav = useCRef(true);
  useCEffect(() => {
    if (firstNav.current) { firstNav.current = false; return; }
    setView("list"); setCurrentId(null); setDraft(null);
  }, [navSignal]);

  const current = templates.find(t => t.id === currentId);

  const goList = () => setView("list");
  const openView = (id) => { setCurrentId(id); setView("detail"); };
  const openCreate = () => { setDraft(blankTemplate()); setView("create"); };
  const openEdit = (id) => { setCurrentId(id); setDraft({ ...templates.find(t => t.id === id) }); setView("edit"); };
  const cancelForm = () => { (view === "create") ? goList() : openView(currentId); setDraft(null); };
  const saveCreate = () => {
    const id = `ct_${Date.now().toString(36)}`;
    const tmpl = { ...draft, id, name: draft.name || "（無題）", updatedAt: "2026/06/02" };
    setTemplates(list => [...list, tmpl]);
    setDraft(null); setCurrentId(id); setView("detail");
  };
  const saveEdit = () => {
    setTemplates(list => list.map(t => t.id === currentId ? { ...draft, id: currentId, updatedAt: "2026/06/02" } : t));
    setDraft(null); setView("detail");
  };

  if (view === "list") {
    return <TmplFlowList rows={templates} onCreate={openCreate} onView={openView} onEdit={openEdit} />;
  }
  if (view === "create" || view === "edit") {
    return (
      <TmplFormScreen mode={view} template={draft}
        update={patch => setDraft(d => ({ ...d, ...patch }))}
        onSave={view === "create" ? saveCreate : saveEdit} onCancel={cancelForm} />
    );
  }
  if (view === "detail") {
    if (!current) { goList(); return null; }
    return <TmplDetailScreen template={current} onBack={goList} onEdit={() => openEdit(currentId)} />;
  }
  return null;
}

window.CancelPolicyFlow = CancelPolicyFlow;
