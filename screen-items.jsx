// Items list + Item Detail screens

function ScreenItems({ initialSku, onNav }) {
  const { items, stock, totalForSku, sales30d, seriesMap } = useStore();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selected, setSelected] = useState(initialSku || null);
  const [importOpen, setImportOpen] = useState(false);

  const categories = useMemo(() => ["all", ...new Set(items.map(i => i.category))], [items]);

  const filtered = items.filter(it => {
    const tot = totalForSku(it.sku);
    if (category !== "all" && it.category !== category) return false;
    if (query) {
      const q = query.toLowerCase();
      if (!it.name.toLowerCase().includes(q) && !it.sku.toLowerCase().includes(q)) return false;
    }
    if (statusFilter !== "all") {
      const s = stockStatus(tot, it.reorder).kind;
      if (statusFilter === "low" && s === "ok") return false;
      if (statusFilter === "ok" && s !== "ok") return false;
    }
    return true;
  });

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1 className="page-title">สินค้า</h1>
          <div className="page-sub">{items.length} รายการ · จัดการข้อมูลสินค้าและสต๊อกแยกตามคลัง</div>
        </div>
        <div className="row gap-8">
          <button className="btn" onClick={() => setImportOpen(true)}><Icon name="download" size={14} stroke={1.8} /> นำเข้า Excel</button>
          <button className="btn"><Icon name="download" size={14} /> ส่งออก CSV</button>
          <button className="btn btn-primary"><Icon name="plus" size={14} /> เพิ่มสินค้า</button>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ padding: "12px 14px", display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <div className="search" style={{ flex: 1, minWidth: 200, position: "relative" }}>
            <input className="input" placeholder="ค้นหา SKU หรือชื่อสินค้า..." value={query} onChange={e => setQuery(e.target.value)} style={{ paddingLeft: 32 }} />
            <Icon name="search" size={14} />
            <style>{".search svg{position:absolute;left:10px;top:10px;color:var(--muted);}"}</style>
          </div>
          <div className="segmented">
            {categories.map(c => (
              <button key={c} className={category === c ? "active" : ""} onClick={() => setCategory(c)}>
                {c === "all" ? "ทั้งหมด" : c}
              </button>
            ))}
          </div>
          <div className="segmented">
            <button className={statusFilter === "all" ? "active" : ""} onClick={() => setStatusFilter("all")}>ทุกสถานะ</button>
            <button className={statusFilter === "ok" ? "active" : ""} onClick={() => setStatusFilter("ok")}>ปกติ</button>
            <button className={statusFilter === "low" ? "active" : ""} onClick={() => setStatusFilter("low")}>ใกล้หมด</button>
          </div>
        </div>
      </div>

      <div className="card">
        <div style={{ overflowX: "auto" }}>
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: 60 }}></th>
                <th>สินค้า</th>
                <th>หมวด</th>
                <th className="num">ราคา</th>
                <th className="num">คงเหลือ</th>
                <th>กระจาย</th>
                <th>สถานะ</th>
                <th className="num">ขาย 30 วัน</th>
                <th style={{ width: 110 }}></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(it => {
                const tot = totalForSku(it.sku);
                const distribution = Object.entries(stock[it.sku] || {}).filter(([,q]) => q > 0);
                return (
                  <tr key={it.sku} onClick={() => setSelected(it.sku)} style={{ cursor: "pointer" }}>
                    <td><ItemThumb sku={it.sku} size={44} /></td>
                    <td>
                      <div style={{ fontWeight: 500 }}>{it.name}</div>
                      <div className="sku">{it.sku} · {it.color}</div>
                    </td>
                    <td><span className="chip">{it.category}</span></td>
                    <td className="num">{fmtBaht(it.price)}</td>
                    <td className="num" style={{ fontWeight: 600 }}>{fmtNum(tot)}</td>
                    <td><DistBar sku={it.sku} /></td>
                    <td><StatusChip total={tot} reorder={it.reorder} /></td>
                    <td className="num">
                      <div style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                        <Sparkline data={seriesMap[it.sku]} width={56} height={20} />
                        <span style={{ fontFamily: "var(--mono)", fontWeight: 500 }}>{sales30d[it.sku] || 0}</span>
                      </div>
                    </td>
                    <td>
                      <button className="btn btn-sm btn-ghost"><Icon name="eye" size={12} /> ดู</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length === 0 && <Empty title="ไม่พบสินค้า" sub="ลองเปลี่ยนตัวกรองหรือคำค้นหา" />}
        </div>
      </div>

      {selected && (
        <ItemDetailModal sku={selected} onClose={() => setSelected(null)} onNav={onNav} />
      )}
      {importOpen && <ImportModal onClose={() => setImportOpen(false)} />}
    </div>
  );
}

