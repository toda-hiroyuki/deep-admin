// preview.jsx — Customer-facing product page mockup for the preview pane
// Edits in the editor flow live into here. Three flavors: TourOption preview,
// Product page preview (with option picker), Guide doc preview.

const Pv = {};

function CustomerFrame({ url, children, hero, badge, sticky }) {
  return (
    <div className="cust">
      <div className="cust-frame">
        <div className="browser-bar">
          <span className="dots"><i/><i/><i/></span>
          <span className="url">tour.co{url}</span>
          {badge && <span className="badge teal" style={{padding:'2px 7px',fontSize:10.5}}>{badge}</span>}
        </div>
      </div>
      {hero}
      {children}
      {sticky}
    </div>
  );
}

// Heuristic: format Japanese minutes/yen consistently.
function priceNum(s) {
  return (s || "").replace(/[^\d]/g, "") || "0";
}
function fmtPrice(s) {
  const n = Number(priceNum(s));
  return n ? "¥" + n.toLocaleString() : "—";
}

// ── TourOption preview (single-option customer card) ───────────────────────

function TourOptionPreview({ t }) {
  return (
    <CustomerFrame
      url="/options/preview"
      hero={
        <div className="cust-hero" style={{backgroundImage:`linear-gradient(180deg, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0.55) 100%), url("https://images.unsplash.com/photo-1528360983277-13d401cdc186?auto=format&fit=crop&w=1000&q=70")`}}>
          <div className="hero-content" style={{zIndex:1}}>
            <span className="hero-area">📍 {t.area}</span>
            <h1>{t.name}</h1>
            <p>{t.shortDescription}</p>
          </div>
        </div>
      }
      sticky={
        <div className="cust-cta-bar">
          <div className="price-block">
            <div className="from">1名から</div>
            <strong>{fmtPrice(t.price)}<span className="unit">/ {t.duration}</span></strong>
          </div>
          <button className="cta-btn">予約に進む →</button>
        </div>
      }
    >
      <div className="cust-body">
        <div className="cust-rating">
          <span className="stars">★★★★★</span>
          <span>4.9</span>
          <span className="muted" style={{fontWeight:400}}>(132件の体験レポート)</span>
        </div>

        <div className="badge-row">
          {t.tags.map((tag, i) => <span className="badge teal" key={i}>{tag}</span>)}
          <span className="badge outline">{t.category}</span>
        </div>

        <div className="cust-meta">
          <div className="cust-meta-item">
            <span className="lbl">所要時間</span>
            <strong>{t.duration}</strong>
          </div>
          <div className="cust-meta-item">
            <span className="lbl">人数</span>
            <strong>{t.minBooking}〜{t.maxBooking}名</strong>
          </div>
          <div className="cust-meta-item">
            <span className="lbl">集合場所</span>
            <strong>{t.meetingPlace}</strong>
          </div>
          <div className="cust-meta-item">
            <span className="lbl">キャンセル</span>
            <strong style={{fontSize:12}}>{t.cancelPolicy?.split('。')[0]}</strong>
          </div>
        </div>

        <div className="cust-section">
          <h3>体験について</h3>
          <p>{t.detailDescription}</p>
        </div>

        <div className="cust-section">
          <h3>当日のスケジュール</h3>
          <p style={{whiteSpace:'pre-line'}}>{t.guestSchedule}</p>
        </div>

        <div className="cust-section">
          <h3>料金に含まれるもの</h3>
          <ul style={{margin:'4px 0 0',paddingLeft:18,fontSize:13,lineHeight:1.65,color:'#3d3833'}}>
            {(t.inclusions || "").split('、').filter(Boolean).map((x,i) => <li key={i}>{x.trim()}</li>)}
          </ul>
        </div>

        <div className="cust-section">
          <h3>料金に含まれないもの</h3>
          <ul style={{margin:'4px 0 0',paddingLeft:18,fontSize:13,lineHeight:1.65,color:'#3d3833'}}>
            {(t.exclusions || "").split('、').filter(Boolean).map((x,i) => <li key={i}>{x.trim()}</li>)}
          </ul>
        </div>
      </div>
    </CustomerFrame>
  );
}

// ── Product page preview (with option picker) ──────────────────────────────

