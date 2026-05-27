// Dashboard screen — KPIs, live feed, best/worst sellers, low stock alerts

function ScreenDashboard({ onNav }) {
  const {
    items, totalStock, totalValue, lowStock, movements,
    sellerRanking, seriesMap, sales30d, locations, totalForSku
  } = useStore();
  const [importOpen, setImportOpen] = useState(false);

  const today = new Date();
  const todayStr = today.toLocaleDateString("th-TH", { weekday: "long", day: "numeric", month: "long" });

  const todayMoves = movements.filter(m => Date.now() - m.ts < 24 * 3600 * 1000);
  const todayIn = todayMoves.filter(m => m.type === "in").reduce((a, b) => a + b.qty, 0);
  const todayOut = todayMoves.filter(m => m.type === "out").reduce((a, b) => a + b.qty, 0);

  const best = sellerRanking.slice(0, 4);
  const worst = sellerRanking.slice(-3).reverse();

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1 className="page-title">หน้าหลัก</h1>
          <div className="page-sub">ภาพรวมสต๊อก · {todayStr}</div>
        </div>
        <div className="row gap-8">
          <button className="btn" onClick={() => setImportOpen(true)}><Icon name="download" size={14} stroke={1.8} /> นำเข้า Excel</button>
          <button className="btn btn-primary" onClick={() => onNav("receive")}>
            <Icon name="plus" size={14} /> รับเข้าใหม่
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="kpi-grid">
        <KpiCard
          label="สินค้าทั้งหมด"
          value={totalStock}
          unit="ชิ้น"
          delta="+24 วันนี้"
          deltaKind="up"
          spark={[12, 14, 13, 16, 18, 15, 17, 19, 20, 22, 21, 23, 25, 24]}
        />
        <KpiCard
          label="มูลค่าสต๊อก"
          value={totalValue}
          format={fmtBaht}
          delta="+2.4%"
          deltaKind="up"
          spark={[40, 42, 41, 44, 43, 45, 47, 46, 48, 50, 49, 51, 52, 53]}
        />
        <KpiCard
          label="เคลื่อนไหววันนี้"
          value={todayIn + todayOut}
          unit="ครั้ง"
          delta={`เข้า ${todayIn} · ออก ${todayOut}`}
          deltaKind={todayIn > todayOut ? "up" : "down"}
          spark={[5, 7, 6, 9, 12, 8, 11, 14, 10, 13, 15, 16, 14, 18]}
        />
        <KpiCard
          label="ใกล้หมด / หมด"
          value={lowStock.length}
          unit="SKU"
          delta="ต้องเติม"
          deltaKind={lowStock.length > 0 ? "down" : "up"}
          spark={[1, 2, 1, 3, 2, 4, 3, 5, 4, 3, 4, 5, 4, lowStock.length]}
          danger={lowStock.length > 0}
        />
      </div>

      <div className="grid-23" style={{ marginBottom: 16 }}>
        {/* Live feed */}
        <div className="card">
          <div className="card-head">
            <div className="row gap-8">
              <h3>การเคลื่อนไหวล่าสุด</h3>
              <span className="live-dot">LIVE</span>
            </div>
            <button className="btn btn-sm btn-ghost" onClick={() => onNav("movement-report")}>ดูทั้งหมด →</button>
          </div>
          <div style={{ padding: "4px 18px 12px", maxHeight: 360, overflow: "auto" }}>
            {movements.slice(0, 8).map(mv => (
              <FeedRow key={mv.id} mv={mv} />
            ))}
          </div>
        </div>

        {/* Low stock alerts */}
        <div className="card">
          <div className="card-head">
            <h3>แจ้งเตือนสินค้าใกล้หมด</h3>
            <span className="chip danger">{lowStock.length} รายการ</span>
          </div>
          <div style={{ padding: "8px 18px 14px" }}>
            {lowStock.length === 0 ? (
              <Empty icon="check" title="สต๊อกครบทุกรายการ" sub="ยังไม่ต้องเติม" />
            ) : lowStock.slice(0, 5).map(it => {
              const tot = totalForSku(it.sku);
              const pct = Math.min(100, (tot / (it.reorder * 2)) * 100);
              const kind = tot <= it.reorder * 0.5 ? "danger" : "warn";
              return (
                <div key={it.sku} style={{ padding: "10px 0", borderBottom: "1px solid var(--border)" }}>
                  <div className="row" style={{ justifyContent: "space-between" }}>
                    <div className="col" style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontWeight: 500, fontSize: 13.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{it.name}</div>
                      <div className="text-sm muted mono">{it.sku}</div>
                    </div>
                    <div className="mono text-sm" style={{ marginLeft: 12 }}>
                      <span style={{ fontWeight: 600 }}>{tot}</span>
                      <span className="muted"> / {it.reorder}</span>
                    </div>
                  </div>
                  <div className={`bar ${kind}`} style={{ marginTop: 8 }}>
                    <span style={{ width: pct + "%" }}></span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Best & worst sellers */}
      <div className="grid-2">
        <div className="card">
          <div className="card-head">
            <div>
              <h3>🏆 สินค้าขายดี</h3>
              <div className="sub">30 วันล่าสุด · เรียงตามยอดขาย</div>
            </div>
          </div>
          <div style={{ padding: "8px 22px 20px" }}>
            {best.map((row, i) => (
              <SellerRow key={row.item.sku} rank={i + 1} row={row} kind="top" maxSales={best[0].sales} onClick={() => onNav("items", row.item.sku)} />
            ))}
          </div>
        </div>

        <div className="card">
          <div className="card-head">
            <div>
              <h3>📉 สินค้าขายไม่ดี</h3>
              <div className="sub">30 วันล่าสุด · ควรพิจารณาลดราคา / โปรโมท</div>
            </div>
          </div>
          <div style={{ padding: "8px 22px 20px" }}>
            {worst.map((row, i) => (
              <SellerRow key={row.item.sku} rank={i + 1} row={row} kind="bad" maxSales={best[0].sales} onClick={() => onNav("items", row.item.sku)} />
            ))}
          </div>
        </div>
      </div>

      {/* Location overview */}
      <div className="card" style={{ marginTop: 16 }}>
        <div className="card-head">
          <h3>สต๊อกตามคลัง / โชว์รูม</h3>
          <button className="btn btn-sm btn-ghost" onClick={() => onNav("locations")}>ดูทั้งหมด →</button>
        </div>
        <div style={{ padding: "16px 18px", display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12 }}>
          {locations.map(loc => <LocationMini key={loc.id} loc={loc} onClick={() => onNav("locations", loc.id)} />)}
        </div>
      </div>

      {importOpen && <ImportModal onClose={() => setImportOpen(false)} />}
    </div>
  );
}

function KpiCard({ label, value, unit, format = fmtNum, delta, deltaKind = "up", spark, danger }) {
  return (
    <div className="kpi">
      <div className="label">{label}</div>
      <div className="value" style={danger ? { color: "var(--danger)" } : undefined}>
        <Counter value={value} format={format} />
        {unit ? <span className="unit">{unit}</span> : null}
      </div>
      <div className={`delta ${deltaKind}`}>
        <Icon name={deltaKind === "up" ? "trend-up" : "trend-down"} size={11} stroke={2} />
        {delta}
      </div>
      <div className="spark">
        <Sparkline data={spark} width={80} height={28} color={danger ? "var(--danger)" : undefined} />
      </div>
    </div>
  );
}

function FeedRow({ mv }) {
  const { items, locations } = useStore();
  const item = items.find(i => i.sku === mv.sku);
  const fromLoc = locations.find(l => l.id === mv.from);
  const toLoc = locations.find(l => l.id === mv.to);
  return (
    <div className={`feed-item ${mv.type}`}>
      <div className="ic-circ">
        <Icon name={mv.type === "in" ? "arrow-in" : mv.type === "out" ? "arrow-out" : "arrow"} size={16} />
      </div>
      <div className="col" style={{ minWidth: 0 }}>
        <div style={{ fontSize: 13.5 }}>
          <span style={{ fontWeight: 500 }}>{mv.type === "in" ? "รับเข้า" : mv.type === "out" ? "จ่ายออก" : "โอน"} </span>
          <span className="mono" style={{ fontWeight: 600 }}>{mv.qty}</span>
          <span className="muted"> ชิ้น · </span>
          <span>{item?.name || mv.sku}</span>
        </div>
        <div className="text-sm muted">
          {mv.type === "in" && <>→ {toLoc?.name || mv.to}</>}
          {mv.type === "out" && <>← {fromLoc?.name || mv.from}</>}
          {mv.type === "transfer" && <>{fromLoc?.name || mv.from} → {toLoc?.name || mv.to}</>}
          {mv.ref ? <> · {mv.ref}</> : null}
        </div>
      </div>
      <div className="text-sm muted mono" style={{ whiteSpace: "nowrap" }}>{timeAgo(mv.ts)}</div>
    </div>
  );
}

function SellerRow({ rank, row, kind = "top", maxSales, onClick }) {
  const pct = (row.sales / maxSales) * 100;
  return (
    <div className="seller-row" style={{ cursor: "pointer" }} onClick={onClick}>
      <div className={`seller-rank ${kind === "top" && rank <= 3 ? "top" : kind === "bad" ? "bad" : ""}`}>
        {rank}
      </div>
      <div className="col" style={{ minWidth: 0 }}>
        <div style={{ fontWeight: 500, fontSize: 13.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row.item.name}</div>
        <div className="bar" style={{ marginTop: 6, maxWidth: 240 }}>
          <span style={{ width: pct + "%", background: kind === "bad" ? "var(--danger)" : "var(--accent)" }}></span>
        </div>
      </div>
      <div className="col" style={{ textAlign: "right" }}>
        <div className="mono" style={{ fontWeight: 600 }}>{row.sales} ชิ้น</div>
        <div className="text-sm muted mono">{fmtBaht(row.revenue)}</div>
      </div>
      <div style={{ color: "var(--muted)" }}><Icon name="arrow" size={14} /></div>
    </div>
  );
}

function LocationMini({ loc, onClick }) {
  const { stock, items } = useStore();
  const total = items.reduce((acc, it) => acc + (stock[it.sku]?.[loc.id] || 0), 0);
  const pct = Math.min(100, (total / loc.capacity) * 100);
  const icon = loc.kind === "warehouse" ? "box" : loc.kind === "showroom" ? "store" : "truck";
  return (
    <div className="loc-card" onClick={onClick}>
      <div className="row" style={{ justifyContent: "space-between", marginBottom: 8 }}>
        <div className="row gap-8">
          <div style={{ width: 28, height: 28, borderRadius: 7, background: "var(--bg-soft)", display: "grid", placeItems: "center", color: "var(--muted)" }}>
            <Icon name={icon} size={14} />
          </div>
          <div className="col">
            <div style={{ fontWeight: 500, fontSize: 13.5 }}>{loc.name}</div>
            <div className="text-sm muted mono">{loc.id}</div>
          </div>
        </div>
      </div>
      <div className="row" style={{ justifyContent: "space-between" }}>
        <div className="mono text-lg" style={{ fontWeight: 600 }}>{fmtNum(total)}</div>
        <div className="text-sm muted">/ {fmtNum(loc.capacity)}</div>
      </div>
      <div className="bar" style={{ marginTop: 6 }}>
        <span style={{ width: pct + "%" }}></span>
      </div>
    </div>
  );
}

Object.assign(window, { ScreenDashboard });