function DistBar({ sku }) {
  const { stock, locations } = useStore();
  const dist = stock[sku] || {};
  const total = Object.values(dist).reduce((a, b) => a + b, 0);
  if (total === 0) return <span className="muted text-sm">—</span>;
  const colors = { warehouse: "var(--accent)", showroom: "var(--success)", transit: "var(--warn)" };
  return (
    <div style={{ display: "flex", height: 8, borderRadius: 999, overflow: "hidden", background: "var(--bg-soft)", minWidth: 100 }} title={Object.entries(dist).map(([k, v]) => `${k}: ${v}`).join(" · ")}>
      {locations.map(loc => {
        const q = dist[loc.id] || 0;
        if (q === 0) return null;
        return <div key={loc.id} style={{ width: ((q / total) * 100) + "%", background: colors[loc.kind] }} />;
      })}
    </div>
  );
}

// ========== Item Detail Modal ==========
function ItemDetailModal({ sku, onClose, onNav }) {
  const { items, stock, locations, photos, sales30d, seriesMap, movements, totalForSku } = useStore();
  const item = items.find(i => i.sku === sku);
  if (!item) return null;
  const total = totalForSku(sku);
  const itemPhotos = photos[sku] || [];
  const movesForItem = movements.filter(m => m.sku === sku).slice(0, 6);
  const monthly = sales30d[sku] || 0;
  const dailyAvg = (monthly / 30).toFixed(1);
  const daysOfSupply = monthly > 0 ? Math.floor(total / (monthly / 30)) : 999;

  return (
    <Modal title={item.name} onClose={onClose} wide>
      <div className="grid-2" style={{ gap: 22 }}>
        <div>
          {/* Photo gallery */}
          {itemPhotos.length > 0 ? (
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gridTemplateRows: "1fr 1fr", gap: 6, height: 240 }}>
              <div style={{ gridRow: "1 / 3", borderRadius: 12, backgroundImage: `url(${itemPhotos[0]})`, backgroundSize: "cover", backgroundPosition: "center", border: "1px solid var(--border)" }} />
              {itemPhotos.slice(1, 3).map((p, i) => (
                <div key={i} style={{ borderRadius: 10, backgroundImage: `url(${p})`, backgroundSize: "cover", backgroundPosition: "center", border: "1px solid var(--border)" }} />
              ))}
              {itemPhotos.length < 2 && <div className="img-ph" style={{ borderRadius: 10 }}>เพิ่มรูป</div>}
              {itemPhotos.length < 3 && <div className="img-ph" style={{ borderRadius: 10 }}>เพิ่มรูป</div>}
            </div>
          ) : (
            <div className="img-ph" style={{ height: 240, fontSize: 12 }}>
              [ {item.category.toUpperCase()} · {sku} ]<br/>
              <span style={{ marginTop: 6 }}>ถ่ายรูปสินค้าระหว่างรับเข้า</span>
            </div>
          )}

          <div className="col gap-12" style={{ marginTop: 14 }}>
            <div className="row gap-8" style={{ flexWrap: "wrap" }}>
              <span className="chip accent">{item.category}</span>
              <span className="chip">สี: {item.color}</span>
              <StatusChip total={total} reorder={item.reorder} />
            </div>
            <div className="text-sm" style={{ lineHeight: 1.6 }}>{item.desc}</div>
            <div className="grid-2" style={{ gap: 12 }}>
              <DetailField label="SKU" value={<span className="mono">{item.sku}</span>} />
              <DetailField label="Supplier" value={item.supplier} />
              <DetailField label="ราคาขาย" value={fmtBaht(item.price)} />
              <DetailField label="ทุน" value={<span className="muted">{fmtBaht(item.cost)}</span>} />
              <DetailField label="กำไร/ชิ้น" value={<span style={{ color: "var(--success)" }}>{fmtBaht(item.price - item.cost)}</span>} />
              <DetailField label="Reorder Point" value={item.reorder + " ชิ้น"} />
            </div>
          </div>
        </div>

        <div>
          {/* Stock summary */}
          <div className="card card-pad" style={{ background: "var(--surface-2)" }}>
            <div className="text-sm muted">รวมคงเหลือทุก Location</div>
            <div className="row" style={{ alignItems: "baseline", gap: 8 }}>
              <div className="mono" style={{ fontSize: 36, fontWeight: 600, letterSpacing: "-0.02em" }}>{fmtNum(total)}</div>
              <div className="muted">ชิ้น</div>
            </div>
            <div className="row gap-12" style={{ marginTop: 12, flexWrap: "wrap" }}>
              <div className="col">
                <div className="text-sm muted">ขาย 30 วัน</div>
                <div className="mono" style={{ fontWeight: 600 }}>{monthly} ชิ้น</div>
              </div>
              <div className="col">
                <div className="text-sm muted">เฉลี่ย/วัน</div>
                <div className="mono" style={{ fontWeight: 600 }}>{dailyAvg}</div>
              </div>
              <div className="col">
                <div className="text-sm muted">ขายได้อีก</div>
                <div className="mono" style={{ fontWeight: 600 }}>{daysOfSupply > 365 ? "—" : daysOfSupply + " วัน"}</div>
              </div>
            </div>
            <div style={{ marginTop: 12 }}>
              <Sparkline data={seriesMap[sku]} width={300} height={48} />
            </div>
          </div>

          {/* Stock by location */}
          <div style={{ marginTop: 16 }}>
            <div className="text-sm muted" style={{ marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em", fontSize: 11 }}>คงเหลือแยกตาม Location</div>
            {locations.map(loc => {
              const q = stock[sku]?.[loc.id] || 0;
              const pct = total > 0 ? (q / total) * 100 : 0;
              return (
                <div key={loc.id} style={{ padding: "8px 0", borderBottom: "1px solid var(--border)" }}>
                  <div className="row" style={{ justifyContent: "space-between" }}>
                    <div className="text-sm">{loc.name} <span className="muted mono">· {loc.id}</span></div>
                    <div className="mono text-sm" style={{ fontWeight: 600 }}>{q}</div>
                  </div>
                  <div className="bar" style={{ marginTop: 4 }}>
                    <span style={{ width: pct + "%" }}></span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Recent movements */}
          <div style={{ marginTop: 16 }}>
            <div className="text-sm muted" style={{ marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em", fontSize: 11 }}>เคลื่อนไหวล่าสุด</div>
            {movesForItem.length === 0 ? (
              <div className="text-sm muted">ยังไม่มีการเคลื่อนไหว</div>
            ) : (
              movesForItem.map(mv => (
                <div key={mv.id} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", fontSize: 13 }}>
                  <div>
                    <span style={{ color: mv.type === "in" ? "var(--success)" : mv.type === "out" ? "var(--danger)" : "var(--accent)", fontWeight: 500 }}>
                      {mv.type === "in" ? "+" : mv.type === "out" ? "−" : "↔"} {mv.qty}
                    </span>
                    <span className="muted"> · {mv.ref}</span>
                  </div>
                  <div className="text-sm muted">{timeAgo(mv.ts)}</div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}

function DetailField({ label, value }) {
  return (
    <div className="col gap-4">
      <div className="text-sm muted">{label}</div>
      <div style={{ fontSize: 14, fontWeight: 500 }}>{value}</div>
    </div>
  );
}

Object.assign(window, { ScreenItems, ItemDetailModal });