function ProductPagePreview({ page, links, lookup, selectedLinkId, selectLink, tourOption }) {
  // Choose the selected (and sellable+visible) link; fall back gracefully
  const visible = links.filter(l => l.visible);
  const selected = visible.find(l => l.id === selectedLinkId) ?? visible.find(l => l.default) ?? visible[0];
  const selInfo = selected ? (lookup[selected.code] ?? {}) : {};
  const minPrice = useMinPrice(visible, lookup);

  return (
    <CustomerFrame
      url={page.url}
      badge="掲載プレビュー"
      hero={
        <div className="cust-hero" style={{backgroundImage:`linear-gradient(180deg, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0.55) 100%), url("https://images.unsplash.com/photo-1590559899731-a382839e5549?auto=format&fit=crop&w=1000&q=70")`}}>
          <div className="hero-content">
            <span className="hero-area">📍 {page.area}</span>
            <h1>{page.displayTitle}</h1>
            <p>{page.subtitle}</p>
          </div>
        </div>
      }
      sticky={
        <div className="cust-cta-bar">
          <div className="price-block">
            <div className="from">{selected ? "選択中" : "最安"}</div>
            <strong>
              {selected ? (selInfo.price || "—") : minPrice}
              <span className="unit">/ 1名</span>
            </strong>
          </div>
          <button className="cta-btn">予約に進む →</button>
        </div>
      }
    >
      <div className="cust-body">
        <div className="cust-rating">
          <span className="stars">★★★★★</span>
          <span>4.8</span>
          <span className="muted" style={{fontWeight:400}}>(248件)</span>
        </div>

        <div className="cust-section">
          <p style={{color:'#3d3833'}}>{page.lead}</p>
        </div>

        <div>
          <h3 style={{fontSize:14,fontWeight:700,marginBottom:10}}>プランを選択</h3>
          <div className="option-picker">
            {visible.length === 0 && (
              <div className="empty-state">表示中のTourOptionがありません。「掲載TourOption」タブで表示をONにしてください。</div>
            )}
            {visible.map(link => {
              const info = lookup[link.code] ?? {};
              const isSel = selected?.id === link.id;
              return (
                <div key={link.id}
                  className={`option-card ${isSel ? 'selected' : ''} ${!link.sellable ? 'disabled' : ''}`}
                  onClick={() => selectLink?.(link.id)}>
                  <div className="opt-top">
                    <div className="opt-name">
                      <span className="radio" />
                      <span>{info.selectionName ?? link.code}</span>
                      {link.default && <span className="badge teal" style={{padding:'1px 5px',fontSize:10}}>既定</span>}
                    </div>
                    <div className="opt-price">{info.price ?? "—"}</div>
                  </div>
                  <div className="opt-desc">{info.shortDescription}</div>
                  <div className="opt-meta">
                    <span>⏱ {info.duration ?? "—"}</span>
                    <span>· 👥 {info.capacity ?? "—"}</span>
                    {!link.sellable && <span style={{color:'var(--amber)',fontWeight:600}}>· 販売停止中</span>}
                  </div>
                  {(info.tags ?? []).length > 0 && (
                    <div className="badge-row" style={{marginTop:2}}>
                      {(info.tags ?? []).slice(0, 3).map((tag, i) => <span className="badge outline" key={i} style={{fontSize:10.5,padding:'1px 6px'}}>{tag}</span>)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="cust-section">
          <h3>体験概要</h3>
          <p>{page.overview}</p>
        </div>

        <div className="cust-section">
          <h3>おすすめポイント</h3>
          <ul style={{margin:'4px 0 0',paddingLeft:18,fontSize:13,lineHeight:1.65,color:'#3d3833'}}>
            {(page.points || "").split(/[、,]/).filter(Boolean).map((x,i) => <li key={i}>{x.trim()}</li>)}
          </ul>
        </div>

        {selected && (
          <div className="cust-section" style={{background:'var(--surface-tint)',padding:14,borderRadius:8,border:'1px solid var(--line)'}}>
            <h3 style={{display:'flex',alignItems:'center',gap:6}}>
              選択中：{selInfo.selectionName}
              <span className="badge outline" style={{fontSize:10}}>TO参照</span>
            </h3>
            <div className="cust-meta" style={{marginTop:8}}>
              <div className="cust-meta-item"><span className="lbl">集合場所</span><strong style={{fontSize:12.5}}>{tourOption?.meetingPlace ?? "—"}</strong></div>
              <div className="cust-meta-item"><span className="lbl">所要</span><strong>{selInfo.duration ?? "—"}</strong></div>
              <div className="cust-meta-item"><span className="lbl">含まれる</span><strong style={{fontSize:12}}>{page.includedNote}</strong></div>
              <div className="cust-meta-item"><span className="lbl">キャンセル</span><strong style={{fontSize:12}}>{tourOption?.cancelPolicy?.split('。')[0] ?? "—"}</strong></div>
            </div>
          </div>
        )}

        <div className="cust-section">
          <h3>こんな人におすすめ</h3>
          <p>{page.audience}</p>
        </div>

        <div className="cust-section">
          <h3>ご参加にあたって</h3>
          <p style={{color:'#3d3833'}}>{page.cautions}</p>
        </div>
      </div>
    </CustomerFrame>
  );
}

function useMinPrice(visible, lookup) {
  return React.useMemo(() => {
    let min = Infinity;
    for (const l of visible) {
      const p = Number((lookup[l.code]?.price || "").replace(/[^\d]/g, ""));
      if (p && p < min) min = p;
    }
    return Number.isFinite(min) ? "¥" + min.toLocaleString() : "—";
  }, [visible, lookup]);
}

// ── Guide doc preview (guide-facing reading view) ──────────────────────────

function GuideDocPreview({ doc }) {
  const isItinerary = doc.docType === "行程";
  return (
    <div className="cust" style={{padding:0}}>
      <div style={{padding:16,borderBottom:'1px solid var(--line)',background:'#fff'}}>
        <div className="badge-row" style={{marginBottom:8}}>
          <span className={`badge ${doc.scope === '共通' ? 'blue' : 'teal'}`}>{doc.scope}</span>
          <span className={`badge ${doc.type === '注意事項' ? 'coral' : 'outline'}`}>{doc.type}</span>
          <span className={`badge ${isItinerary ? 'blue' : 'outline'}`}>{doc.docType}</span>
        </div>
        <h1 style={{fontSize:18,lineHeight:1.35,fontWeight:700,letterSpacing:'-0.01em',marginBottom:6}}>{doc.name}</h1>
        {doc.note && <p style={{margin:0,fontSize:12,color:'var(--muted)'}}>{doc.note}</p>}
      </div>

      <div style={{padding:16,display:'flex',flexDirection:'column',gap:16}}>
        <div>
          <div style={{fontSize:10.5,letterSpacing:'.06em',textTransform:'uppercase',color:'var(--muted)',fontWeight:600,marginBottom:6}}>
            {isItinerary ? "ガイド向け行程" : "案内ポイント"}
          </div>
          <div style={{
            background: isItinerary ? '#fcfaf4' : '#fff',
            border: '1px solid var(--line)',
            borderLeft: isItinerary ? '3px solid var(--blue)' : '1px solid var(--line)',
            borderRadius: 6,
            padding: '12px 14px',
            fontSize: 13,
            lineHeight: 1.7,
            whiteSpace: 'pre-line',
            color: '#1d1a17',
            fontFamily: isItinerary ? '"JetBrains Mono", ui-monospace, monospace' : 'inherit',
          }}>{doc.content}</div>
        </div>

        {doc.cautions && (
          <div>
            <div style={{fontSize:10.5,letterSpacing:'.06em',textTransform:'uppercase',color:'var(--coral)',fontWeight:700,marginBottom:6,display:'flex',alignItems:'center',gap:4}}>
              <UIcon.alert/> 注意点
            </div>
            <div style={{
              background:'var(--coral-soft)',
              borderLeft:'3px solid var(--coral)',
              borderRadius: 6,
              padding:'10px 12px',
              fontSize: 12.5,
              lineHeight: 1.6,
              color: 'var(--coral)',
            }}>{doc.cautions}</div>
          </div>
        )}

        {doc.url && (
          <div>
            <div style={{fontSize:10.5,letterSpacing:'.06em',textTransform:'uppercase',color:'var(--muted)',fontWeight:600,marginBottom:6}}>参考リンク</div>
            <a href={doc.url} onClick={e=>e.preventDefault()} style={{color:'var(--accent)',fontSize:12.5,display:'inline-flex',alignItems:'center',gap:4,textDecoration:'none',fontWeight:550}}>
              資料を開く <UIcon.ext/>
            </a>
          </div>
        )}

        <div>
          <div style={{fontSize:10.5,letterSpacing:'.06em',textTransform:'uppercase',color:'var(--muted)',fontWeight:600,marginBottom:6}}>
            割り当て先TourOption（{doc.assignedTo.length}件）
          </div>
          <div className="badge-row">
            {doc.assignedTo.map(code => <span key={code} className="badge teal code-mono" style={{fontSize:11}}>{code}</span>)}
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { TourOptionPreview, ProductPagePreview, GuideDocPreview });
