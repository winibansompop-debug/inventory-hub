// Shared UI components
// Depends on: React, useStore from data.jsx

// ========== Icons (Lucide-style inline SVG) ==========
const Icon = ({ name, size = 16, stroke = 1.6 }) => {
  const paths = {
    dashboard: <><rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/></>,
    "arrow-in": <><path d="M21 12H7"/><path d="M14 5l7 7-7 7"/><path d="M3 4v16"/></>,
    "arrow-out": <><path d="M3 12h14"/><path d="M10 5l-7 7 7 7"/><path d="M21 4v16"/></>,
    cube: <><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><path d="M3.27 6.96 12 12.01l8.73-5.05"/><path d="M12 22.08V12"/></>,
    pin: <><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></>,
    chart: <><line x1="12" y1="20" x2="12" y2="10"/><line x1="18" y1="20" x2="18" y2="4"/><line x1="6" y1="20" x2="6" y2="16"/></>,
    activity: <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>,
    search: <><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></>,
    plus: <><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></>,
    minus: <line x1="5" y1="12" x2="19" y2="12"/>,
    close: <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>,
    camera: <><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></>,
    check: <polyline points="20 6 9 17 4 12"/>,
    arrow: <><line x1="5" y1="12" x2="19" y2="12"/><line x1="12" y1="5" x2="19" y2="12"/><line x1="12" y1="19" x2="19" y2="12"/></>,
    up: <polyline points="18 15 12 9 6 15"/>,
    down: <polyline points="6 9 12 15 18 9"/>,
    download: <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></>,
    filter: <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>,
    bell: <><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></>,
    settings: <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></>,
    box: <><path d="M3 7l9-4 9 4"/><path d="M3 7v10l9 4 9-4V7"/><path d="M3 7l9 4 9-4"/><path d="M12 11v10"/></>,
    truck: <><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></>,
    store: <><path d="M3 9l1-5h16l1 5"/><path d="M5 9v11h14V9"/><path d="M9 20v-6h6v6"/></>,
    "trend-up": <><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></>,
    "trend-down": <><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/><polyline points="17 18 23 18 23 12"/></>,
    eye: <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>,
    edit: <><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></>,
    refresh: <><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></>,
    location: <><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></>,
    "list": <><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></>,
    qr: <><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><line x1="14" y1="14" x2="14" y2="14"/><line x1="14" y1="17" x2="14" y2="20"/><line x1="17" y1="14" x2="17" y2="17"/><line x1="17" y1="20" x2="20" y2="20"/><line x1="20" y1="14" x2="20" y2="14"/></>,
  };
  return (
    <svg className="ic" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round">
      {paths[name] || null}
    </svg>
  );
};

