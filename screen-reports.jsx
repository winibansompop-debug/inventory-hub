// Stock Report + Movement Report

function ScreenStockReport() {
  const { items, locations, stock, sales30d, seriesMap, totalForSku } = useStore();
  const [groupBy, setGroupBy] = useState("category"); // category | location | status

  const totalSkus = items.length;
  const totalQty = items.reduce((a, it) => a + totalForSku(it.sku), 0);
  const totalValueCost = items.reduce((a, it) => a + totalForSku(it.sku) * it.cost, 0);
  const totalValueRetail = items.reduce((a, it) => a + totalForSku(it.sku) * it.price, 0);

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1 className="page-title">รายงานสินค้าคงเหลือ</h1>
          <div className="page-sub">ภาพรวมสต๊อกทั้งหมด · อัพเดทแบบเรียลไทม์</div>
        </div>
        <div className="row gap-8">
          <button className="btn"><Icon name="download" size={14} /> CSV</button>
          <button className="btn"><Icon name="download" size={14} /> Excel</button>
          <button className="btn btn-primary"><Icon name="download" size={14} /> PDF</button>
        </div>
      </div>

      <div className="kpi-grid">
        <KpiCard label="SKU ทั้งหมด" value={totalSkus} unit="รายการ" delta={`${items.filter(i => totalForSku(i.sku) > 0).length} มีสต๊อก`} deltaKind="up" spark={[10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, totalSkus]} />
        <KpiCard label="ชิ้นรวม" value={totalQty} unit="ชิ้น" delta="ทุก Location" deltaKind="up" spark={[150, 160, 155, 162, 168, 170, 175, 180, 178, 182, 185, 188, 186, totalQty]} />
        <KpiCard label="มูลค่าทุน" value={totalValueCost} format={fmtBaht} delta="−2.1% MoM" deltaKind="down" spark={[100, 102, 99, 105, 108, 110, 107, 109, 112, 110, 108, 106, 104, 102]} />
        <KpiCard label="มูลค่าขาย" value={totalValueRetail} format={fmtBaht} delta="+5.8% MoM" deltaKind="up" spark={[180, 185, 188, 192, 196, 198, 202, 205, 208, 210, 215, 220, 218, 222]} />
      </div>

      <div className="card">
        <div className="card-head">
          <h3>รายงานสินค้าคงเหลือ</h3>
          <div className="row gap-8">
            <div className="text-sm muted">จัดกลุ่มตาม:</div>
            <div className="segmented">
              <button className={groupBy === "category" ? "active" : ""} onClick={() => setGroupBy("category")}>หมวด</button>
              <button className={groupBy === "location" ? "active" : ""} onClick={() => setGroupBy("location")}>Location</button>
              <button className={groupBy === "status" ? "active" : ""} onClick={() => setGroupBy("status")}>สถานะ</button>
            </div>
          </div>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table className="table">
            <thead>
              <tr>
                <th>สินค้า</th>
                <th>หมวด</th>
                {locations.map(l => <th key={l.id} className="num">{l.id}</th>)}
                <th className="num">รวม</th>
                <th className="num">มูลค่า</th>
                <th>สถานะ</th>
                <th style={{ width: 80 }}>14 วัน</th>
              </tr>
            </thead>
            <tbody>
              {items.map(it => {
                const tot = totalForSku(it.sku);
                return (
                  <tr key={it.sku}>
                    <td>
                      <div style={{ fontWeight: 500 }}>{it.name}</div>
                      <div className="sku">{it.sku}</div>
                    </td>
                    <td><span className="chip">{it.category}</span></td>
                    {locations.map(l => {
                      const q = stock[it.sku]?.[l.id] || 0;
                      return <td key={l.id} className="num" style={{ color: q === 0 ? "var(--muted-2)" : undefined }}>{q || "—"}</td>;
                    })}
                    <td className="num" style={{ fontWeight: 600 }}>{fmtNum(tot)}</td>
                    <td className="num">{fmtBaht(tot * it.cost)}</td>
                    <td><StatusChip total={tot} reorder={it.reorder} /></td>
                    <td><Sparkline data={seriesMap[it.sku]} width={70} height={22} /></td>
                  </tr>
                );
              })}
              <tr style={{ background: "var(--surface-2)", fontWeight: 600 }}>
                <td colSpan={2}>รวมทั้งหมด</td>
                {locations.map(l => {
                  const tot = items.reduce((a, it) => a + (stock[it.sku]?.[l.id] || 0), 0);
                  return <td key={l.id} className="num">{fmtNum(tot)}</td>;
                })}
                <td className="num">{fmtNum(totalQty)}</td>
                <td className="num">{fmtBaht(totalValueCost)}</td>
                <td colSpan={2}></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ========== Movement Report ==========
function ScreenMovementReport() {
  const { items, locations, movements } = useStore();
  const [type, setType] = useState("all");
  const [days, setDays] = useState(7);
  const [query, setQuery] = useState("");

  const cutoff = Date.now() - days * 24 * 3600 * 1000;
  const filtered = movements.filter(m => {
    if (m.ts < cutoff) return false;
    if (type !== "all" && m.type !== type) return false;
    if (query) {
      const q = query.toLowerCase();
      const item = items.find(i => i.sku === m.sku);
      const hit = m.sku.toLowerCase().includes(q) || m.ref?.toLowerCase().includes(q) || (item?.name.toLowerCase().includes(q));
      if (!hit) return false;
    }
    return true;
  });

  const totalIn = filtered.filter(m => m.type === "in").reduce((a, b) => a + b.qty, 0);
  const totalOut = filtered.filter(m => m.type === "out").reduce((a, b) => a + b.qty, 0);
  const totalTransfer = filtered.filter(m => m.type === "transfer").reduce((a, b) => a + b.qty, 0);

  // hourly histogram for the period
  const buckets = new Array(24).fill(0);
  movements.filter(m => m.ts > Date.now() - 24 * 3600 * 1000).forEach(m => {
    const h = new Date(m.ts).getHours();
    buckets[h] += m.qty;
  });
  const maxBucket = Math.max(...buckets, 1);

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1 className="page-title">รายงานการเคลื่อนไหว</h1>
          <div className="page-sub">บันทึกการรับเข้า · จ่ายออก · โอน — {filtered.length} รายการในช่วง {days} วัน</div>
        </div>
        <div className="row gap-8">
          <span className="live-dot">LIVE</span>
          <button className="btn"><Icon name="download" size={14} /> Export</button>
        </div>
      </div>

      <div className="kpi-grid" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
        <div className="kpi">
          <div className="label"><div style={{ width: 8, height: 8, borderRadius: 999, background: "var(--success)" }}></div> รับเข้า</div>
          <div className="value" style={{ color: "var(--success)" }}><Counter value={totalIn} /></div>
          <div className="delta up">{filtered.filter(m => m.type === "in").length} ครั้ง</div>
        </div>
        <div className="kpi">
          <div className="label"><div style={{ width: 8, height: 8, borderRadius: 999, background: "var(--danger)" }}></div> จ่ายออก</div>
          <div className="value" style={{ color: "var(--danger)" }}><Counter value={totalOut} /></div>
          <div className="delta down">{filtered.filter(m => m.type === "out").length} ครั้ง</div>
        </div>
        <div className="kpi">
          <div className="label"><div style={{ width: 8, height: 8, borderRadius: 999, background: "var(--accent)" }}></div> โอนระหว่าง</div>
          <div className="value" style={{ color: "var(--accent)" }}><Counter value={totalTransfer} /></div>
          <div className="delta up">{filtered.filter(m => m.type === "transfer").length} ครั้ง</div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-head">
          <h3>ความถี่ใน 24 ชั่วโมงล่าสุด</h3>
          <div className="text-sm muted">รวมจำนวนชิ้นต่อชั่วโมง</div>
        </div>
        <div style={{ padding: "20px 22px 16px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(24, 1fr)", gap: 4, alignItems: "end", height: 100 }}>
            {buckets.map((v, h) => (
              <div key={h} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                <div
                  style={{
                    height: ((v / maxBucket) * 90) + "%",
                    width: "100%",
                    background: v > 0 ? "var(--accent)" : "var(--bg-soft)",
                    borderRadius: 3,
                    minHeight: 4,
                    opacity: v > 0 ? 1 : 0.4,
                    transition: "height 600ms ease",
                  }}
                  title={`${h}:00 · ${v} ชิ้น`}
                />
              </div>
            ))}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(24, 1fr)", marginTop: 6, fontFamily: "var(--mono)", fontSize: 10, color: "var(--muted)" }}>
            {Array.from({ length: 24 }).map((_, h) => (
              <div key={h} style={{ textAlign: "center" }}>{h % 6 === 0 ? h : ""}</div>
            ))}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-head" style={{ flexWrap: "wrap", gap: 8 }}>
          <div className="segmented">
            {[["all", "ทั้งหมด"], ["in", "รับเข้า"], ["out", "จ่ายออก"], ["transfer", "โอน"]].map(([k, l]) => (
              <button key={k} className={type === k ? "active" : ""} onClick={() => setType(k)}>{l}</button>
            ))}
          </div>
          <div className="segmented">
            {[1, 7, 30, 90].map(d => (
              <button key={d} className={days === d ? "active" : ""} onClick={() => setDays(d)}>{d}d</button>
            ))}
          </div>
          <div style={{ flex: 1, minWidth: 200, position: "relative" }}>
            <input className="input" placeholder="ค้นหา SKU / ใบอ้างอิง..." value={query} onChange={e => setQuery(e.target.value)} />
          </div>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table className="table">
            <thead>
              <tr>
                <th>เวลา</th>
                <th>ใบอ้างอิง</th>
                <th>ประเภท</th>
                <th>สินค้า</th>
                <th className="num">จำนวน</th>
                <th>จาก / ไป</th>
                <th>ผู้บันทึก</th>
                <th>หมายเหตุ</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(mv => {
                const item = items.find(i => i.sku === mv.sku);
                const fromLoc = locations.find(l => l.id === mv.from);
                const toLoc = locations.find(l => l.id === mv.to);
                const typeColor = mv.type === "in" ? "var(--success)" : mv.type === "out" ? "var(--danger)" : "var(--accent)";
                const typeLabel = mv.type === "in" ? "รับเข้า" : mv.type === "out" ? "จ่ายออก" : "โอน";
                return (
                  <tr key={mv.id}>
                    <td>
                      <div className="mono text-sm">{fmtTime(mv.ts)}</div>
                      <div className="text-sm muted">{timeAgo(mv.ts)}</div>
                    </td>
                    <td className="mono text-sm">{mv.ref || "—"}</td>
                    <td>
                      <span className="chip" style={{ background: "transparent", borderColor: typeColor, color: typeColor }}>
                        {mv.type === "in" ? "+" : mv.type === "out" ? "−" : "↔"} {typeLabel}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontSize: 13, fontWeight: 500 }}>{item?.name || mv.sku}</div>
                      <div className="sku">{mv.sku}</div>
                    </td>
                    <td className="num" style={{ fontWeight: 600, color: typeColor }}>
                      {mv.type === "in" ? "+" : mv.type === "out" ? "−" : ""}{mv.qty}
                    </td>
                    <td className="text-sm">
                      {mv.type === "in" && <span>→ {toLoc?.name || mv.to}</span>}
                      {mv.type === "out" && <span>← {fromLoc?.name || mv.from}</span>}
                      {mv.type === "transfer" && <span>{fromLoc?.id} <span className="muted">→</span> {toLoc?.id}</span>}
                    </td>
                    <td className="text-sm">{mv.user}</td>
                    <td className="text-sm muted" style={{ maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{mv.note || "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length === 0 && <Empty title="ไม่พบการเคลื่อนไหว" sub="ลองเปลี่ยนช่วงเวลาหรือตัวกรอง" />}
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { ScreenStockReport, ScreenMovementReport });
