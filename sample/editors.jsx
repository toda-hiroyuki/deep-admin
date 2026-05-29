// editors.jsx — Editor pane content for TourOption / ProductPage / GuideDoc
// Exports: <TourOptionEditor>, <ProductPageEditor>, <GuideDocEditor>
// Form inputs are controlled — every edit updates app state, which flows live into the preview.

const { useState, useRef, useMemo } = React;

// ── Icons (small inline SVGs) ───────────────────────────────────────────────
const Icon = {
  alert: (p) => (
    <svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M8 3v5" /><circle cx="8" cy="11.5" r=".5" fill="currentColor" stroke="none" /><circle cx="8" cy="8" r="6.5" />
    </svg>
  ),
  check: (p) => (
    <svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="m3 8 3.5 3.5L13 5" />
    </svg>
  ),
  info: (p) => (
    <svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <circle cx="8" cy="8" r="6.5" /><path d="M8 7.5v3.5" /><circle cx="8" cy="5.2" r=".5" fill="currentColor" stroke="none" />
    </svg>
  ),
  ext: (p) => (
    <svg viewBox="0 0 16 16" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M6 3H3.5v9.5H13V10" /><path d="M9 3h4v4" /><path d="m13 3-5.5 5.5" />
    </svg>
  ),
  drag: (p) => (
    <svg viewBox="0 0 12 12" width="10" height="10" fill="currentColor" {...p}>
      <circle cx="4" cy="3" r="1" /><circle cx="8" cy="3" r="1" />
      <circle cx="4" cy="6" r="1" /><circle cx="8" cy="6" r="1" />
      <circle cx="4" cy="9" r="1" /><circle cx="8" cy="9" r="1" />
    </svg>
  ),
  close: (p) => (
    <svg viewBox="0 0 12 12" width="10" height="10" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" {...p}>
      <path d="m3 3 6 6M9 3l-6 6" />
    </svg>
  ),
};
window.UIcon = Icon;

// ── Building blocks ─────────────────────────────────────────────────────────

function SectionHead({ title, desc, action, eyebrow }) {
  return (
    <div className="section-title">
      <div>
        {eyebrow && <p className="muted tiny" style={{margin:0,letterSpacing:'.06em',textTransform:'uppercase',fontWeight:600,marginBottom:4}}>{eyebrow}</p>}
        <h2>{title}</h2>
        {desc && <p>{desc}</p>}
      </div>
      {action}
    </div>
  );
}

function Field({ label, required, optional, value, onChange, placeholder, multiline, readOnly, wide, help, error, warn, ok, maxLen, mono, type = "text", affixLeft, affixRight, rows }) {
  const id = useRef(`f-${Math.random().toString(36).slice(2, 8)}`).current;
  const len = (value ?? "").length;
  const over = maxLen != null && len > maxLen;
  const cls = ["field"];
  if (wide) cls[0] = "field-wide";
  if (error || over) cls.push("has-error");
  else if (warn) cls.push("has-warn");
  else if (ok) cls.push("has-ok");

  const inputStyle = mono ? { fontFamily: '"JetBrains Mono", ui-monospace, "SF Mono", monospace', fontSize: 12.5 } : undefined;

  const inputEl = multiline ? (
    <textarea id={id} value={value ?? ""} onChange={e => onChange?.(e.target.value)} placeholder={placeholder} readOnly={readOnly} rows={rows} style={inputStyle} />
  ) : (
    <input id={id} type={type} value={value ?? ""} onChange={e => onChange?.(e.target.value)} placeholder={placeholder} readOnly={readOnly} style={inputStyle} />
  );

  const wrappedInput = (affixLeft || affixRight) ? (
    <div className="input-affix">
      {affixLeft && <div className="affix">{affixLeft}</div>}
      <input id={id} type={type} value={value ?? ""} onChange={e => onChange?.(e.target.value)} placeholder={placeholder} readOnly={readOnly} style={inputStyle} />
      {affixRight && <div className="affix right">{affixRight}</div>}
    </div>
  ) : inputEl;

  const showHelp = error || warn || ok || help || maxLen != null;

  return (
    <div className={cls.join(" ")}>
      <label className="field-label" htmlFor={id}>
        {required && <span className="req" aria-label="required" />}
        <span>{label}</span>
        {optional && <span className="opt">任意</span>}
      </label>
      {wrappedInput}
      {showHelp && (
        <div className={`field-help ${error || over ? "error" : warn ? "warn" : ok ? "ok" : ""}`}>
          {(error || over) && <Icon.alert />}
          {warn && !error && !over && <Icon.alert />}
          {ok && !error && !over && !warn && <Icon.check />}
          <span>{error || (over ? `${maxLen}文字以内で入力してください` : (warn || ok || help || ""))}</span>
          {maxLen != null && <span className={`char-count ${over ? "over" : ""}`}>{len}/{maxLen}</span>}
        </div>
      )}
    </div>
  );
}

function SelectField({ label, value, onChange, options, required, wide, help, readOnly }) {
  const id = useRef(`s-${Math.random().toString(36).slice(2, 8)}`).current;
  return (
    <div className={wide ? "field-wide" : "field"}>
      <label className="field-label" htmlFor={id}>
        {required && <span className="req" />}
        <span>{label}</span>
      </label>
      <select id={id} value={value ?? ""} onChange={e => onChange?.(e.target.value)} disabled={readOnly}>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
      {help && <div className="field-help"><Icon.info /><span>{help}</span></div>}
    </div>
  );
}

function TagField({ label, value = [], onChange, wide, help, readOnly }) {
  const [draft, setDraft] = useState("");
  const remove = (i) => onChange?.(value.filter((_, idx) => idx !== i));
  const add = () => {
    const v = draft.trim();
    if (!v) return;
    onChange?.([...value, v]);
    setDraft("");
  };
  return (
    <div className={wide ? "field-wide" : "field"}>
      <div className="field-label"><span>{label}</span><span className="opt">任意</span></div>
      <div className="tag-input">
        {value.map((tag, i) => (
          <span className="tag-chip" key={i}>
            {tag}
            {!readOnly && <button type="button" onClick={() => remove(i)} aria-label="削除"><Icon.close /></button>}
          </span>
        ))}
        {!readOnly && (
          <input
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); add(); }}}
            placeholder={value.length ? "" : "Enterで追加"}
          />
        )}
      </div>
      {help && <div className="field-help"><Icon.info /><span>{help}</span></div>}
    </div>
  );
}

function ToggleRow({ checked, onChange, title, desc }) {
  return (
    <label className={`toggle-row ${checked ? "on" : ""}`}>
      <input type="checkbox" checked={!!checked} onChange={e => onChange?.(e.target.checked)} />
      <div className="tx">
        <strong>{title}</strong>
        {desc && <span>{desc}</span>}
      </div>
    </label>
  );
}

function InfoNote({ children, amber, icon }) {
  return (
    <div className={`info-note ${amber ? "amber" : ""}`}>
      {(icon ?? <Icon.info />)}
      <p>{children}</p>
    </div>
  );
}

window.UIBlocks = { SectionHead, Field, SelectField, TagField, ToggleRow, InfoNote, Icon };

// ── DurationField: HH:MM input ──────────────────────────────────────────────
function DurationField({ label, value, onChange, required, readOnly }) {
  // parse from "3時間", "3時間30分", or "HH:MM"
  const parsed = (() => {
    if (!value) return { h: 0, m: 0 };
    const colon = /^(\d{1,2}):(\d{1,2})$/.exec(value);
    if (colon) return { h: Number(colon[1]) || 0, m: Number(colon[2]) || 0 };
    const hm = /(\d+)\s*時間(?:\s*(\d+)\s*分)?/.exec(value);
    if (hm) return { h: Number(hm[1]) || 0, m: Number(hm[2] || 0) };
    const mOnly = /(\d+)\s*分/.exec(value);
    if (mOnly) return { h: 0, m: Number(mOnly[1]) || 0 };
    return { h: 0, m: 0 };
  })();

  const set = (h, m) => {
    const hh = String(h).padStart(2, "0");
    const mm = String(m).padStart(2, "0");
    onChange?.(`${hh}:${mm}`);
  };

  return (
    <div className="field">
      <label className="field-label">
        {required && <span className="req" />}
        <span>{label}</span>
      </label>
      <div className="duration-input">
        <input
          type="number" min="0" max="23"
          value={parsed.h}
          onChange={e => set(Number(e.target.value) || 0, parsed.m)}
          readOnly={readOnly}
        />
        <span className="sep">:</span>
        <input
          type="number" min="0" max="59"
          value={String(parsed.m).padStart(2, "0")}
          onChange={e => set(parsed.h, Math.min(59, Number(e.target.value) || 0))}
          readOnly={readOnly}
        />
      </div>
    </div>
  );
}

