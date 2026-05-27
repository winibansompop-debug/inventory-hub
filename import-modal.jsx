// Excel/CSV import — parses xlsx/csv files and updates stock

function ImportModal({ onClose }) {
  const { items, locations, stock, receiveGoods, issueGoods, pushToast } = useStore();
  const [step, setStep] = useState("upload"); // upload | preview | done
  const [rows, setRows] = useState([]);
  const [headers, setHeaders] = useState([]);
  const [mode, setMode] = useState("add"); // add | set
  const [defaultLoc, setDefaultLoc] = useState("WH-A");
  const [filename, setFilename] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef(null);
  const [errors, setErrors] = useState([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => { loadXLSX(); }, []);

  const parseFile = async (file) => {
    setFilename(file.name);
    setBusy(true);
    setErrors([]);
    try {
      const ext = file.name.split(".").pop().toLowerCase();
      let parsed;
      if (ext === "csv" || ext === "tsv" || ext === "txt") {
        const text = await file.text();
        parsed = parseCSV(text, ext === "tsv" ? "\t" : detectDelim(text));
      } else if (ext === "xlsx" || ext === "xls") {
        if (!window.XLSX) {
          setErrors(["กำลังโหลดไลบรารี Excel... กรุณาลองอีกครั้งใน 2 วินาที"]);
          loadXLSX();
          setBusy(false);
          return;
        }
        const buf = await file.arrayBuffer();
        const wb = window.XLSX.read(buf, { type: "array" });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const arr = window.XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
        parsed = { headers: arr[0].map(h => String(h).trim()), rows: arr.slice(1) };
      } else {
        setErrors([`รองรับเฉพาะ .xlsx, .xls, .csv, .tsv (ที่อัพโหลด: .${ext})`]);
        setBusy(false);
        return;
      }
      setHeaders(parsed.headers);
      setRows(parsed.rows);
      setStep("preview");
    } catch (e) {
      setErrors(["อ่านไฟล์ไม่ได้: " + e.message]);
    }
    setBusy(false);
  };

  // detect format: wide (SKU + per-location columns) or long (SKU, Location, Quantity)
  const format = useMemo(() => {
    if (!headers.length) return null;
    const skuIdx = headers.findIndex(h => /^sku$/i.test(h) || /รหัส/i.test(h));
    const locIdx = headers.findIndex(h => /^location$|^loc$|คลัง/i.test(h));
    const qtyIdx = headers.findIndex(h => /^qty$|^quantity$|จำนวน/i.test(h));
    const locColIdxs = locations
      .map(l => ({ id: l.id, idx: headers.findIndex(h => h.trim().toUpperCase() === l.id.toUpperCase()) }))
      .filter(x => x.idx !== -1);
    if (skuIdx !== -1 && locColIdxs.length >= 2) {
      return { kind: "wide", skuIdx, locColIdxs };
    }
    if (skuIdx !== -1 && qtyIdx !== -1) {
      return { kind: "long", skuIdx, locIdx, qtyIdx };
    }
    return { kind: "unknown", skuIdx, locIdx, qtyIdx };
  }, [headers, locations]);

  // build planned changes
  const plan = useMemo(() => {
    if (!format || format.kind === "unknown") return { ops: [], invalid: [] };
    const ops = [];
    const invalid = [];
    rows.forEach((row, idx) => {
      if (!row || row.every(c => !c && c !== 0)) return; // skip empty
      const sku = String(row[format.skuIdx] || "").trim();
      if (!sku) return;
      const item = items.find(i => i.sku === sku);
      if (!item) {
        invalid.push({ row: idx + 2, reason: `ไม่พบ SKU: ${sku}` });
        return;
      }
      if (format.kind === "wide") {
        format.locColIdxs.forEach(({ id, idx: cIdx }) => {
          const qty = parseInt(row[cIdx]);
          if (isNaN(qty)) return;
          if (qty < 0) {
            invalid.push({ row: idx + 2, reason: `จำนวนเป็นลบที่ ${id}` });
            return;
          }
          if (qty === 0 && mode === "add") return;
          ops.push({ sku, loc: id, qty });
        });
      } else {
        const loc = String(row[format.locIdx] || "").trim() || defaultLoc;
        const qty = parseInt(row[format.qtyIdx]);
        if (!locations.find(l => l.id === loc)) {
          invalid.push({ row: idx + 2, reason: `ไม่พบคลัง: ${loc}` });
          return;
        }
        if (isNaN(qty) || qty < 0) {
          invalid.push({ row: idx + 2, reason: `จำนวนไม่ถูกต้อง: ${row[format.qtyIdx]}` });
          return;
        }
        ops.push({ sku, loc, qty });
      }
    });
    return { ops, invalid };
  }, [rows, format, items, locations, mode, defaultLoc]);

  const apply = () => {
    setBusy(true);
    setTimeout(() => {
      const ref = "IMP-" + new Date().toISOString().slice(0, 10).replace(/-/g, "");
      plan.ops.forEach(op => {
        if (mode === "set") {
          const current = stock[op.sku]?.[op.loc] || 0;
          const delta = op.qty - current;
          if (delta > 0) {
            receiveGoods({ sku: op.sku, qty: delta, to: op.loc, ref, note: `ปรับยอดจาก Import ${filename}`, user: "Import" });
          } else if (delta < 0) {
            issueGoods({ sku: op.sku, qty: -delta, from: op.loc, ref, note: `ปรับยอดจาก Import ${filename}`, user: "Import" });
          }
        } else {
          if (op.qty > 0) {
            receiveGoods({ sku: op.sku, qty: op.qty, to: op.loc, ref, note: `นำเข้าจาก ${filename}`, user: "Import" });
          }
        }
      });
      pushToast(`นำเข้าสำเร็จ ${plan.ops.length} รายการ`, "ok");
      setStep("done");
      setBusy(false);
    }, 400);
  };

  return (
    <Modal
      title="นำเข้าข้อมูลสต๊อก (Excel / CSV)"
      onClose={onClose}
      wide
      footer={step === "preview" ? (
        <>
          <button className="btn" onClick={() => { setStep("upload"); setRows([]); setHeaders([]); }}>← ย้อนกลับ</button>
          <button className="btn btn-accent" disabled={!plan.ops.length || busy} onClick={apply}>
            {busy ? "กำลังนำเข้า..." : <><Icon name="check" size={14} /> นำเข้า {plan.ops.length} รายการ</>}
          </button>
        </>
      ) : step === "done" ? (
        <button className="btn btn-accent" onClick={onClose}>เสร็จสิ้น</button>
      ) : null}
    >
      {step === "upload" && (
        <div>
          <div
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={e => {
              e.preventDefault();
              setDragOver(false);
              const f = e.dataTransfer.files[0];
              if (f) parseFile(f);
            }}
            onClick={() => fileRef.current?.click()}
            style={{
              border: `2px dashed ${dragOver ? "var(--accent)" : "var(--border-strong)"}`,
              borderRadius: 14,
              padding: "44px 24px",
              textAlign: "center",
              background: dragOver ? "var(--accent-soft)" : "var(--surface-2)",
              cursor: "pointer",
              transition: "all 160ms ease",
            }}
          >
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls,.csv,.tsv,.txt"
              style={{ display: "none" }}
              onChange={e => e.target.files[0] && parseFile(e.target.files[0])}
            />
            <div style={{ width: 56, height: 56, borderRadius: 14, background: "var(--surface)", border: "1px solid var(--border)", display: "inline-grid", placeItems: "center", marginBottom: 12, color: "var(--accent)" }}>
              <Icon name="download" size={26} stroke={1.4} />
            </div>
            <div style={{ fontSize: 16, fontWeight: 500, marginBottom: 4 }}>
              {busy ? "กำลังอ่านไฟล์..." : "ลากไฟล์มาวาง หรือคลิกเพื่อเลือกไฟล์"}
            </div>
            <div className="text-sm muted">รองรับ .xlsx, .xls, .csv, .tsv</div>
          </div>

          {errors.length > 0 && (
            <div className="card card-pad" style={{ marginTop: 12, background: "var(--danger-soft)", border: "1px solid oklch(0.7 0.15 25)", color: "oklch(0.4 0.16 25)" }}>
              {errors.map((e, i) => <div key={i}>{e}</div>)}
            </div>
          )}

          <div className="card" style={{ marginTop: 16 }}>
            <div className="card-head">
              <h3>รูปแบบไฟล์ที่รองรับ</h3>
              <div className="row gap-8">
                <button className="btn btn-sm" onClick={() => downloadTemplate("long", items, locations)}><Icon name="download" size={12} /> Template (รายแถว)</button>
                <button className="btn btn-sm" onClick={() => downloadTemplate("wide", items, locations)}><Icon name="download" size={12} /> Template (รายคลัง)</button>
              </div>
            </div>
            <div style={{ padding: "14px 18px" }}>
              <div className="text-sm" style={{ marginBottom: 10 }}>
                <strong>แบบที่ 1 — รายแถว:</strong> มีคอลัมน์ <span className="mono">SKU</span>, <span className="mono">Location</span>, <span className="mono">Quantity</span>
              </div>
              <table className="table" style={{ marginBottom: 14, fontSize: 12 }}>
                <thead><tr><th>SKU</th><th>Location</th><th className="num">Quantity</th></tr></thead>
                <tbody>
                  <tr><td className="mono">SOF-STH-3S</td><td>WH-A</td><td className="num">14</td></tr>
                  <tr><td className="mono">SOF-STH-3S</td><td>SR-1</td><td className="num">2</td></tr>
                </tbody>
              </table>
              <div className="text-sm" style={{ marginBottom: 10 }}>
                <strong>แบบที่ 2 — รายคลัง:</strong> มีคอลัมน์ <span className="mono">SKU</span> แล้วตามด้วยรหัสคลังแต่ละคลัง
              </div>
              <table className="table" style={{ fontSize: 12 }}>
                <thead><tr><th>SKU</th><th className="num">WH-A</th><th className="num">WH-B</th><th className="num">SR-1</th><th className="num">SR-2</th></tr></thead>
                <tbody>
                  <tr><td className="mono">SOF-STH-3S</td><td className="num">14</td><td className="num">6</td><td className="num">1</td><td className="num">1</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {step === "preview" && (
        <div>
          <div className="row gap-12" style={{ flexWrap: "wrap", marginBottom: 14 }}>
            <div className="chip accent"><Icon name="check" size={11} /> ไฟล์: {filename}</div>
            <div className="chip">รูปแบบ: {format?.kind === "wide" ? "รายคลัง" : format?.kind === "long" ? "รายแถว" : "ไม่รู้จัก"}</div>
            <div className="chip">รวม {rows.length} แถว</div>
            <div className="chip ok">{plan.ops.length} ใช้ได้</div>
            {plan.invalid.length > 0 && <div className="chip danger">{plan.invalid.length} มีปัญหา</div>}
          </div>

          <div className="grid-2" style={{ gap: 14, marginBottom: 14 }}>
            <div className="field">
              <label>วิธีนำเข้า</label>
              <div className="segmented" style={{ width: "100%" }}>
                <button className={mode === "add" ? "active" : ""} onClick={() => setMode("add")} style={{ flex: 1 }}>เพิ่มเข้าสต๊อกเดิม</button>
                <button className={mode === "set" ? "active" : ""} onClick={() => setMode("set")} style={{ flex: 1 }}>ตั้งค่าสต๊อกใหม่</button>
              </div>
            </div>
            {format?.kind === "long" && format.locIdx === -1 && (
              <div className="field">
                <label>คลังเริ่มต้น (ถ้าไม่ได้ระบุในไฟล์)</label>
                <select className="select" value={defaultLoc} onChange={e => setDefaultLoc(e.target.value)}>
                  {locations.map(l => <option key={l.id} value={l.id}>{l.id} · {l.name}</option>)}
                </select>
              </div>
            )}
          </div>

          {format?.kind === "unknown" && (
            <div className="card card-pad" style={{ background: "var(--danger-soft)", marginBottom: 14 }}>
              <strong>ไม่พบคอลัมน์ที่จำเป็น</strong> — ต้องมี <span className="mono">SKU</span> และ (<span className="mono">Quantity</span> + <span className="mono">Location</span>) หรือคอลัมน์ตามรหัสคลัง (WH-A, WH-B, ...)
              <div className="text-sm muted" style={{ marginTop: 6 }}>คอลัมน์ที่พบ: {headers.join(", ")}</div>
            </div>
          )}

          {plan.invalid.length > 0 && (
            <div className="card" style={{ marginBottom: 14, background: "var(--warn-soft)" }}>
              <div style={{ padding: "10px 14px", borderBottom: "1px solid oklch(0.8 0.1 75 / 0.3)", fontWeight: 500, fontSize: 13 }}>
                ⚠ {plan.invalid.length} แถวที่มีปัญหา (จะถูกข้าม)
              </div>
              <div style={{ padding: "8px 14px", maxHeight: 100, overflow: "auto", fontSize: 12 }}>
                {plan.invalid.slice(0, 10).map((e, i) => (
                  <div key={i}><span className="mono">แถว {e.row}:</span> {e.reason}</div>
                ))}
                {plan.invalid.length > 10 && <div className="muted">...และอีก {plan.invalid.length - 10} แถว</div>}
              </div>
            </div>
          )}

          <div className="card">
            <div className="card-head">
              <h3>ตัวอย่างข้อมูลที่จะนำเข้า</h3>
              <div className="text-sm muted">แสดง 8 รายการแรก</div>
            </div>
            <div style={{ overflowX: "auto", maxHeight: 280 }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>SKU</th>
                    <th>สินค้า</th>
                    <th>คลัง</th>
                    <th className="num">จำนวน{mode === "set" ? " (ใหม่)" : " (+เพิ่ม)"}</th>
                    <th className="num">{mode === "set" ? "เดิม → ใหม่" : "ผลลัพธ์"}</th>
                  </tr>
                </thead>
                <tbody>
                  {plan.ops.slice(0, 8).map((op, i) => {
                    const item = items.find(it => it.sku === op.sku);
                    const current = stock[op.sku]?.[op.loc] || 0;
                    const next = mode === "set" ? op.qty : current + op.qty;
                    return (
                      <tr key={i}>
                        <td className="mono text-sm">{op.sku}</td>
                        <td>{item?.name}</td>
                        <td><span className="chip">{op.loc}</span></td>
                        <td className="num" style={{ fontWeight: 600 }}>{mode === "add" ? "+" : ""}{op.qty}</td>
                        <td className="num">
                          <span className="muted">{current}</span> → <span style={{ fontWeight: 600, color: next > current ? "var(--success)" : next < current ? "var(--danger)" : undefined }}>{next}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {plan.ops.length > 8 && (
                <div style={{ padding: "10px 14px", textAlign: "center", borderTop: "1px solid var(--border)" }} className="text-sm muted">
                  ...และอีก {plan.ops.length - 8} รายการ
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {step === "done" && (
        <div style={{ padding: "20px 0", textAlign: "center" }}>
          <div style={{ width: 64, height: 64, borderRadius: "50%", background: "var(--success-soft)", color: "var(--success)", display: "inline-grid", placeItems: "center", marginBottom: 16 }}>
            <Icon name="check" size={32} stroke={2.4} />
          </div>
          <h3 style={{ margin: "0 0 6px", fontSize: 20 }}>นำเข้าสำเร็จ</h3>
          <div className="muted">เพิ่มข้อมูล {plan.ops.length} รายการเข้าสู่ระบบ · ตรวจสอบได้ที่รายงานการเคลื่อนไหว</div>
        </div>
      )}
    </Modal>
  );
}

// === parsing helpers ===
function detectDelim(text) {
  const sample = text.split(/\r?\n/).slice(0, 5).join("\n");
  const tabs = (sample.match(/\t/g) || []).length;
  const semi = (sample.match(/;/g) || []).length;
  const com = (sample.match(/,/g) || []).length;
  if (tabs > com && tabs > semi) return "\t";
  if (semi > com) return ";";
  return ",";
}

function parseCSV(text, delim = ",") {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  const parseRow = (line) => {
    const out = [];
    let cur = "";
    let inQ = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (inQ) {
        if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; }
        else if (c === '"') { inQ = false; }
        else { cur += c; }
      } else {
        if (c === '"') inQ = true;
        else if (c === delim) { out.push(cur); cur = ""; }
        else cur += c;
      }
    }
    out.push(cur);
    return out.map(x => x.trim());
  };
  const headers = parseRow(lines[0]);
  const rows = lines.slice(1).map(parseRow);
  return { headers, rows };
}

function downloadTemplate(kind, items, locations) {
  let csv;
  const sample = items.slice(0, 3);
  if (kind === "long") {
    csv = "SKU,Location,Quantity\n";
    sample.forEach(it => {
      locations.slice(0, 2).forEach(l => {
        csv += `${it.sku},${l.id},10\n`;
      });
    });
  } else {
    csv = "SKU," + locations.map(l => l.id).join(",") + "\n";
    sample.forEach(it => {
      csv += it.sku + "," + locations.map(() => 10).join(",") + "\n";
    });
  }
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `stock-template-${kind}.csv`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function loadXLSX() {
  if (window.XLSX || document.getElementById("xlsx-script")) return;
  const s = document.createElement("script");
  s.id = "xlsx-script";
  s.src = "https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js";
  document.head.appendChild(s);
}

// Load XLSX library lazily on first import-modal mount (see ImportModal useEffect)
if (typeof window !== "undefined") {
  window.__loadXLSX = loadXLSX;
}

Object.assign(window, { ImportModal });
