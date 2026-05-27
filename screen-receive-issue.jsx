// Goods Receive + Goods Issue screens — share line-item editor with camera

function ScreenReceive() {
  const { items, locations, receiveGoods, photos, setPhotos } = useStore();
  const [lines, setLines] = useState([{ id: Date.now(), sku: "", qty: 1, photo: null }]);
  const [toLoc, setToLoc] = useState("WH-A");
  const [ref, setRef] = useState(genRef("PO"));
  const [supplier, setSupplier] = useState("");
  const [note, setNote] = useState("");
  const [cameraFor, setCameraFor] = useState(null); // line id
  const [submitting, setSubmitting] = useState(false);

  const addLine = () => setLines(l => [...l, { id: Date.now(), sku: "", qty: 1, photo: null }]);
  const updLine = (id, patch) => setLines(l => l.map(x => x.id === id ? { ...x, ...patch } : x));
  const rmLine = (id) => setLines(l => l.length > 1 ? l.filter(x => x.id !== id) : l);

  const totalQty = lines.reduce((a, b) => a + (parseInt(b.qty) || 0), 0);
  const totalValue = lines.reduce((a, b) => {
    const item = items.find(i => i.sku === b.sku);
    return a + (item ? item.cost * (parseInt(b.qty) || 0) : 0);
  }, 0);

  const canSubmit = lines.every(l => l.sku && parseInt(l.qty) > 0) && toLoc && ref;

  const submit = () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setTimeout(() => {
      lines.forEach(l => {
        receiveGoods({ sku: l.sku, qty: parseInt(l.qty), to: toLoc, ref, note });
        if (l.photo) {
          setPhotos(prev => ({ ...prev, [l.sku]: [l.photo, ...(prev[l.sku] || [])].slice(0, 6) }));
        }
      });
      setLines([{ id: Date.now(), sku: "", qty: 1, photo: null }]);
      setRef(genRef("PO"));
      setNote("");
      setSubmitting(false);
    }, 500);
  };

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1 className="page-title">รับเข้า</h1>
          <div className="page-sub">บันทึกการรับสินค้าเข้าคลัง · สามารถถ่ายรูปสินค้าเพื่อตรวจสอบได้</div>
        </div>
        <div className="row gap-8">
          <button className="btn"><Icon name="qr" size={14} /> สแกน QR</button>
        </div>
      </div>

      <div className="grid-23">
        <div className="card">
          <div className="card-head">
            <h3>รายการรับเข้า</h3>
            <button className="btn btn-sm" onClick={addLine}><Icon name="plus" size={12} /> เพิ่มรายการ</button>
          </div>
          <div style={{ padding: "8px 8px 14px" }}>
            {lines.map((line, i) => (
              <ReceiveLine
                key={line.id}
                idx={i}
                line={line}
                items={items}
                onChange={(p) => updLine(line.id, p)}
                onRemove={() => rmLine(line.id)}
                onCamera={() => setCameraFor(line.id)}
              />
            ))}
          </div>
          <div style={{ padding: "14px 18px", borderTop: "1px solid var(--border)", background: "var(--surface-2)", borderRadius: "0 0 14px 14px" }}>
            <div className="row" style={{ justifyContent: "space-between" }}>
              <div className="text-sm muted">รวมทั้งสิ้น</div>
              <div className="row gap-16">
                <div><span className="muted text-sm">จำนวน </span><span className="mono" style={{ fontWeight: 600 }}>{totalQty}</span> <span className="muted text-sm">ชิ้น</span></div>
                <div><span className="muted text-sm">มูลค่าทุน </span><span className="mono" style={{ fontWeight: 600 }}>{fmtBaht(totalValue)}</span></div>
              </div>
            </div>
          </div>
        </div>

        <div className="col gap-12">
          <div className="card card-pad col gap-12">
            <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>ข้อมูลการรับเข้า</h3>

            <div className="field">
              <label>เลขที่ใบรับ</label>
              <input className="input mono" value={ref} onChange={e => setRef(e.target.value)} />
            </div>

            <div className="field">
              <label>รับเข้าไปยัง Location</label>
              <select className="select" value={toLoc} onChange={e => setToLoc(e.target.value)}>
                {locations.filter(l => l.kind !== "transit").map(l => (
                  <option key={l.id} value={l.id}>{l.id} · {l.name}</option>
                ))}
              </select>
            </div>

            <div className="field">
              <label>ผู้จัดส่ง (Supplier)</label>
              <input className="input" placeholder="เช่น Nordic Furniture Co." value={supplier} onChange={e => setSupplier(e.target.value)} />
            </div>

            <div className="field">
              <label>หมายเหตุ</label>
              <textarea className="textarea" rows={3} value={note} onChange={e => setNote(e.target.value)} placeholder="รายละเอียดเพิ่มเติม..." />
            </div>
          </div>

          <button
            className="btn btn-accent"
            disabled={!canSubmit || submitting}
            onClick={submit}
            style={{ justifyContent: "center", padding: "12px 16px", fontSize: 14 }}
          >
            {submitting ? <>กำลังบันทึก...</> : <><Icon name="check" size={14} /> ยืนยันรับเข้า {totalQty} ชิ้น</>}
          </button>

          <div className="card card-pad">
            <div className="text-sm muted" style={{ marginBottom: 8 }}>ทิป</div>
            <div className="text-sm" style={{ lineHeight: 1.6 }}>
              ✓ ถ่ายรูปสินค้าทุกครั้ง<br/>
              ✓ ตรวจสอบสภาพก่อนรับเข้า<br/>
              ✓ สต๊อกจะอัพเดทแบบ realtime
            </div>
          </div>
        </div>
      </div>

      {cameraFor !== null && (
        <CameraModal
          onClose={() => setCameraFor(null)}
          onCapture={(dataUrl) => {
            updLine(cameraFor, { photo: dataUrl });
            setCameraFor(null);
          }}
        />
      )}
    </div>
  );
}