// ── CancelPolicyField: [number] [unit ▼] {trail} ──────────────────────────
function CancelPolicyField({ label, value, onChange, readOnly, trail = "前まで無料キャンセル", defaultUnit = "時間" }) {
  const parsed = (() => {
    if (!value) return { n: 24, unit: defaultUnit };
    const m = /(\d+)\s*(時間|日)/.exec(value);
    if (m) return { n: Number(m[1]) || 0, unit: m[2] };
    return { n: 24, unit: defaultUnit };
  })();

  const set = (n, unit) => onChange?.(`${n}${unit}${trail}`);

  return (
    <div className="field-wide">
      <label className="field-label">
        <span>{label}</span>
      </label>
      <div className="policy-input">
        <input
          type="number" min="0"
          value={parsed.n}
          onChange={e => set(Number(e.target.value) || 0, parsed.unit)}
          readOnly={readOnly}
        />
        <select
          value={parsed.unit}
          onChange={e => set(parsed.n, e.target.value)}
          disabled={readOnly}
        >
          <option value="時間">時間</option>
          <option value="日">日</option>
        </select>
        <span className="trail">{trail}</span>
      </div>
    </div>
  );
}

window.UIBlocks2 = { DurationField, CancelPolicyField };

// ── Cancel template fill: map a TourOption's own settings onto template vars ──
function buildCancelTemplateValues(t) {
  const rate = t.cancellationFeeRate;
  return {
    freeCancelDeadline: (t.freeCancelDeadline ?? "").toString().trim(),
    cancellationFeeRate: (rate === null || rate === undefined || rate === "") ? "" : `${Number(rate)}%`,
    cancellationFeeStart: (t.cancellationFeeStart ?? "").toString().trim(),
  };
}
// Render a template body, substituting filled values and leaving unfilled
// {{ vars }} highlighted in orange.
function renderFilledTemplate(body, values) {
  const parts = String(body || "").split(/(\{\{\s*\w+\s*\}\})/g);
  return parts.map((seg, i) => {
    const m = seg.match(/^\{\{\s*(\w+)\s*\}\}$/);
    if (!m) return <React.Fragment key={i}>{seg}</React.Fragment>;
    const key = m[1];
    const val = values[key];
    if (val != null && String(val).length > 0) {
      return <React.Fragment key={i}>{val}</React.Fragment>;
    }
    return <span key={i} className="tmpl-var-empty">{`{{ ${key} }}`}</span>;
  });
}

// ── CancelConditionSection: structured cancellation policy fields ───────────
function CancelConditionSection({ t, update, readonly }) {
  const feeRate = Number(t.cancellationFeeRate ?? 0);
  const refundRate = Math.max(0, Math.min(100, 100 - feeRate));
  const nonRef = !!t.nonRefundable;
  const feeDisabled = readonly || nonRef;
  const cancelTemplates = (typeof SEED !== "undefined" && SEED.cancelTemplates) ? SEED.cancelTemplates : [];
  const selTemplate = cancelTemplates.find(x => x.id === t.cancelPolicyTemplateId);
  const templateValues = buildCancelTemplateValues(t);

  return (
    <div className="cancel-condition">
      <div className="subhead">
        <h4>キャンセル条件</h4>
        <p>無料キャンセル期限・キャンセル料率・返金条件をまとめて設定します。</p>
      </div>

      {nonRef && (
        <InfoNote amber icon={<Icon.alert />}>
          <strong>この商品は返金不可として販売されます。</strong> キャンセル料率・返金率の設定は参照されず、予約確定後の返金は行われません。
        </InfoNote>
      )}

      <div className="field-grid three">
        <CancelPolicyField
          label="無料キャンセル期限"
          value={t.freeCancelDeadline}
          onChange={x => update({ freeCancelDeadline: x, cancelPolicy: x })}
          readOnly={readonly || nonRef}
          trail="前まで無料キャンセル"
        />

        <div className={`field ${feeDisabled ? "field-deemphasized" : ""}`}>
          <label className="field-label"><span>キャンセル料率</span></label>
          <div className="input-affix">
            <input
              type="number" min="0" max="100"
              value={feeRate}
              onChange={e => update({ cancellationFeeRate: Math.max(0, Math.min(100, Number(e.target.value) || 0)) })}
              readOnly={readonly} disabled={feeDisabled}
            />
            <div className="affix right">%</div>
          </div>
          {feeRate === 0 && !nonRef
            ? <div className="field-help"><Icon.info /><span style={{opacity:0.75}}>キャンセル料なし（全額返金）</span></div>
            : <div className="field-help" style={{visibility:'hidden'}}><Icon.info /><span>―</span></div>}
        </div>

        <div className="field field-deemphasized">
          <label className="field-label"><span>返金率</span><span className="opt">自動算出</span></label>
          <div className="input-affix">
            <input type="text" value={String(nonRef ? 0 : refundRate)} readOnly disabled />
            <div className="affix right">%</div>
          </div>
          <div className="field-help"><Icon.info /><span style={{opacity:0.75}}>キャンセル料率から自動算出（編集不可）</span></div>
        </div>
      </div>

      <div className="field-wide" style={{marginTop:2}}>
        <ToggleRow
          checked={nonRef}
          onChange={v => update({ nonRefundable: v })}
          title="返金不可として販売する"
          desc="ON にするとキャンセル料率・返金率は参照されず、返金不可商品になります"
        />
      </div>

      {nonRef && (
        <div className="field-grid">
          <Field label="返金不可理由 / 備考" value={t.nonRefundableNote} onChange={x => update({ nonRefundableNote: x })} wide multiline readOnly={readonly} placeholder="例: 特価セール商品のため返金不可" help="ゲスト向け表示に補足する場合のメモ" />
        </div>
      )}

      <div className="field-grid">
        <SelectField label="日程変更可否" value={t.reschedulePolicy} onChange={x => update({ reschedulePolicy: x })} options={["可", "不可", "要相談"]} readOnly={readonly} />
        <Field label="例外的な返金ルールのメモ" value={t.exceptionalRefundMemo} onChange={x => update({ exceptionalRefundMemo: x })} wide multiline readOnly={readonly} help="天候・ガイド都合など例外対応のメモ。社外非公開" />

        <div className="field-wide">
          <label className="field-label">
            {!readonly && <span className="req" />}
            <span>キャンセルポリシー文言テンプレート</span>
          </label>
          {readonly ? (
            <div className="readonly-text">{selTemplate ? selTemplate.name : "（未選択）"}</div>
          ) : (
            <select
              value={t.cancelPolicyTemplateId ?? ""}
              onChange={e => update({ cancelPolicyTemplateId: e.target.value })}
            >
              <option value="">— テンプレートを選択 —</option>
              {cancelTemplates.map(x => (
                <option key={x.id} value={x.id}>{x.name}</option>
              ))}
            </select>
          )}
          {selTemplate && (
            <div className="tmpl-inline-preview">
              <span className="tmpl-inline-preview-label">プレビュー</span>
              <p>{renderFilledTemplate(selTemplate.body, templateValues)}</p>
            </div>
          )}
          {!readonly && (
            <div className="field-help"><Icon.info /><span>ゲストへの表示文に使うテンプレートを選択します</span></div>
          )}
        </div>

        <Field label="社内メモ" value={t.cancelInternalMemo} onChange={x => update({ cancelInternalMemo: x })} wide multiline readOnly={readonly} help="運用調整・申し送りなど。社外非公開" />
      </div>
    </div>
  );
}

// ── TourOption Editor ───────────────────────────────────────────────────────

