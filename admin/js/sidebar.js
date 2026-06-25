window.Sidebar = function Sidebar({ resource, counts = {} }) {
  const opsItems = [
    { key: "bookings",      href: "bookings.html",       icon: "BK", label: "予約一覧" },
    { key: "unassigned",    href: "unassigned.html",     icon: "↳",  label: "未割り当て一覧", child: true },
    { key: "sessions",      href: "sessions.html",       icon: "SS", label: "催行回一覧" },
    { key: "unarranged",    href: "unarranged.html",     icon: "↳",  label: "未手配一覧", child: true },
    { key: "todayTomorrow", href: "today-tomorrow.html", icon: "↳",  label: "当日/翌日案件", child: true },
  ];
  const payItems = [
    { key: "settlement", href: "monthly-settlement.html", icon: "ST", label: "月次締め確認" },
    { key: "ota",      href: "ota-payment-matching.html", icon: "OT", label: "OTA入金照合" },
    { key: "revenue",  href: "revenue-summary.html",      icon: "RV", label: "収支一覧" },

    { key: "guidePay",  href: "guide-payments.html",     icon: "GP", label: "ガイド支払一覧" },
  ];
  const guideItems = [
    { key: "guides", href: "guides.html", icon: "GM", label: "ガイド一覧" },
  ];
  const facilityItems = [
    { key: "facility",       href: "facilities.html",      icon: "FC", label: "施設一覧" },
  ];
  const masterMainItems = [
    { key: "tourOption",     href: "tour-options.html",    icon: "TO", label: "TourOption",       count: counts.to },
    { key: "productPage",    href: "products.html",        icon: "PG", label: "商品ページ",          count: counts.pg },
  ];
  const masterSubItems = [
    { key: "resource",       href: "resources.html",       icon: "RS", label: "リソース管理" },
    { key: "area",           href: "areas.html",           icon: "AR", label: "エリア管理" },
    { key: "language",       href: "languages.html",       icon: "LG", label: "言語マスター管理" },
    { key: "guideDoc",       href: "guide-materials.html", icon: "GD", label: "ガイド資料",         count: counts.gd },
    { key: "cancelTemplate", href: "cancel-policies.html", icon: "CP", label: "キャンセルポリシー" },
    { key: "channelFee",     href: "channel-fees.html",    icon: "FE", label: "チャネル・手数料設定" },
  ];
  const systemItems = [
    { key: "operationLog", href: "operation-log.html", icon: "HL", label: "操作履歴" },
  ];
  return (
    <aside className="side-nav">
      <div className="brand-block">
        <div className="brand-mark">d.</div>
        <div>
          <div className="brand-name">deep_Admin</div>
          <div className="brand-caption">Product &amp; Sales · Phase 1</div>
        </div>
      </div>
      <div className="nav-group" style={{marginBottom:"8px"}}>
        <a href="index.html" className={`nav-item ${resource === "dashboard" ? "active" : ""}`} style={{textDecoration:"none"}}>
          <span className="nav-icon">⊞</span>
          <span style={{flex:1,minWidth:0}}><div>ダッシュボード</div></span>
        </a>
      </div>
      <div>
        <div className="nav-section-label">予約オペレーション</div>
        <div className="nav-group">
          {opsItems.map(it => (
            <a key={it.key} href={it.href}
              className={`nav-item ${resource === it.key ? "active" : ""}${it.child ? " nav-child" : ""}`}
              style={{textDecoration:"none"}}>
              <span className="nav-icon">{it.icon}</span>
              <span style={{flex:1,minWidth:0}}><div>{it.label}</div></span>
            </a>
          ))}
        </div>
      </div>
      <div>
        <div className="nav-section-label">精算・経営</div>
        <div className="nav-group">
          {payItems.map(it => (
            <a key={it.key} href={it.href}
              className={`nav-item ${resource === it.key ? "active" : ""}`}
              style={{textDecoration:"none"}}>
              <span className="nav-icon">{it.icon}</span>
              <span style={{flex:1,minWidth:0}}><div>{it.label}</div></span>
            </a>
          ))}
        </div>
      </div>
      <div>
        <div className="nav-section-label">ガイド管理</div>
        <div className="nav-group">
          {guideItems.map(it => (
            <a key={it.key} href={it.href}
              className={`nav-item ${resource === it.key ? "active" : ""}`}
              style={{textDecoration:"none"}}>
              <span className="nav-icon">{it.icon}</span>
              <span style={{flex:1,minWidth:0}}><div>{it.label}</div></span>
            </a>
          ))}
        </div>
      </div>
      <div>
        <div className="nav-section-label">施設管理</div>
        <div className="nav-group">
          {facilityItems.map(it => (
            <a key={it.key} href={it.href}
              className={`nav-item ${resource === it.key ? "active" : ""}`}
              style={{textDecoration:"none"}}>
              <span className="nav-icon">{it.icon}</span>
              <span style={{flex:1,minWidth:0}}><div>{it.label}</div></span>
            </a>
          ))}
        </div>
      </div>
      <div>
        <div className="nav-section-label">商品管理</div>
        <div className="nav-group">
          {masterMainItems.map(it => (
            <a key={it.key} href={it.href}
              className={`nav-item ${resource === it.key ? "active" : ""}`}
              style={{textDecoration:"none"}}>
              <span className="nav-icon">{it.icon}</span>
              <span style={{flex:1,minWidth:0}}><div>{it.label}</div></span>
              <span className="nav-count">{it.count}</span>
            </a>
          ))}
          <div className="nav-section-label" style={{fontSize:"10px",color:"#999",padding:"8px 12px 4px",marginTop:"4px"}}>マスター</div>
          {masterSubItems.map(it => (
            <a key={it.key} href={it.href}
              className={`nav-item ${resource === it.key ? "active" : ""}`}
              style={{textDecoration:"none"}}>
              <span className="nav-icon">{it.icon}</span>
              <span style={{flex:1,minWidth:0}}><div>{it.label}</div></span>
              <span className="nav-count">{it.count}</span>
            </a>
          ))}
        </div>
      </div>
      <div>
        <div className="nav-section-label">システム管理</div>
        <div className="nav-group">
          {systemItems.map(it => (
            <a key={it.key} href={it.href}
              className={`nav-item ${resource === it.key ? "active" : ""}`}
              style={{textDecoration:"none"}}>
              <span className="nav-icon">{it.icon}</span>
              <span style={{flex:1,minWidth:0}}><div>{it.label}</div></span>
            </a>
          ))}
        </div>
      </div>
      <div className="sidebar-footer">
        <a href="login.html" className="nav-item nav-logout" style={{textDecoration:"none"}}>
          <span className="nav-icon">↩</span><span>ログアウト</span>
        </a>
      </div>
    </aside>
  );
};
