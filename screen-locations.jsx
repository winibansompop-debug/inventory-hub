// Locations screen + Transfer modal

function ScreenLocations({ initialLoc, onNav }) {
  const { locations, items, stock, transferGoods, totalForSku } = useStore();
  const [selectedLoc, setSelectedLoc] = useState(initialLoc || locations[0].id);
  const [transferOpen, setTransferOpen] = useState(false);

  const loc = locations.find(l => l.id === selectedLoc);
  const totalAtLoc = items.reduce((acc, it) => acc + (stock[it.sku]?.[selectedLoc] || 0), 0);
  const totalValueAtLoc = items.reduce((acc, it) => acc + (stock[it.sku]?.[selectedLoc] || 0) * it.cost, 0);
  const uniqueSkus = items.filter(it => (stock[it.sku]?.[selectedLoc] || 0) > 0).length;
  const utilization = Math.min(100, (totalAtLoc / loc.capacity) * 100);

  const itemsHere = items
    .map(it => ({ item: it, qty: stock[it.sku]?.[selectedLoc] || 0 }))
    .filter(r => r.qty > 0)
    .sort((a, b) => b.qty - a.qty);

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1 className="page-title">คลัง / โชว์รูม</h1>
          <div className="page-sub">{locations.length} ตำแหน่ง · จัดการสต๊อกและโอนระหว่างคลัง</div>
        </div>
        <div className="row gap-8">
          <button className="btn btn-primary" onClick={() => setTransferOpen(true)}>
            <Icon name="arrow" size={14} /> โอนสินค้า
          </button>
        </div>
      </div>

      {/* Location cards row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12, marginBottom: 20 }}>
        {locations.map(l => {
          const tot = items.reduce((acc, it) => acc + (stock[it.sku]?.[l.id] || 0), 0);
          const util = Math.min(100, (tot / l.capacity) * 100);
          const active = l.id === selectedLoc;
          const icon = l.kind === "warehouse" ? "box" : l.kind === "showroom" ? "store" : "truck";
          return (
            <div
              key={l.id}
              className="loc-card"
              onClick={() => setSelectedLoc(l.id)}
              style={active ? { borderColor: "var(--accent)", boxShadow: "0 0 0 3px var(--accent-soft)" } : undefined}
            >
              <div className="map-bg" style={{ display: "flex", alignItems: "end", padding: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: "var(--surface)", boxShadow: "var(--shadow-sm)", display: "grid", placeItems: "center", color: active ? "var(--accent)" : "var(--ink)" }}>
                  <Icon name={icon} size={18} />
                </div>
              </div>
              <div className="row" style={{ justifyContent: "space-between" }}>
                <div className="col">
                  <div style={{ fontWeight: 500, fontSize: 14 }}>{l.name}</div>
                  <div className="text-sm muted mono">{l.id}</div>
                </div>
                <div className="col" style={{ alignItems: "end" }}>
                  <div className="mono" style={{ fontWeight: 600 }}>{fmtNum(tot)}</div>
                  <div className="text-sm muted">/ {fmtNum(l.capacity)}</div>
                </div>
              </div>
              <div className={`bar ${util > 90 ? "danger" : util > 70 ? "warn" : ""}`} style={{ marginTop: 10 }}>
                <span style={{ width: util + "%" }}></span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected location detail */}
      <div className="grid-23">
        <div className="card">
          <div className="card-head">
            <div>
              <h3>{loc.name}</h3>
              <div className="sub">{loc.address} · {loc.kind === "warehouse" ? "คลังสินค้า" : loc.kind === "showroom" ? "โชว์รูม" : "พักของ"}</div>
            </div>
            <div className="row gap-8">
              <button className="btn btn-sm"><Icon name="filter" size={12} /> กรอง</button>
              <button className="btn btn-sm" onClick={() => setTransferOpen(true)}><Icon name="arrow" size={12} /> โอน</button>
            </div>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table className="table">
              <thead>
                <tr>
                  <th style={{ width: 50 }}></th>
                  <th>สินค้า</th>
                  <th>หมวด</th>
                  <th className="num">คงเหลือที่นี่</th>
                  <th className="num">รวมทุก Location</th>
                  <th>สถานะ</th>
                </tr>
              </thead>
              <tbody>
                {itemsHere.map(({ item, qty }) => {
                  const tot = totalForSku(item.sku);
                  return (
                    <tr key={item.sku}>
                      <td><ItemThumb sku={item.sku} size={36} /></td>
                      <td>
                        <div style={{ fontWeight: 500, fontSize: 13.5 }}>{item.name}</div>
                        <div className="sku">{item.sku}</div>
                      </td>
                      <td><span className="chip">{item.category}</span></td>
                      <td className="num" style={{ fontWeight: 600 }}>{fmtNum(qty)}</td>
                      <td className="num muted">{fmtNum(tot)}</td>
                      <td><StatusChip total={tot} reorder={item.reorder} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {itemsHere.length === 0 && <Empty title="ยังไม่มีสินค้าใน Location นี้" sub="โอนสินค้าเข้าหรือรับเข้าโดยตรง" />}
          </div>
        </div>

        <div className="col gap-12">
          <div className="card card-pad">
            <div className="text-sm muted" style={{ marginBottom: 6 }}>สถิติ {loc.name}</div>
            <div className="grid-2" style={{ gap: 12, marginTop: 8 }}>
              <div className="col">
                <div className="text-sm muted">ชิ้นรวม</div>
                <div className="mono text-xl"><Counter value={totalAtLoc} /></div>
              </div>
              <div className="col">
                <div className="text-sm muted">SKU</div>
                <div className="mono text-xl">{uniqueSkus}</div>
              </div>
              <div className="col">
                <div className="text-sm muted">มูลค่าสต๊อก</div>
                <div className="mono" style={{ fontWeight: 600 }}>{fmtBaht(totalValueAtLoc)}</div>
              </div>
              <div className="col">
                <div className="text-sm muted">ความจุ</div>
                <div className="mono" style={{ fontWeight: 600 }}>{utilization.toFixed(0)}%</div>
              </div>
            </div>
            <div className="bar" style={{ marginTop: 12 }}>
              <span style={{ width: utilization + "%" }}></span>
            </div>
          </div>

          <div className="card card-pad">
            <div className="text-sm muted" style={{ marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.05em", fontSize: 11 }}>การกระจาย</div>
            {["โซฟา", "เก้าอี้", "โต๊ะ", "เตียงนอน", "ตู้/ชั้น", "ของตกแต่ง"].map(cat => {
              const catTotal = items.filter(i => i.category === cat).reduce((a, i) => a + (stock[i.sku]?.[selectedLoc] || 0), 0);
              const pct = totalAtLoc > 0 ? (catTotal / totalAtLoc) * 100 : 0;
              if (catTotal === 0) return null;
              return (
                <div key={cat} style={{ padding: "6px 0" }}>
                  <div className="row" style={{ justifyContent: "space-between", fontSize: 13 }}>
                    <span>{cat}</span>
                    <span className="mono">{catTotal} · {pct.toFixed(0)}%</span>
                  </div>
                  <div className="bar" style={{ marginTop: 4 }}>
                    <span style={{ width: pct + "%" }}></span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {transferOpen && <TransferModal defaultFrom={selectedLoc} onClose={() => setTransferOpen(false)} />}
    </div>
  );
}

function TransferModal({ defaultFrom, onClose }) {
  const { items, locations, stock, transferGoods } = useStore();
  const [sku, setSku] = useState("");
  const [from, setFrom] = useState(defaultFrom || "");
  const [to, setTo] = useState("");
  const [qty, setQty] = useState(1);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!locations.length) return;
    if (!from) setFrom(locations[0].id);
    if (!to) setTo((locations.find(l => l.id !== (from || locations[0].id)) || locations[0]).id);
  }, [locations]); // eslint-disable-line

  const avail = stock[sku]?.[from] || 0;
  const exceeded = qty > avail;
  const sameLoc = from === to;
  const valid = sku && qty > 0 && !exceeded && !sameLoc;

  const submit = () => {
    if (!valid) return;
    setSubmitting(true);
    setTimeout(() => {
      transferGoods({ sku, qty: parseInt(qty), from, to, ref: genRef("TF"), note });
      onClose();
    }, 400);
  };

  return (
    <Modal title="โอนสินค้าระหว่าง Location" onClose={onClose} footer={
      <>
        <button className="btn" onClick={onClose}>ยกเลิก</button>
        <button className="btn btn-accent" disabled={!valid || submitting} onClick={submit}>
          {submitting ? "กำลังโอน..." : <><Icon name="arrow" size={14} /> ยืนยันโอน</>}
        </button>
      </>
    }>
      <div className="col gap-12">
        <div className="field">
          <label>สินค้า</label>
          <select className="select" value={sku} onChange={e => setSku(e.target.value)}>
            <option value="">— เลือกสินค้า —</option>
            {items.map(it => <option key={it.sku} value={it.sku}>{it.sku} · {it.name}</option>)}
          </select>
        </div>

        <div className="grid-2">
          <div className="field">
            <label>จาก</label>
            <select className="select" value={from} onChange={e => setFrom(e.target.value)}>
              {locations.map(l => <option key={l.id} value={l.id}>{l.id} · {l.name}</option>)}
            </select>
            {sku && <div className="text-sm muted" style={{ marginTop: 4 }}>คงเหลือ: <span className="mono" style={{ fontWeight: 600 }}>{avail}</span></div>}
          </div>
          <div className="field">
            <label>ไป</label>
            <select className="select" value={to} onChange={e => setTo(e.target.value)}>
              {locations.map(l => <option key={l.id} value={l.id}>{l.id} · {l.name}</option>)}
            </select>
            {sameLoc && <div className="text-sm" style={{ color: "var(--danger)", marginTop: 4 }}>ไม่สามารถโอนไป Location เดียวกัน</div>}
          </div>
        </div>

        <div className="field">
          <label>จำนวน</label>
          <input className="input mono" type="number" min={1} max={avail} value={qty} onChange={e => setQty(Math.max(1, parseInt(e.target.value) || 1))} />
          {exceeded && <div className="text-sm" style={{ color: "var(--danger)", marginTop: 4 }}>เกินจำนวนคงเหลือ</div>}
        </div>

        <div className="field">
          <label>หมายเหตุ</label>
          <textarea className="textarea" rows={2} value={note} onChange={e => setNote(e.target.value)} placeholder="เช่น โอนไปโชว์สำหรับงาน Open House" />
        </div>
      </div>
    </Modal>
  );
}

Object.assign(window, { ScreenLocations, TransferModal });