function TourOptionEditor({ tab, mode, data, update, validation }) {
  const readonly = mode === "review";
  const v = validation || {};
  const t = data;

  if (tab === "basic") {
    return (
      <div className={`form-section ${readonly ? "readonly-mode" : ""}`}>
        <SectionHead
          eyebrow="STEP 1"
          title="TourOption基本情報"
          desc="IDは保存時に自動採番、コードは業務上の不変キーとして扱います。"
        />
        <div className="field-grid">
          <Field label="TourOption ID" value={mode === "create" ? "TO-自動採番" : t.id} readOnly help="保存時に発番" mono />
          <Field label="TourOptionコード" required value={t.code} onChange={x => update({ code: x })} placeholder="G-XXX-000-0-XX" mono readOnly={readonly} error={v.code} help={!v.code ? "業務コード（不変）" : null} />
          <Field label="テーマタイトル" value={t.theme} onChange={x => update({ theme: x })} readOnly={readonly} />
          <Field label="TourOption名" required value={t.name} onChange={x => update({ name: x })} readOnly={readonly} maxLen={60} />
          <Field label="正式名称（英）" value={t.officialName} onChange={x => update({ officialName: x })} wide readOnly={readonly} />
          <Field label="選択表示名" required value={t.selectionName} onChange={x => update({ selectionName: x })} readOnly={readonly} help="商品ページのオプション選択に表示されます" maxLen={30} />
          <TagField label="タグ / バッジ" value={t.tags} onChange={x => update({ tags: x })} readOnly={readonly} help="ゲスト向けに表示する短いキーワード" />
          <Field label="短い説明" required value={t.shortDescription} onChange={x => update({ shortDescription: x })} wide multiline readOnly={readonly} maxLen={80} help="一覧・選択カードに表示される1〜2行" />
          <Field label="詳細説明" value={t.detailDescription} onChange={x => update({ detailDescription: x })} wide multiline readOnly={readonly} maxLen={400} />
        </div>
      </div>
    );
  }

  if (tab === "conditions") {
    return (
      <div className={`form-section ${readonly ? "readonly-mode" : ""}`}>
        <SectionHead
          eyebrow="STEP 2"
          title="提供条件"
          desc="所要時間、人数、集合場所など、実際の催行に必要な条件を管理します。"
        />
        <div className="field-grid three">
          <SelectField label="商品種類" required value={t.type} onChange={x => update({ type: x })} options={["ガイドツアー", "施設体験", "移動付きツアー"]} readOnly={readonly} />
          <SelectField label="カテゴリ" required value={t.category} onChange={x => update({ category: x })} options={["Food & Drink", "Culture", "Nature", "Private Tour"]} readOnly={readonly} />
          <Field label="エリア名" value={t.area} onChange={x => update({ area: x })} readOnly={readonly} />
          <Field label="都道府県" value={t.prefecture} onChange={x => update({ prefecture: x })} readOnly={readonly} />
          <Field label="市区町村" value={t.city} onChange={x => update({ city: x })} readOnly={readonly} />
          <DurationField label="所要時間" required value={t.duration} onChange={x => update({ duration: x })} readOnly={readonly} />
        </div>
        <div className="field-grid three">
          <Field label="1予約あたり最小人数" required value={t.minBooking} onChange={x => update({ minBooking: x })} readOnly={readonly} affixRight="名" type="number" />
          <Field label="1予約あたり最大人数" required value={t.maxBooking} onChange={x => update({ maxBooking: x })} readOnly={readonly} affixRight="名" type="number" />
          <Field label="1催行回あたり定員" value={t.capacity} onChange={x => update({ capacity: x })} readOnly={readonly} affixRight="名" type="number" />
        </div>
        <div className="field-grid">
          <Field label="集合場所" required value={t.meetingPlace} onChange={x => update({ meetingPlace: x })} wide readOnly={readonly} />
          <Field label="集合場所英語名" value={t.meetingPlaceEn} onChange={x => update({ meetingPlaceEn: x })} wide readOnly={readonly} />
          <Field label="Google Map URL" value={t.mapUrl} onChange={x => update({ mapUrl: x })} wide readOnly={readonly} type="url" affixLeft="https://" warn={t.mapUrl && !t.mapUrl.startsWith("https://maps") ? "Google MapのURLか確認してください" : null} />
          <SelectField label="ピックアップ" value={t.pickup} onChange={x => update({ pickup: x })} options={["なし", "あり", "要相談"]} readOnly={readonly} />
          <Field label="解散場所" value={t.dropoff} onChange={x => update({ dropoff: x })} readOnly={readonly} />
        </div>
      </div>
    );
  }

  if (tab === "sales") {
    const isDraft = t.salesStatus === "下書き";
    const isPublished = t.salesStatus === "掲載中";
    const isPrivate = t.salesStatus === "非公開";
    const tieredOn = !!t.tieredPricingEnabled;
    return (
      <div className={`form-section ${readonly ? "readonly-mode" : ""}`}>
        <SectionHead
          eyebrow="STEP 3"
          title="販売条件"
          desc="予約期限、価格参照、キャンセル条件、販売ステータスをまとめて確認します。"
        />
        <div className="field-grid">
          <CancelPolicyField label="予約期限" value={t.cutoff} onChange={x => update({ cutoff: x })} readOnly={readonly} trail="前まで予約可能" />
          <div className={`field ${tieredOn ? "field-deemphasized" : ""}`}>
            <label className="field-label">
              {!tieredOn && <span className="req" />}
              <span>基準販売価格</span>
              {tieredOn && <span className="opt" style={{textTransform:'none',letterSpacing:0,color:'var(--amber)',fontWeight:600}}>（段階価格適用時は参照しない）</span>}
            </label>
            <div className="input-affix">
              <input
                type="number"
                value={t.price?.replace(/[^\d]/g, "") ?? ""}
                onChange={e => update({ price: `¥${Number(e.target.value || 0).toLocaleString()}` })}
                readOnly={readonly || tieredOn}
                disabled={tieredOn}
              />
              <div className="affix right">円</div>
            </div>
          </div>
        </div>

        <TieredPricingSection
          enabled={tieredOn}
          tiers={t.tieredPrices || []}
          onToggle={v => update({ tieredPricingEnabled: v })}
          onChange={tiers => update({ tieredPrices: tiers })}
          readonly={readonly}
        />

        <CancelConditionSection t={t} update={update} readonly={readonly} />

        <div className="field-grid">
          <SelectField label="価格・原価確認" value={t.costCheck} onChange={x => update({ costCheck: x })} options={["未確認", "原価確認済み", "再確認が必要"]} readOnly={readonly} />

          <div className="field-wide">
            <div className="field-label"><span>販売ステータス</span></div>
            <div className="sales-status-row">
              <div className="status-readout">
                <span className={`status-chip ${isDraft ? "is-draft" : isPublished ? "is-pub" : "is-priv"}`}>
                  <span className="dot"/>{t.salesStatus || "下書き"}
                </span>
                <span className="muted tiny">ステータスはシステムが自動判定します（編集不可）</span>
              </div>
              <label className={`publish-toggle ${isDraft ? "disabled" : ""}`}>
                <input
                  type="checkbox"
                  checked={isPublished}
                  disabled={isDraft || readonly}
                  onChange={e => update({ salesStatus: e.target.checked ? "掲載中" : "非公開" })}
                />
                <span className="tx">
                  <strong>掲載する</strong>
                  <span>ON → 掲載中 / OFF → 非公開</span>
                </span>
              </label>
            </div>
            <div className="field-help">
              <Icon.info />
              <span>公開前チェックが全項目通過すると掲載できます。</span>
            </div>
          </div>

          <Field label="販売停止理由" value="" onChange={x => update({ pauseReason: x })} wide multiline readOnly={readonly} placeholder="一時停止時のみ入力" help="販売ステータスが「一時停止」のときのみ必須" />
        </div>
      </div>
    );
  }

  if (tab === "content") {
    return (
      <div className={`form-section ${readonly ? "readonly-mode" : ""}`}>
        <SectionHead
          eyebrow="STEP 4"
          title="コンテンツ"
          desc="ゲスト向けの表示内容を管理します。ガイド向け行程は「ガイド資料」で管理します。"
        />
        <InfoNote>
          <strong>注意:</strong> ガイド向け行程（詳細オペレーション手順）は「ガイド資料」画面の資料種別「行程」として管理します。このタブのスケジュールはゲストに表示する概要です。
        </InfoNote>
        <div className="field-grid">
          <Field label="ゲスト向けスケジュール" required value={t.guestSchedule} onChange={x => update({ guestSchedule: x })} wide multiline readOnly={readonly} maxLen={300} />
          <Field label="含まれるもの (Inclusions)" value={t.inclusions} onChange={x => update({ inclusions: x })} multiline readOnly={readonly} />
          <Field label="含まれないもの (Exclusions)" value={t.exclusions} onChange={x => update({ exclusions: x })} multiline readOnly={readonly} />
          <Field label="TourOption代表画像URL" value="https://images.unsplash.com/photo-1528360983277-13d401cdc186" onChange={() => {}} wide readOnly={readonly} type="url" ok="画像読み込み確認済み" />
          <Field label="画像ギャラリーURL一覧" value="祇園夜景, 食事, 集合場所, 街歩き" onChange={() => {}} wide multiline readOnly={readonly} help="4件の画像を登録済み" />
        </div>
      </div>
    );
  }

  if (tab === "ops") {
    const assigned = SEED.guideDocs.filter(d => d.assignedTo.includes(t.code));
    const commonDocs = assigned.filter(d => d.scope === "共通");
    const indivDocs = assigned.filter(d => d.scope === "個別");
    return (
      <div className={`form-section ${readonly ? "readonly-mode" : ""}`}>
        <SectionHead eyebrow="STEP 5" title="運営・確認" desc="ガイド向けメモ、参考資料・注意事項・行程、公開前チェックを確認します。" />
        <div className="field-grid">
          <Field label="ガイド向け注意事項" value={t.guideMemo} onChange={x => update({ guideMemo: x })} wide multiline readOnly={readonly} />
          <Field label="営業時間・定休日メモ" value="月曜定休の店舗があるため代替候補を確認" onChange={() => {}} wide readOnly={readonly} />
          <Field label="施設予約必要有無" value="一部店舗は予約推奨" onChange={() => {}} readOnly={readonly} />
        </div>

        <div className="section-title" style={{marginTop:8}}>
          <div>
            <h3>割り当て済みガイド向け資料</h3>
            <p style={{margin:'4px 0 0',color:'var(--muted)',fontSize:12.5}}>このTourOptionに紐付いている共通・個別の資料です。詳細はガイド資料画面で管理します。</p>
          </div>
          <span className="badge teal">{assigned.length}件</span>
        </div>

        <div>
          <div className="field-label" style={{marginBottom:8,display:'flex',alignItems:'center',gap:8}}>
            <span>共通資料</span>
            <span className="badge blue">{commonDocs.length}件</span>
          </div>
          <DocTable docs={commonDocs} />
        </div>
        <div>
          <div className="field-label" style={{marginBottom:8,display:'flex',alignItems:'center',gap:8}}>
            <span>個別資料</span>
            <span className="badge teal">{indivDocs.length}件</span>
          </div>
          <DocTable docs={indivDocs} />
        </div>
      </div>
    );
  }
  if (tab === "channels") {
    return <ChannelsTab data={t} update={update} readonly={readonly} />;
  }
  return null;
}