function ReceiveLine({ idx, line, items, onChange, onRemove, onCamera }) {
  const item = items.find(i => i.sku === line.sku);
  return (
    <div style={{ display: "grid", gridTemplateColumns: "32px 56px 1fr 100px 40px 40px", gap: 10, alignItems: "center", padding: "10px 10px", borderBottom: "1px solid var(--border)" }}>
      <div className="mono text-sm muted" style={{ textAlign: "center" }}>{String(idx + 1).padStart(2, "0")}</div>
      <div onClick={onCamera} style={{ cursor: "pointer", position: "relative" }}>
        {line.photo ? (
          <div className="thumb" style={{ backgroundImage: `url(${line.photo})` }} />
        ) : (
          <div className="img-ph" style={{ width: 56, height: 56, fontSize: 9 }}>
            <Icon name="camera" size={20} />
          </div>
        )}
      </div>
      <div className="col gap-4">
        <select className="select" value={line.sku} onChange={e => onChange({ sku: e.target.value })} style={{ padding: "6px 10px", fontSize: 13 }}>
          <option value="">— เลือกสินค้า —</option>
          {items.map(it => <option key={it.sku} value={it.sku}>{it.sku} · {it.name}</option>)}
        </select>
        {item && <div className="text-sm muted">ทุน {fmtBaht(item.cost)} · ขาย {fmtBaht(item.price)}</div>}
      </div>
      <div className="row gap-4" style={{ background: "var(--bg-soft)", borderRadius: 6, padding: 2 }}>
        <button className="btn btn-ghost btn-icon" style={{ padding: 4 }} onClick={() => onChange({ qty: Math.max(1, (parseInt(line.qty) || 0) - 1) })}><Icon name="minus" size={12} /></button>
        <input className="input mono" style={{ textAlign: "center", padding: "4px", border: "none", background: "transparent" }} value={line.qty} onChange={e => onChange({ qty: e.target.value.replace(/\D/g, "") })} />
        <button className="btn btn-ghost btn-icon" style={{ padding: 4 }} onClick={() => onChange({ qty: (parseInt(line.qty) || 0) + 1 })}><Icon name="plus" size={12} /></button>
      </div>
      <button className="btn btn-ghost btn-icon" onClick={onCamera} title="ถ่ายรูป"><Icon name="camera" size={14} /></button>
      <button className="btn btn-danger btn-icon" onClick={onRemove} title="ลบ"><Icon name="close" size={14} /></button>
    </div>
  );
}