// ========== Animated counter ==========
function Counter({ value, duration = 600, prefix = "", suffix = "", format = fmtNum }) {
  const [display, setDisplay] = useState(value);
  const prevRef = useRef(value);
  const flashRef = useRef(null);

  useEffect(() => {
    const from = prevRef.current;
    const to = value;
    if (from === to) return;
    const start = performance.now();
    let raf;
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      const cur = from + (to - from) * eased;
      setDisplay(cur);
      if (t < 1) raf = requestAnimationFrame(tick);
      else {
        setDisplay(to);
        prevRef.current = to;
        if (flashRef.current) {
          flashRef.current.classList.remove("flash");
          void flashRef.current.offsetWidth;
          flashRef.current.classList.add("flash");
        }
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);

  return <span ref={flashRef} className="counter">{prefix}{format(Math.round(display))}{suffix}</span>;
}

// ========== Sparkline ==========
function Sparkline({ data, width = 80, height = 28, color }) {
  if (!data || !data.length) return null;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = Math.max(max - min, 1);
  const step = width / (data.length - 1);
  const pts = data.map((v, i) => [i * step, height - ((v - min) / range) * (height - 4) - 2]);
  const line = "M " + pts.map(p => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(" L ");
  const area = line + ` L ${width} ${height} L 0 ${height} Z`;
  return (
    <svg className="sparkline-svg" width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={color ? { color } : undefined}>
      <path className="area" d={area} />
      <path className="line" d={line} />
    </svg>
  );
}

// ========== Skeleton ==========
function Skeleton({ w = "100%", h = 12 }) {
  return <div className="skel" style={{ width: w, height: h }} />;
}

// ========== Toast stack ==========
function ToastStack() {
  const { toasts } = useStore();
  return (
    <div className="toast-stack">
      {toasts.map(t => (
        <div key={t.id} className={`toast ${t.kind === "info" ? "info" : t.kind === "error" ? "error" : ""}`}>
          <span className="dot"></span>
          <span>{t.msg}</span>
        </div>
      ))}
    </div>
  );
}

// ========== Modal ==========
function Modal({ title, onClose, children, footer, wide }) {
  useEffect(() => {
    const h = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" style={wide ? { maxWidth: 880 } : undefined} onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <h3>{title}</h3>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><Icon name="close" /></button>
        </div>
        <div className="modal-body">{children}</div>
        {footer ? <div className="modal-foot">{footer}</div> : null}
      </div>
    </div>
  );
}

// ========== Sidebar ==========
function Sidebar({ current, onNav }) {
  const { lowStock, role, setRole } = useStore();
  const nav = [
    { id: "dashboard", label: "หน้าหลัก", icon: "dashboard" },
    { id: "receive", label: "รับเข้า", icon: "arrow-in" },
    { id: "issue", label: "จ่ายออก", icon: "arrow-out" },
    { id: "items", label: "สินค้า", icon: "cube", badge: null },
    { id: "locations", label: "คลัง / โชว์รูม", icon: "pin" },
  ];
  const reports = [
    { id: "stock-report", label: "รายงานสต๊อก", icon: "list" },
    { id: "movement-report", label: "รายงานเคลื่อนไหว", icon: "activity" },
  ];
  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark">IV</div>
        <div className="col">
          <div>Inventory Hub</div>
          <div className="text-sm muted" style={{ fontWeight: 400 }}>เฟอร์นิเจอร์</div>
        </div>
      </div>

      <div className="section-label">เมนูหลัก</div>
      {nav.map(n => (
        <button key={n.id} className={`nav-item ${current === n.id ? "active" : ""}`} onClick={() => onNav(n.id)}>
          <Icon name={n.icon} />
          <span>{n.label}</span>
          {n.id === "items" && lowStock.length > 0 ? <span className="badge">{lowStock.length}</span> : null}
        </button>
      ))}

      <div className="section-label">รายงาน</div>
      {reports.map(n => (
        <button key={n.id} className={`nav-item ${current === n.id ? "active" : ""}`} onClick={() => onNav(n.id)}>
          <Icon name={n.icon} />
          <span>{n.label}</span>
        </button>
      ))}

      <div className="sidebar-footer">
        <div className="avatar">{role === "manager" ? "ผ" : "พ"}</div>
        <div className="col flex-1" style={{ minWidth: 0 }}>
          <div className="text-sm" style={{ fontWeight: 500 }}>{role === "manager" ? "ผู้จัดการ" : "พนักงานคลัง"}</div>
          <button
            className="text-sm muted"
            style={{ background: "none", border: "none", padding: 0, textAlign: "left", cursor: "pointer" }}
            onClick={() => setRole(role === "manager" ? "operator" : "manager")}
          >
            สลับบทบาท ↻
          </button>
        </div>
      </div>
    </aside>
  );
}

// ========== Mobile tabbar ==========
function MobileTabbar({ current, onNav }) {
  const tabs = [
    { id: "dashboard", label: "หน้าหลัก", icon: "dashboard" },
    { id: "receive", label: "รับเข้า", icon: "arrow-in" },
    { id: "issue", label: "จ่ายออก", icon: "arrow-out" },
    { id: "items", label: "สินค้า", icon: "cube" },
    { id: "stock-report", label: "รายงาน", icon: "chart" },
  ];
  return (
    <nav className="mobile-tabbar">
      {tabs.map(t => (
        <button key={t.id} className={`tab ${current === t.id ? "active" : ""}`} onClick={() => onNav(t.id)}>
          <Icon name={t.icon} size={18} />
          <span>{t.label}</span>
        </button>
      ))}
    </nav>
  );
}

// ========== Topbar ==========
function Topbar({ title, breadcrumbs }) {
  return (
    <div className="topbar">
      <div className="breadcrumb">
        <div className="crumbs">
          {breadcrumbs.slice(0, -1).map((b, i) => (
            <React.Fragment key={i}><span>{b}</span><span>›</span></React.Fragment>
          ))}
        </div>
        <span className="current">{breadcrumbs[breadcrumbs.length - 1]}</span>
      </div>
      <div className="row gap-12" style={{ marginLeft: "auto" }}>
        <div className="search" style={{ minWidth: 200 }}>
          <Icon name="search" size={14} />
          <input placeholder="ค้นหาสินค้า, SKU, อ้างอิง..." />
        </div>
        <div className="live-dot">LIVE</div>
      </div>
    </div>
  );
}

// ========== Item thumbnail ==========
function ItemThumb({ sku, size = 44, label }) {
  const { photos } = useStore();
  const list = photos[sku];
  if (list && list.length) {
    return <div className="thumb" style={{ width: size, height: size, backgroundImage: `url(${list[0]})` }} />;
  }
  return (
    <div className="img-ph" style={{ width: size, height: size, fontSize: 9 }}>
      {label || sku.split("-")[0]}
    </div>
  );
}

// ========== Status chip ==========
function StatusChip({ total, reorder }) {
  const s = stockStatus(total, reorder);
  return <span className={`chip ${s.kind}`}>{s.label}</span>;
}

// ========== Empty state ==========
function Empty({ icon = "box", title, sub }) {
  return (
    <div style={{ padding: "40px 20px", textAlign: "center", color: "var(--muted)" }}>
      <div style={{ display: "inline-grid", placeItems: "center", width: 56, height: 56, borderRadius: 14, background: "var(--bg-soft)", marginBottom: 12, color: "var(--muted-2)" }}>
        <Icon name={icon} size={26} />
      </div>
      <div style={{ fontSize: 15, color: "var(--ink)", fontWeight: 500, marginBottom: 4 }}>{title}</div>
      {sub ? <div className="text-sm">{sub}</div> : null}
    </div>
  );
}

Object.assign(window, {
  Icon, Counter, Sparkline, Skeleton, ToastStack, Modal,
  Sidebar, MobileTabbar, Topbar, ItemThumb, StatusChip, Empty,
});