// ── Tiered Pricing section ─────────────────────────────────────────────
function TieredPricingSection({ enabled, tiers, onToggle, onChange, readonly }) {
  const [sampleN, setSampleN] = useState(6);

  const updateTier = (id, patch) => {
    onChange(tiers.map(t => t.id === id ? { ...t, ...patch } : t));
  };
  const removeTier = (id) => onChange(tiers.filter(t => t.id !== id));
  const addTier = () => {
    const last = tiers[tiers.length - 1];
    const nextMin = last ? Math.max((last.openMax ? last.min : (last.max ?? last.min)) + 1, 1) : 1;
    onChange([...tiers, { id: `tp-${Date.now()}`, min: nextMin, max: nextMin + 1, price: 6000, openMax: false }]);
  };

  // Validation: detect overlaps, empty / inverted ranges
  const tierErrors = useMemo(() => {
    const errs = tiers.map(() => null);
    tiers.forEach((t, i) => {
      const min = Number(t.min);
      const max = t.openMax ? Infinity : Number(t.max);
      if (!min || min < 1) errs[i] = "下限が未入力";
      else if (!t.openMax && (!max || max < min)) errs[i] = "上限が下限を下回っています";
      else {
        // overlap check
        for (let j = 0; j < tiers.length; j++) {
          if (i === j) continue;
          const o = tiers[j];
          const oMin = Number(o.min);
          const oMax = o.openMax ? Infinity : Number(o.max);
          if (min <= oMax && oMin <= max) { errs[i] = "他の人数帯と重複しています"; break; }
        }
      }
    });
    return errs;
  }, [tiers]);

  // calc preview
  const matched = tiers.find(t => {
    const min = Number(t.min);
    const max = t.openMax ? Infinity : Number(t.max);
    return sampleN >= min && sampleN <= max;
  });
  const total = matched ? sampleN * Number(matched.price) : null;

  return (
    <section className={`tiered-pricing ${enabled ? "is-on" : "is-off"}`}>
      <div className="section-title" style={{borderBottom:'1px solid var(--line)'}}>
        <div>
          <h2>段階価格 <span className="muted" style={{fontWeight:500,fontSize:13,letterSpacing:0}}>(Tiered Pricing)</span></h2>
          <p>予約人数に応じて1名あたりの単価が変動する場合に設定します。</p>
        </div>
        <label className={`toggle-row ${enabled ? "on" : ""}`} style={{minWidth:220, cursor: readonly ? 'default':'pointer'}}>
          <input type="checkbox" checked={enabled} disabled={readonly} onChange={e => onToggle(e.target.checked)} />
          <div className="tx">
            <strong>段階価格を使用する</strong>
            <span>{enabled ? "予約時の人数に応じて単価を適用" : "基準販売価格を一律で適用"}</span>
          </div>
        </label>
      </div>

      {enabled ? (
        <>
          <InfoNote amber icon={<Icon.alert />}>
            <strong>段階価格が有効です。</strong> 基準販売価格は参照されません。予約時の人数に応じて以下の単価が適用されます。
          </InfoNote>

          <div className="table-wrap tier-table-wrap">
            <table className="tier-table">
              <thead>
                <tr>
                  <th style={{width:28}}></th>
                  <th style={{width:140}}>人数帯（下限）</th>
                  <th style={{width:180}}>人数帯（上限）</th>
                  <th>1名あたり単価（税込）</th>
                  <th className="actions" style={{width:80}}>操作</th>
                </tr>
              </thead>
              <tbody>
                {tiers.map((t, i) => {
                  const err = tierErrors[i];
                  return (
                    <tr key={t.id} className={err ? "tier-row has-warn" : "tier-row"}>
                      <td className="drag-cell">
                        <span className="drag-handle" title="ドラッグして並べ替え"><Icon.drag /></span>
                      </td>
                      <td>
                        <div className="input-affix tier-input">
                          <input type="number" min={1} value={t.min} onChange={e => updateTier(t.id, { min: Number(e.target.value) || 0 })} readOnly={readonly} />
                          <div className="affix right">名</div>
                        </div>
                      </td>
                      <td>
                        {t.openMax ? (
                          <div className="open-max-cell">
                            <span className="open-max-text">上限なし</span>
                            <label className="mini-check">
                              <input type="checkbox" checked={t.openMax} onChange={e => updateTier(t.id, { openMax: e.target.checked, max: e.target.checked ? null : (Number(t.min)+1) })} disabled={readonly} />
                              <span>上限なし</span>
                            </label>
                          </div>
                        ) : (
                          <div className="open-max-cell">
                            <div className="input-affix tier-input">
                              <input type="number" min={1} value={t.max ?? ""} onChange={e => updateTier(t.id, { max: Number(e.target.value) || 0 })} readOnly={readonly} />
                              <div className="affix right">名</div>
                            </div>
                            <label className="mini-check">
                              <input type="checkbox" checked={!!t.openMax} onChange={e => updateTier(t.id, { openMax: e.target.checked, max: e.target.checked ? null : (Number(t.min)+1) })} disabled={readonly} />
                              <span>上限なしにする</span>
                            </label>
                          </div>
                        )}
                      </td>
                      <td>
                        <div className="input-affix tier-input price">
                          <div className="affix">¥</div>
                          <input type="number" min={0} step={100} value={t.price} onChange={e => updateTier(t.id, { price: Number(e.target.value) || 0 })} readOnly={readonly} />
                        </div>
                      </td>
                      <td className="actions">
                        <button className="btn sm" onClick={() => removeTier(t.id)} style={{color:'var(--coral)'}} disabled={readonly || tiers.length <= 1}>削除</button>
                      </td>
                    </tr>
                  );
                })}
                {tierErrors.some(Boolean) && (
                  <tr className="tier-error-row">
                    <td colSpan={5}>
                      <div className="field-help warn" style={{margin:'4px 0'}}>
                        <Icon.alert />
                        <span>
                          {tierErrors.filter(Boolean).map((e, i) => <span key={i} style={{marginRight:12}}>・{e}</span>)}
                          人数帯が重複しないように調整してください。
                        </span>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <button className="btn add-tier" onClick={addTier} disabled={readonly}>
            <span style={{fontSize:14,lineHeight:1,marginRight:2}}>＋</span> 人数帯を追加
          </button>

          <div className="tier-preview">
            <div className="tier-preview-head">
              <span className="eyebrow-tag teal-tag">計算プレビュー</span>
              <span className="muted tiny">人数を変更すると、適用される単価帯がハイライトされます。</span>
            </div>
            <div className="tier-preview-body">
              <div className="sample-input">
                <span>例：</span>
                <div className="input-affix" style={{width:120}}>
                  <input type="number" min={1} value={sampleN} onChange={e => setSampleN(Number(e.target.value) || 1)} />
                  <div className="affix right">名</div>
                </div>
                <span>で予約</span>
              </div>
              <div className="calc-result">
                {matched ? (
                  <>
                    <span className="calc-eq">
                      {sampleN}名 × <strong>¥{Number(matched.price).toLocaleString()}</strong>
                      <span className="muted" style={{margin:'0 6px'}}>（{matched.openMax ? `${matched.min}名以上` : `${matched.min}〜${matched.max}名`}帯）</span>
                      = 
                    </span>
                    <span className="calc-total">¥{Number(total).toLocaleString()}</span>
                  </>
                ) : (
                  <span className="muted">指定の人数に該当する人数帯がありません</span>
                )}
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="tier-collapsed-note">
          <Icon.info />
          <span>段階価格は無効です。すべての予約に <strong>基準販売価格</strong> が一律で適用されます。</span>
        </div>
      )}
    </section>
  );
}

// ── Channels tab ─────────────────────────────────────────────────────────
function ChannelsTab({ data, update, readonly }) {
  const [rows, setRows] = useState(SEED.channelUrls);
  const [editingId, setEditingId] = useState("ch-01"); // demo: one row in inline-edit state
  const [draft, setDraft] = useState(() => {
    const r = SEED.channelUrls.find(x => x.id === "ch-01");
    return r ? { channel: r.channel, url: r.url, enabled: !!r.enabled } : {};
  });

  const startEdit = (row) => {
    setEditingId(row.id);
    setDraft({ channel: row.channel, url: row.url, enabled: !!row.enabled });
  };
  const cancelEdit = () => { setEditingId(null); setDraft({}); };
  const saveEdit = () => {
    setRows(list => list.map(r => r.id === editingId
      ? { ...r, channel: draft.channel ?? r.channel, url: draft.url ?? r.url, enabled: draft.enabled ?? r.enabled, updatedAt: "2026/05/28" }
      : r));
    setEditingId(null); setDraft({});
  };
  const toggleEnabled = (id) => {
    setRows(list => list.map(r => r.id === id && r.enabled !== null ? { ...r, enabled: !r.enabled } : r));
  };
  const removeRow = (id) => setRows(list => list.filter(r => r.id !== id));

  return (
    <div className={`form-section ${readonly ? "readonly-mode" : ""}`}>
      <SectionHead
        eyebrow="STEP 6"
        title="チャネル別URL"
        desc="各OTA・自社サイトでの掲載URLを管理します。担当ガイドの案件詳細でゲストが見ていたページを表示するために使用されます。"
      />

      <InfoNote>
        URLが未設定のチャネルから予約が入った場合、運営画面にアラートが表示されます。<br/>
        販売を停止したチャネルはレコードを削除してください。
      </InfoNote>

      <div className="section-title" style={{marginTop:4}}>
        <div>
          <h3>チャネル別掲載URL一覧</h3>
          <p style={{margin:'4px 0 0',color:'var(--muted)',fontSize:12.5}}>
            「編集」で各行をその場で編集できます。チャネルマスターから選択。
          </p>
        </div>
        <span className="badge teal">{rows.length}件</span>
      </div>

      <div className="table-wrap">
        <div className="table-scroll">
          <table className="channels-table">
            <thead>
              <tr>
                <th style={{width:148}}>チャネル</th>
                <th>掲載URL</th>
                <th style={{width:110}}>最終更新</th>
                <th className="actions" style={{width:120}}>操作</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(row => {
                const isEditing = editingId === row.id && !row.auto;
                const isUnset = !row.url && !row.auto;
                return (
                  <React.Fragment key={row.id}>
                    <tr className={`${isUnset ? "row-unset" : ""} ${row.auto ? "row-auto" : ""} ${isEditing ? "selected" : ""}`}>
                      <td>
                        <ChannelMark name={row.channel} />
                      </td>
                      <td>
                        {row.auto ? (
                          <span className="muted tiny" style={{display:'inline-flex',alignItems:'center',gap:6}}>
                            <Icon.info /> 自動取得（商品ページから）
                          </span>
                        ) : row.url ? (
                          <a href={row.url} onClick={e=>e.preventDefault()} className="channel-url-link">
                            <span className="url-text">{row.url}</span>
                            <Icon.ext />
                          </a>
                        ) : (
                          <span className="muted tiny">（未設定）</span>
                        )}
                      </td>
                      <td className="muted tiny" style={{fontVariantNumeric:'tabular-nums'}}>
                        {row.updatedAt || "—"}
                      </td>
                      <td className="actions">
                        {row.auto ? (
                          <span className="muted tiny">—</span>
                        ) : isUnset ? (
                          <button type="button" className="link-teal" onClick={() => startEdit(row)}>設定する</button>
                        ) : isEditing ? (
                          <span className="muted tiny">編集中</span>
                        ) : (
                          <div style={{display:'inline-flex',gap:8,justifyContent:'flex-end'}}>
                            <button className="btn sm" onClick={() => startEdit(row)}>編集</button>
                            <button className="btn sm" onClick={() => removeRow(row.id)} style={{color:'var(--coral)'}}>削除</button>
                          </div>
                        )}
                      </td>
                    </tr>
                    {isEditing && (
                      <tr className="row-edit-form">
                        <td colSpan={4}>
                          <div className="channel-edit-panel">
                            <div className="edit-panel-head">
                              <span className="eyebrow-tag">編集中</span>
                              <strong>{row.channel} の掲載URLを編集</strong>
                            </div>
                            <div className="field-grid">
                              <div className="field">
                                <div className="field-label"><span className="req" /><span>チャネル</span></div>
                                <select value={draft.channel ?? row.channel} onChange={e => setDraft(d => ({...d, channel: e.target.value}))}>
                                  {SEED.channelMaster.filter(c => c.code !== "own").map(c => (
                                    <option key={c.code} value={c.name}>{c.name}</option>
                                  ))}
                                </select>
                                <div className="field-help"><Icon.info /><span>チャネルマスターから選択</span></div>
                              </div>
                              <div className="field-wide">
                                <div className="field-label"><span className="req" /><span>掲載URL</span></div>
                                <div className="input-affix">
                                  <div className="affix">https://</div>
                                  <input type="url" value={(draft.url ?? row.url).replace(/^https?:\/\//, "")} onChange={e => setDraft(d => ({...d, url: "https://" + e.target.value.replace(/^https?:\/\//, "")}))} placeholder="www.viator.com/tours/..." style={{fontFamily:'"JetBrains Mono", ui-monospace, monospace', fontSize:12.5}} />
                                </div>
                                <div className="field-help"><Icon.info /><span>OTA商品ページの完全URLを入力</span></div>
                              </div>
                            </div>
                            <div className="edit-panel-foot">
                              <button className="btn" onClick={cancelEdit}>キャンセル</button>
                              <button className="btn primary" onClick={saveEdit}>保存</button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:12,flexWrap:'wrap'}}>
        <button className="btn" style={{borderStyle:'dashed'}}>＋ チャネルを追加</button>
        <span className="muted tiny" style={{display:'inline-flex',alignItems:'center',gap:6}}>
          <Icon.info />
          自社サイト経由の予約は、商品ページのURLが自動的に適用されます（手動設定不要）
        </span>
      </div>
    </div>
  );
}

function ChannelMark({ name }) {
  const map = {
    "Viator":       { bg: "#0d6e63", initials: "V" },
    "GetYourGuide": { bg: "#ff5533", initials: "GYG" },
    "Klook":        { bg: "#ff5b00", initials: "K" },
    "Airbnb Experiences": { bg: "#ff385c", initials: "A" },
    "Expedia / Activities": { bg: "#003580", initials: "E" },
    "自社サイト":   { bg: "var(--ink)", initials: "d." },
  };
  const m = map[name] || { bg: "var(--muted)", initials: name.slice(0,1) };
  return (
    <div className="channel-mark">
      <span className="channel-logo" style={{background: m.bg}}>{m.initials}</span>
      <strong>{name}</strong>
    </div>
  );
}

function DocTable({ docs }) {
  if (!docs.length) {
    return <div className="empty-state">割り当てられている資料はありません。</div>;
  }
  return (
    <div className="table-wrap">
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th style={{width:78}}>種別</th>
              <th>資料名</th>
              <th style={{width:96}}>資料種別</th>
              <th style={{width:54}}>リンク</th>
            </tr>
          </thead>
          <tbody>
            {docs.map(d => (
              <tr key={d.id}>
                <td><span className={`badge ${d.type === '注意事項' ? 'coral' : 'teal'}`}>{d.type}</span></td>
                <td><strong>{d.name}</strong></td>
                <td><span className={`badge ${d.docType === '行程' ? 'blue' : 'outline'}`}>{d.docType}</span></td>
                <td>{d.url ? <a href={d.url} style={{color:'var(--accent)',fontSize:12,display:'inline-flex',alignItems:'center',gap:3}} onClick={e=>e.preventDefault()}>開く<Icon.ext /></a> : <span className="muted tiny">—</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── ProductPage Editor ─────────────────────────────────────────────────────

function ProductPageEditor({ tab, mode, page, updatePage, links, updateLinks, selectedLinkId, selectLink, lookup }) {
  const readonly = mode === "review";
  const link = links.find(l => l.id === selectedLinkId) ?? links[0];

  if (tab === "pageBasic") {
    return (
      <div className={`form-section ${readonly ? "readonly-mode" : ""}`}>
        <SectionHead eyebrow="STEP 1" title="商品ページ基本情報" desc="商品ページ全体の表示・検索・公開状態を管理します。" />
        <div className="field-grid">
          <Field label="商品ページID" value={mode === "create" ? "PG-自動採番" : page.id} readOnly mono />
          <Field
            label="URL"
            required
            value={(page.url || "").replace(/^\/tours\//, "")}
            onChange={x => updatePage({ url: `/tours/${x.replace(/^\//, "")}` })}
            affixLeft="/tours/"
            placeholder="kyoto-night-food"
            readOnly={readonly}
            mono
          />
          <Field label="商品ページ名（内部）" required value={page.name} onChange={x => updatePage({ name: x })} wide readOnly={readonly} />
          <SelectField label="ページ種別" value={page.pageType} onChange={x => updatePage({ pageType: x })} options={["通常商品ページ", "キャンペーンLP", "特集ページ", "その他"]} readOnly={readonly} />
          <Field label="表示カテゴリ" value={page.category} onChange={x => updatePage({ category: x })} readOnly={readonly} />
          <Field label="商品ページ表示タイトル" required value={page.displayTitle} onChange={x => updatePage({ displayTitle: x })} wide readOnly={readonly} maxLen={50} />
          <Field label="サブタイトル" value={page.subtitle} onChange={x => updatePage({ subtitle: x })} wide readOnly={readonly} maxLen={80} />
          <SelectField label="テンプレート種別" value={page.template} onChange={x => updatePage({ template: x })} options={["標準商品ページ", "LP型", "特集型"]} readOnly={readonly} />
          <SelectField label="オプション表示方式" value={page.optionLayout} onChange={x => updatePage({ optionLayout: x })} options={["標準リスト型", "カード型", "コンパクト型"]} readOnly={readonly} />
          <SelectField label="掲載ステータス" value={page.status} onChange={x => updatePage({ status: x })} options={["下書き", "掲載中", "非公開"]} readOnly={readonly} />
        </div>
      </div>
    );
  }

  if (tab === "pageContent") {
    return (
      <div className={`form-section ${readonly ? "readonly-mode" : ""}`}>
        <SectionHead eyebrow="STEP 2" title="共通コンテンツ" desc="ページに紐付くTourOption群に共通する見せ方を管理します。" />
        <div className="field-grid">
          <Field label="共通紹介文 / リード文" required value={page.lead} onChange={x => updatePage({ lead: x })} wide multiline readOnly={readonly} maxLen={150} />
          <Field label="共通の体験概要" value={page.overview} onChange={x => updatePage({ overview: x })} wide multiline readOnly={readonly} />
          <Field label="共通のおすすめポイント" value={page.points} onChange={x => updatePage({ points: x })} wide multiline readOnly={readonly} />
          <Field label="対象顧客" value={page.audience} onChange={x => updatePage({ audience: x })} wide multiline readOnly={readonly} />
          <Field label="共通の注意事項" value={page.cautions} onChange={x => updatePage({ cautions: x })} wide multiline readOnly={readonly} />
          <Field label="共通の含まれるもの補足" value={page.includedNote} onChange={x => updatePage({ includedNote: x })} readOnly={readonly} />
          <Field label="共通の含まれないもの補足" value={page.excludedNote} onChange={x => updatePage({ excludedNote: x })} readOnly={readonly} />
        </div>
      </div>
    );
  }

  if (tab === "links") {
    return (
      <div className="form-section">
        <SectionHead
          eyebrow="STEP 3"
          title="掲載TourOption"
          desc="商品ページ上での表示順・表示可否・販売可否を管理します。表示内容はTourOption側から参照します。"
        />
        <InfoNote>
          <strong>Phase 1：</strong>紐付けレコードは表示順・表示可否・販売可否のみ管理します。表示名・説明・画像等の表示内容はTourOption画面で編集します。
        </InfoNote>

        <div className="section-title" style={{marginTop:4}}>
          <div>
            <h3>紐付け中のTourOption</h3>
            <p style={{margin:'4px 0 0',color:'var(--muted)',fontSize:12.5}}>この商品ページで現在掲載しているTourOptionです。</p>
          </div>
          <span className="badge teal">{links.length}件</span>
        </div>

        <div className="table-wrap">
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th style={{width:32}}></th>
                  <th className="num" style={{width:44}}>順</th>
                  <th className="center" style={{width:50}}>既定</th>
                  <th className="center" style={{width:64}}>表示</th>
                  <th className="center" style={{width:64}}>販売</th>
                  <th>TourOption</th>
                  <th>選択表示名（TO参照）</th>
                  <th className="num" style={{width:90}}>価格</th>
                  <th style={{width:60}}></th>
                </tr>
              </thead>
              <tbody>
                {links.map(link => {
                  const info = lookup[link.code] ?? {};
                  return (
                    <tr key={link.id} className={selectedLinkId === link.id ? "selected" : ""} onClick={() => selectLink(link.id)}>
                      <td><span className="drag-handle"><Icon.drag /></span></td>
                      <td className="num">{link.order}</td>
                      <td className="center">{link.default && <span className="badge teal" style={{padding:'1px 6px'}}>既定</span>}</td>
                      <td className="center">
                        <Switch checked={link.visible} onChange={v => updateLinks(link.id, { visible: v })} />
                      </td>
                      <td className="center">
                        <Switch checked={link.sellable} onChange={v => updateLinks(link.id, { sellable: v })} />
                      </td>
                      <td>
                        <div className="code-mono" style={{fontSize:12,fontWeight:600}}>{link.code}</div>
                        <div className="row-sub code-mono">{link.tourOptionId}</div>
                      </td>
                      <td>
                        <strong>{info.selectionName ?? "—"}</strong>
                        <div className="row-sub">{info.duration} · {info.capacity}</div>
                      </td>
                      <td className="num"><strong>{info.price ?? "—"}</strong></td>
                      <td className="actions"><button className="btn sm">編集</button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <LinkSettingsForm link={link} page={page} readonly={readonly} updateLinks={updateLinks} />

        <div className="section-title" style={{marginTop:8}}>
          <div>
            <h3>TourOptionを追加</h3>
            <p style={{margin:'4px 0 0',color:'var(--muted)',fontSize:12.5}}>登録済みのTourOptionから選んで、この商品ページに紐付けます。</p>
          </div>
          <div className="flex-row" style={{gap:6}}>
            <input
              type="text"
              placeholder="コード・名称で検索"
              style={{width:240,padding:'6px 10px',border:'1px solid var(--line-strong)',borderRadius:'var(--radius)',background:'var(--surface)',fontSize:12.5}}
            />
          </div>
        </div>

        <TourOptionLookupList lookup={lookup} existingCodes={links.map(l => l.code)} />
      </div>
    );
  }

  // pagePreview
  const link2 = links.find(l => l.id === selectedLinkId) ?? links[0];
  const info = lookup[link2.code] ?? {};
  return (
    <div className={`form-section ${readonly ? "readonly-mode" : ""}`}>
      <SectionHead title="表示確認" desc="商品ページの共通表示と、選択されたTourOption詳細を確認します。" />
      <div className="summary-list">
        <div className="summary-item"><span className="lbl">ページタイトル</span><strong>{page.displayTitle}</strong></div>
        <div className="summary-item"><span className="lbl">URL</span><strong className="code-mono">{page.url}</strong></div>
        <div className="summary-item"><span className="lbl">デフォルトOption</span><strong>{info.selectionName ?? link2.code}</strong></div>
        <div className="summary-item"><span className="lbl">掲載中Option数</span><strong>{links.filter(x => x.visible).length}件</strong></div>
        <div className="summary-item"><span className="lbl">販売ON</span><strong>{links.filter(x => x.sellable).length}件</strong></div>
        <div className="summary-item"><span className="lbl">共通紹介文</span><p>{page.lead}</p></div>
      </div>
    </div>
  );
}

function Switch({ checked, onChange }) {
  return (
    <button type="button"
      onClick={e => { e.stopPropagation(); onChange?.(!checked); }}
      style={{
        appearance:'none', border:0, padding:0, cursor:'pointer',
        width:30, height:18, borderRadius:999,
        background: checked ? 'var(--accent)' : 'var(--line-strong)',
        position:'relative', transition:'background .12s',
      }}>
      <span style={{
        position:'absolute', top:2, left: checked ? 14 : 2,
        width:14, height:14, borderRadius:'50%', background:'#fff',
        transition:'left .14s', boxShadow:'0 1px 2px rgba(0,0,0,.18)'
      }}/>
    </button>
  );
}

function LinkSettingsForm({ link, page, readonly, updateLinks }) {
  return (
    <div className={`form-section ${readonly ? "readonly-mode" : ""}`} style={{padding:'18px',background:'var(--surface-warm)',border:'1px solid var(--line)',borderRadius:8}}>
      <SectionHead title="紐付け設定" desc={`「${link.code}」の紐付けレコードを編集中。表示内容はTourOption側で編集してください。`} />
      <div className="field-grid">
        <Field label="紐付けID" value={link.id} readOnly mono />
        <Field label="商品ページID" value={page.id} readOnly mono />
        <Field label="TourOption ID" value={link.tourOptionId} readOnly mono />
        <Field label="TourOptionコード" value={link.code} readOnly mono />
        <Field label="表示順" value={link.order} onChange={x => updateLinks(link.id, { order: Number(x) || 1 })} readOnly={readonly} type="number" />
        <div className="field-wide">
          <div className="field-label"><span>表示・販売設定</span></div>
          <div className="toggle-list" style={{gridTemplateColumns:'repeat(3, 1fr)'}}>
            <ToggleRow checked={link.default} onChange={v => updateLinks(link.id, { default: v })} title="デフォルト選択" desc="初期表示するOption" />
            <ToggleRow checked={link.visible} onChange={v => updateLinks(link.id, { visible: v })} title="商品ページ上に表示" desc="非表示でも紐付けは保持" />
            <ToggleRow checked={link.sellable} onChange={v => updateLinks(link.id, { sellable: v })} title="商品ページ上で販売" desc="OFF時は閲覧のみ" />
          </div>
        </div>
        <Field label="備考（紐付け固有）" value={link.note} onChange={x => updateLinks(link.id, { note: x })} wide placeholder="この紐付けに関するメモがあれば入力" readOnly={readonly} />
      </div>
      <InfoNote amber icon={<Icon.alert />}>
        <strong>TourOption自体が非公開の場合、この商品ページの販売設定にかかわらず販売OFFになります。</strong><br/>
        TourOptionの表示内容を変更する場合はTourOption画面で編集してください。同じTourOptionを掲載している全商品ページに反映されます。
      </InfoNote>
    </div>
  );
}

function TourOptionLookupList({ lookup, existingCodes }) {
  const entries = Object.entries(lookup);
  return (
    <div className="table-wrap">
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th style={{width:160}}>コード</th>
              <th>選択表示名</th>
              <th className="num" style={{width:100}}>価格</th>
              <th style={{width:64}}>所要</th>
              <th className="actions" style={{width:150}}>操作</th>
            </tr>
          </thead>
          <tbody>
            {entries.map(([code, info]) => {
              const inUse = existingCodes.includes(code);
              return (
                <tr key={code}>
                  <td><strong className="code-mono" style={{fontSize:12}}>{code}</strong></td>
                  <td>
                    <strong>{info.selectionName}</strong>
                    <div className="row-sub">{info.shortDescription}</div>
                  </td>
                  <td className="num"><strong>{info.price}</strong></td>
                  <td><span className="muted tiny">{info.duration}</span></td>
                  <td className="actions">
                    <div style={{display:'inline-flex',gap:6,justifyContent:'flex-end'}}>
                      <button className="btn sm">詳細</button>
                      <button className="btn sm primary" disabled={inUse} title={inUse ? "既に紐付け済み" : "この商品ページに紐付ける"}>
                        {inUse ? "紐付け済" : "選択"}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function LinkSettingsFormOLD_REMOVED() { return null; }

// ── GuideDoc Editor ────────────────────────────────────────────────────────

function GuideDocEditor({ tab, mode, docs, updateDoc, selectedDocId, selectDoc, setTab }) {
  const readonly = mode === "review";
  const doc = docs.find(d => d.id === selectedDocId) ?? docs[0];

  if (tab === "docList") {
    return (
      <div className="form-section">
        <SectionHead
          eyebrow="STEP 1"
          title="ガイド向け資料一覧"
          desc="共通資料は複数のTourOptionに割り当てられます。個別資料は特定TourOption専用です。"
          action={<button className="btn primary">＋ 新規作成</button>}
        />
        <div className="badge-row">
          <span className="badge blue">共通 {docs.filter(d => d.scope === '共通').length}件</span>
          <span className="badge teal">個別 {docs.filter(d => d.scope === '個別').length}件</span>
          <span className="badge coral">注意事項 {docs.filter(d => d.type === '注意事項').length}件</span>
          <span className="badge outline">参考資料 {docs.filter(d => d.type === '参考資料').length}件</span>
          <span className="badge blue">行程 {docs.filter(d => d.docType === '行程').length}件</span>
        </div>
        <div className="table-wrap">
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th style={{width:70}}>スコープ</th>
                  <th style={{width:82}}>種別</th>
                  <th>資料名</th>
                  <th style={{width:96}}>資料種別</th>
                  <th className="num" style={{width:90}}>割り当て</th>
                  <th style={{width:64}}></th>
                </tr>
              </thead>
              <tbody>
                {docs.map(d => (
                  <tr key={d.id} className={selectedDocId === d.id ? "selected" : ""} onClick={() => { selectDoc(d.id); setTab("docDetail"); }}>
                    <td><span className={`badge ${d.scope === '共通' ? 'blue' : 'teal'}`}>{d.scope}</span></td>
                    <td><span className={`badge ${d.type === '注意事項' ? 'coral' : 'outline'}`}>{d.type}</span></td>
                    <td>
                      <strong>{d.name}</strong>
                      {d.note && <div className="row-sub">{d.note}</div>}
                    </td>
                    <td><span className={`badge ${d.docType === '行程' ? 'blue' : 'outline'}`}>{d.docType}</span></td>
                    <td className="num">{d.assignedTo.length}件</td>
                    <td className="actions"><button className="btn sm">編集</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="empty-state">
          <strong>スコープについて</strong>
          <span><b>共通</b>：複数TourOptionで共有 / <b>個別</b>：特定TourOption専用</span>
        </div>
      </div>
    );
  }

  if (tab === "docDetail") {
    return (
      <div className={`form-section ${readonly ? "readonly-mode" : ""}`}>
        <SectionHead eyebrow="STEP 2" title="資料詳細" desc="スコープと種別を設定してから、資料の内容を入力します。" />
        <div className="field-grid">
          <Field label="資料ID" value={doc.id} readOnly mono />
          <SelectField label="種別" required value={doc.type} onChange={x => updateDoc(doc.id, { type: x })} options={["参考資料", "注意事項"]} readOnly={readonly} />
          <SelectField label="スコープ" required value={doc.scope} onChange={x => updateDoc(doc.id, { scope: x })} options={["共通", "個別"]} readOnly={readonly} />
          <SelectField label="資料種別" required value={doc.docType} onChange={x => updateDoc(doc.id, { docType: x })} options={["行程", "観光情報", "施設情報", "文化背景", "運営注意", "過去トラブル"]} readOnly={readonly} help="「行程」はガイド向けの詳細行程です。ゲスト向けスケジュールとは別に管理します。" />
          <Field label="資料名" required value={doc.name} onChange={x => updateDoc(doc.id, { name: x })} wide readOnly={readonly} maxLen={60} />
          <Field label="参考URL" value={doc.url} onChange={x => updateDoc(doc.id, { url: x })} wide readOnly={readonly} type="url" placeholder="Google Drive, Notion等のリンク" />
          <Field label={doc.docType === "行程" ? "行程内容" : "本文 / 案内ポイント"} required value={doc.content} onChange={x => updateDoc(doc.id, { content: x })} wide multiline readOnly={readonly} rows={8} />
          <Field label="注意点" value={doc.cautions} onChange={x => updateDoc(doc.id, { cautions: x })} wide multiline readOnly={readonly} />
          <Field label="備考" value={doc.note} onChange={x => updateDoc(doc.id, { note: x })} wide readOnly={readonly} />
        </div>
      </div>
    );
  }

  // docLinks
  return (
    <div className="form-section">
      <SectionHead
        title="TourOption割り当て"
        desc={`「${doc.name}」の割り当てを管理します。`}
        action={doc.scope === "共通" ? <button className="btn primary">＋ 追加</button> : null}
      />
      {doc.scope === "個別" ? (
        <InfoNote amber>個別資料は1つのTourOptionにのみ割り当てられます。変更する場合は解除してから再割り当てしてください。</InfoNote>
      ) : (
        <InfoNote>共通資料は複数のTourOptionに割り当てられます。テーマをまたいだ割り当ても可能です。</InfoNote>
      )}
      <div className="table-wrap">
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>TourOptionコード</th>
                <th style={{width:110}}>状態</th>
                <th className="actions">操作</th>
              </tr>
            </thead>
            <tbody>
              {doc.assignedTo.map(code => (
                <tr key={code}>
                  <td><strong className="code-mono">{code}</strong></td>
                  <td><span className="badge teal"><span className="dot"/>割り当て済み</span></td>
                  <td className="actions"><button className="btn sm">解除</button></td>
                </tr>
              ))}
              {doc.assignedTo.length === 0 && (
                <tr><td colSpan={3} style={{textAlign:'center',padding:18,color:'var(--muted)'}}>割り当てなし</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── Cancel Policy Template Editor ───────────────────────────────────────────
const TEMPLATE_VARS = [
  { token: "{{ freeCancelDeadline }}", label: "無料キャンセル期限" },
  { token: "{{ cancellationFeeRate }}", label: "キャンセル料率" },
  { token: "{{ cancellationFeeStart }}", label: "キャンセル料発生時点" },
];
const TEMPLATE_SAMPLE = {
  freeCancelDeadline: "開始24時間前",
  cancellationFeeRate: "100%",
  cancellationFeeStart: "開始24時間以内",
};
function renderTemplateBody(body) {
  return String(body || "").replace(/\{\{\s*(\w+)\s*\}\}/g, (m, k) =>
    TEMPLATE_SAMPLE[k] != null ? TEMPLATE_SAMPLE[k] : m);
}

function CancelTemplateEditor({ tab, mode, templates, updateTemplate, selectedTemplateId, selectTemplate, setTab }) {
  const readonly = mode === "review";
  const tmpl = templates.find(x => x.id === selectedTemplateId) ?? templates[0];
  const bodyRef = useRef(null);

  if (tab === "tmplList") {
    return (
      <div className="form-section">
        <SectionHead
          eyebrow="STEP 1"
          title="キャンセルポリシー文言テンプレート"
          desc="OTA掲載やゲスト通知に使う定型文を管理します。本文に変数を埋め込むと、適用するTourOptionの設定値に置き換わります。"
          action={<button className="btn primary">＋ 新規作成</button>}
        />
        <div className="badge-row">
          <span className="badge teal">有効 {templates.filter(x => x.enabled).length}件</span>
          <span className="badge outline">無効 {templates.filter(x => !x.enabled).length}件</span>
        </div>
        <div className="table-wrap">
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>テンプレート名</th>
                  <th style={{width:96}}>言語</th>
                  <th style={{width:96}}>有効/無効</th>
                  <th style={{width:110}}>更新日</th>
                  <th className="actions" style={{width:64}}>操作</th>
                </tr>
              </thead>
              <tbody>
                {templates.map(x => (
                  <tr key={x.id} className={selectedTemplateId === x.id ? "selected" : ""} onClick={() => { selectTemplate(x.id); setTab("tmplDetail"); }}>
                    <td>
                      <strong>{x.name}</strong>
                      <div className="row-sub code-mono">{x.id}</div>
                    </td>
                    <td><span className={`badge ${x.lang === "日本語" ? "blue" : "outline"}`}>{x.lang}</span></td>
                    <td>
                      {x.enabled
                        ? <span className="badge teal"><span className="dot"/>有効</span>
                        : <span className="badge muted"><span className="dot"/>無効</span>}
                    </td>
                    <td className="muted tiny" style={{fontVariantNumeric:'tabular-nums'}}>{x.updatedAt || "—"}</td>
                    <td className="actions"><button className="btn sm">編集</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="empty-state">
          <strong>変数について</strong>
          <span>本文中の <code>{"{{ freeCancelDeadline }}"}</code> などの変数は、文言生成時に各TourOptionの設定値へ自動で置き換わります。</span>
        </div>
      </div>
    );
  }

  // tmplDetail
  const insertVar = (token) => {
    if (readonly) return;
    const ta = bodyRef.current;
    const cur = tmpl.body || "";
    let start = cur.length, end = cur.length;
    if (ta) { start = ta.selectionStart ?? cur.length; end = ta.selectionEnd ?? cur.length; }
    const next = cur.slice(0, start) + token + cur.slice(end);
    updateTemplate(tmpl.id, { body: next });
    requestAnimationFrame(() => {
      if (ta) { ta.focus(); const pos = start + token.length; ta.setSelectionRange(pos, pos); }
    });
  };

  return (
    <div className={`form-section ${readonly ? "readonly-mode" : ""}`}>
      <SectionHead eyebrow="STEP 2" title="テンプレート編集" desc="本文に変数を埋め込むと、適用するTourOptionの値に自動で置き換わります。" />
      {!tmpl.enabled && (
        <InfoNote amber icon={<Icon.alert />}>
          <strong>このテンプレートは無効です。</strong> 文言生成時の選択肢には表示されません。
        </InfoNote>
      )}
      <div className="field-grid">
        <Field label="テンプレートID" value={tmpl.id} readOnly mono help="保存時に自動採番" />
        <SelectField label="言語" value={tmpl.lang} onChange={x => updateTemplate(tmpl.id, { lang: x })} options={["日本語", "English"]} readOnly={readonly} />
        <Field label="テンプレート名" required value={tmpl.name} onChange={x => updateTemplate(tmpl.id, { name: x })} wide readOnly={readonly} maxLen={60} />

        <div className="field-wide">
          <div className="field-label"><span>有効 / 無効</span></div>
          <ToggleRow
            checked={!!tmpl.enabled}
            onChange={v => updateTemplate(tmpl.id, { enabled: v })}
            title={tmpl.enabled ? "有効" : "無効"}
            desc="無効にすると新規の文言生成では選択できなくなります"
          />
        </div>

        <div className="field-wide">
          <label className="field-label"><span className="req" /><span>テンプレート本文</span></label>
          <textarea
            ref={bodyRef}
            rows={5}
            value={tmpl.body || ""}
            onChange={e => updateTemplate(tmpl.id, { body: e.target.value })}
            readOnly={readonly}
            placeholder="無料キャンセルは {{ freeCancelDeadline }} まで可能です。"
          />
          <div className="var-chip-row">
            <span className="var-chip-label">利用可能変数</span>
            {TEMPLATE_VARS.map(v => (
              <button key={v.token} type="button" className="var-chip" onClick={() => insertVar(v.token)} disabled={readonly} title={`${v.label} を挿入`}>
                <code>{v.token}</code>
              </button>
            ))}
            <span className="var-chip-hint">クリックでカーソル位置に挿入</span>
          </div>
        </div>

        <div className="field-wide">
          <div className="field-label"><span>プレビュー</span><span className="opt">サンプル値で表示</span></div>
          <div className="tmpl-preview">{renderTemplateBody(tmpl.body) || "（本文未入力）"}</div>
        </div>

        <Field label="備考" value={tmpl.note} onChange={x => updateTemplate(tmpl.id, { note: x })} wide readOnly={readonly} />
      </div>
    </div>
  );
}

Object.assign(window, { TourOptionEditor, ProductPageEditor, GuideDocEditor, CancelTemplateEditor });