// ========== Camera modal — uses getUserMedia OR generates a stylized placeholder ==========
function CameraModal({ onClose, onCapture }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [streaming, setStreaming] = useState(false);
  const [err, setErr] = useState(null);

  useEffect(() => {
    let stream;
    const start = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          setStreaming(true);
        }
      } catch (e) {
        setErr("ไม่สามารถเข้าถึงกล้องได้ — ใช้รูป placeholder แทน");
      }
    };
    start();
    return () => {
      if (stream) stream.getTracks().forEach(t => t.stop());
    };
  }, []);

  const capture = () => {
    if (streaming && videoRef.current) {
      const v = videoRef.current;
      const c = canvasRef.current;
      c.width = v.videoWidth || 640;
      c.height = v.videoHeight || 480;
      c.getContext("2d").drawImage(v, 0, 0);
      onCapture(c.toDataURL("image/jpeg", 0.8));
    } else {
      // generate a stylized placeholder
      const c = canvasRef.current;
      c.width = 480; c.height = 360;
      const ctx = c.getContext("2d");
      const grad = ctx.createLinearGradient(0, 0, 480, 360);
      const hues = [["#E8DCC8", "#C9B89E"], ["#D5C5A8", "#9C8868"], ["#E2D4BC", "#B89F7B"]];
      const pick = hues[Math.floor(Math.random() * hues.length)];
      grad.addColorStop(0, pick[0]); grad.addColorStop(1, pick[1]);
      ctx.fillStyle = grad; ctx.fillRect(0, 0, 480, 360);
      ctx.fillStyle = "rgba(0,0,0,0.18)";
      ctx.fillRect(80, 120, 320, 160);
      ctx.fillStyle = "rgba(0,0,0,0.32)";
      ctx.fillRect(80, 270, 320, 12);
      ctx.fillStyle = "rgba(255,255,255,0.8)";
      ctx.font = "12px monospace";
      ctx.fillText("CAPTURED · " + new Date().toLocaleTimeString(), 90, 350);
      onCapture(c.toDataURL("image/jpeg", 0.8));
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 520 }}>
        <div className="modal-head">
          <h3>ถ่ายรูปสินค้า</h3>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><Icon name="close" /></button>
        </div>
        <div className="modal-body" style={{ padding: 18 }}>
          <div className="cam-stage">
            {streaming ? (
              <video ref={videoRef} autoPlay playsInline muted style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              <div className="col" style={{ alignItems: "center", gap: 8 }}>
                <Icon name="camera" size={36} />
                <div className="text-sm">{err || "กำลังเปิดกล้อง..."}</div>
              </div>
            )}
            <div className="crosshair"></div>
            <canvas ref={canvasRef} style={{ display: "none" }} />
          </div>
          <div className="text-sm muted" style={{ marginTop: 10, textAlign: "center" }}>
            จัดสินค้าให้อยู่ในกรอบ แล้วกดปุ่มเพื่อถ่าย
          </div>
        </div>
        <div className="modal-foot" style={{ justifyContent: "space-between" }}>
          <button className="btn" onClick={onClose}>ยกเลิก</button>
          <button className="btn btn-accent" onClick={capture}>
            <Icon name="camera" size={14} /> ถ่ายรูป
          </button>
        </div>
      </div>
    </div>
  );
}

// ========== Goods Issue ==========
function ScreenIssue() {
  const { items, locations, issueGoods, stock } = useStore();
  const [lines, setLines] = useState([{ id: Date.now(), sku: "", qty: 1 }]);
  const [fromLoc, setFromLoc] = useState("WH-A");
  const [ref, setRef] = useState(genRef("SO"));
  const [customer, setCustomer] = useState("");
  const [reason, setReason] = useState("sale");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const addLine = () => setLines(l => [...l, { id: Date.now(), sku: "", qty: 1 }]);
  const updLine = (id, patch) => setLines(l => l.map(x => x.id === id ? { ...x, ...patch } : x));
  const rmLine = (id) => setLines(l => l.length > 1 ? l.filter(x => x.id !== id) : l);

  const totalQty = lines.reduce((a, b) => a + (parseInt(b.qty) || 0), 0);
  const totalValue = lines.reduce((a, b) => {
    const item = items.find(i => i.sku === b.sku);
    return a + (item ? item.price * (parseInt(b.qty) || 0) : 0);
  }, 0);

  const valid = lines.every(l => {
    if (!l.sku || !(parseInt(l.qty) > 0)) return false;
    const avail = stock[l.sku]?.[fromLoc] || 0;
    return parseInt(l.qty) <= avail;
  });

  const submit = () => {
    if (!valid) return;
    setSubmitting(true);
    setTimeout(() => {
      lines.forEach(l => issueGoods({ sku: l.sku, qty: parseInt(l.qty), from: fromLoc, ref, note: customer ? `ลูกค้า: ${customer}${note ? " · " + note : ""}` : note }));
      setLines([{ id: Date.now(), sku: "", qty: 1 }]);
      setRef(genRef("SO"));
      setCustomer("");
      setNote("");
      setSubmitting(false);
    }, 500);
  };

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1 className="page-title">จ่ายออก</h1>
          <div className="page-sub">บันทึกการจ่ายสินค้าออกจากคลัง · ระบบจะหักสต๊อกอัตโนมัติ</div>
        </div>
      </div>

      <div className="grid-23">
        <div className="card">
          <div className="card-head">
            <h3>รายการจ่ายออก</h3>
            <button className="btn btn-sm" onClick={addLine}><Icon name="plus" size={12} /> เพิ่มรายการ</button>
          </div>
          <div style={{ padding: "8px 8px 14px" }}>
            {lines.map((line, i) => {
              const avail = stock[line.sku]?.[fromLoc] || 0;
              const item = items.find(it => it.sku === line.sku);
              const exceeded = (parseInt(line.qty) || 0) > avail;
              return (
                <div key={line.id} style={{ display: "grid", gridTemplateColumns: "32px 1fr 140px 100px 40px", gap: 10, alignItems: "center", padding: "10px 10px", borderBottom: "1px solid var(--border)" }}>
                  <div className="mono text-sm muted" style={{ textAlign: "center" }}>{String(i + 1).padStart(2, "0")}</div>
                  <div className="col gap-4">
                    <select className="select" value={line.sku} onChange={e => updLine(line.id, { sku: e.target.value })} style={{ padding: "6px 10px", fontSize: 13 }}>
                      <option value="">— เลือกสินค้า —</option>
                      {items.map(it => <option key={it.sku} value={it.sku}>{it.sku} · {it.name}</option>)}
                    </select>
                    {item && (
                      <div className="text-sm" style={{ color: exceeded ? "var(--danger)" : "var(--muted)" }}>
                        คงเหลือใน {fromLoc}: <span className="mono">{avail}</span>
                        {exceeded && " · เกินสต๊อก!"}
                      </div>
                    )}
                  </div>
                  <div style={{ fontSize: 13, color: "var(--muted)", textAlign: "right" }}>
                    {item ? <>{fmtBaht(item.price)} <span className="muted">/ ชิ้น</span></> : "—"}
                  </div>
                  <div className="row gap-4" style={{ background: "var(--bg-soft)", borderRadius: 6, padding: 2 }}>
                    <button className="btn btn-ghost btn-icon" style={{ padding: 4 }} onClick={() => updLine(line.id, { qty: Math.max(1, (parseInt(line.qty) || 0) - 1) })}><Icon name="minus" size={12} /></button>
                    <input className="input mono" style={{ textAlign: "center", padding: "4px", border: "none", background: "transparent" }} value={line.qty} onChange={e => updLine(line.id, { qty: e.target.value.replace(/\D/g, "") })} />
                    <button className="btn btn-ghost btn-icon" style={{ padding: 4 }} onClick={() => updLine(line.id, { qty: (parseInt(line.qty) || 0) + 1 })}><Icon name="plus" size={12} /></button>
                  </div>
                  <button className="btn btn-danger btn-icon" onClick={() => rmLine(line.id)}><Icon name="close" size={14} /></button>
                </div>
              );
            })}
          </div>
          <div style={{ padding: "14px 18px", borderTop: "1px solid var(--border)", background: "var(--surface-2)", borderRadius: "0 0 14px 14px" }}>
            <div className="row" style={{ justifyContent: "space-between" }}>
              <div className="text-sm muted">รวมทั้งสิ้น</div>
              <div className="row gap-16">
                <div><span className="muted text-sm">จำนวน </span><span className="mono" style={{ fontWeight: 600 }}>{totalQty}</span> <span className="muted text-sm">ชิ้น</span></div>
                <div><span className="muted text-sm">มูลค่าขาย </span><span className="mono" style={{ fontWeight: 600 }}>{fmtBaht(totalValue)}</span></div>
              </div>
            </div>
          </div>
        </div>

        <div className="col gap-12">
          <div className="card card-pad col gap-12">
            <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>ข้อมูลการจ่ายออก</h3>

            <div className="field">
              <label>เลขที่อ้างอิง</label>
              <input className="input mono" value={ref} onChange={e => setRef(e.target.value)} />
            </div>

            <div className="field">
              <label>จ่ายออกจาก Location</label>
              <select className="select" value={fromLoc} onChange={e => setFromLoc(e.target.value)}>
                {locations.map(l => (
                  <option key={l.id} value={l.id}>{l.id} · {l.name}</option>
                ))}
              </select>
            </div>

            <div className="field">
              <label>ประเภทการจ่ายออก</label>
              <div className="segmented" style={{ width: "100%" }}>
                {[
                  ["sale", "ขาย"],
                  ["return", "คืน supplier"],
                  ["damage", "สูญเสีย"],
                ].map(([k, l]) => (
                  <button key={k} className={reason === k ? "active" : ""} onClick={() => setReason(k)} style={{ flex: 1 }}>{l}</button>
                ))}
              </div>
            </div>

            <div className="field">
              <label>ลูกค้า / ผู้รับ</label>
              <input className="input" placeholder="ชื่อลูกค้า" value={customer} onChange={e => setCustomer(e.target.value)} />
            </div>

            <div className="field">
              <label>หมายเหตุ</label>
              <textarea className="textarea" rows={2} value={note} onChange={e => setNote(e.target.value)} />
            </div>
          </div>

          <button
            className="btn btn-accent"
            disabled={!valid || submitting}
            onClick={submit}
            style={{ justifyContent: "center", padding: "12px 16px", fontSize: 14 }}
          >
            {submitting ? "กำลังบันทึก..." : <><Icon name="arrow-out" size={14} /> ยืนยันจ่ายออก {totalQty} ชิ้น</>}
          </button>
        </div>
      </div>
    </div>
  );
}

function genRef(prefix) {
  const d = new Date();
  const ym = d.getFullYear().toString().slice(-2) + (d.getMonth() + 1).toString().padStart(2, "0");
  const n = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}-${ym}-${n}`;
}

Object.assign(window, { ScreenReceive, ScreenIssue, CameraModal });
