// data.jsx — Supabase-backed store with optimistic updates + realtime
const { createContext, useContext, useState, useEffect, useMemo, useRef, useCallback } = React;

const db = window.supabaseClient;

// sparkline series helper
function makeSeries(base, vol) {
  const arr = [];
  let v = base;
  for (let i = 0; i < 14; i++) {
    v = Math.max(0, v + (Math.random() - 0.4) * vol);
    arr.push(Math.round(v));
  }
  return arr;
}

// normalize a Supabase movements row → app movement shape
function normMv(row) {
  return {
    id:   row.ref_id || ('MV-' + row.id),
    ts:   new Date(row.ts).getTime(),
    type: row.type,
    sku:  row.sku,
    qty:  row.qty,
    from: row.from_loc || null,
    to:   row.to_loc   || null,
    ref:  row.ref      || '',
    user: row.user_name || 'คุณ',
    note: row.note     || '',
  };
}

// normalize items row (description → desc for component compatibility)
function normItem(row) {
  return { ...row, desc: row.description || '' };
}

// ========== Store ==========
const StoreCtx = createContext(null);

function StoreProvider({ children }) {
  const [items,     setItems]     = useState([]);
  const [locations, setLocations] = useState([]);
  const [stock,     setStock]     = useState({});
  const [sales30d,  setSales30d]  = useState({});
  const [movements, setMovements] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [dbError,   setDbError]   = useState(null);
  const [toasts,    setToasts]    = useState([]);
  const [photos,    setPhotos]    = useState({});
  const [role,      setRole]      = useState('manager');
  const seriesMap  = useRef({});
  const mvCounter  = useRef(9000);

  // ---- initial data load ----
  useEffect(() => {
    async function loadAll() {
      try {
        const [
          { data: itemsData,  error: e1 },
          { data: locsData,   error: e2 },
          { data: stockData,  error: e3 },
          { data: salesData,  error: e4 },
          { data: mvData,     error: e5 },
        ] = await Promise.all([
          db.from('items').select('*').order('name'),
          db.from('locations').select('*'),
          db.from('stock').select('*'),
          db.from('sales_30d').select('*'),
          db.from('movements').select('*').order('ts', { ascending: false }).limit(200),
        ]);

        const err = e1 || e2 || e3 || e4 || e5;
        if (err) throw err;

        setItems((itemsData || []).map(normItem));
        setLocations(locsData || []);

        const stockMap = {};
        for (const r of (stockData || [])) {
          if (!stockMap[r.sku]) stockMap[r.sku] = {};
          stockMap[r.sku][r.location_id] = r.qty;
        }
        setStock(stockMap);

        const salesMap = {};
        for (const r of (salesData || [])) salesMap[r.sku] = r.qty;
        setSales30d(salesMap);

        setMovements((mvData || []).map(normMv));
        setLoading(false);
      } catch (err) {
        console.error('[Inventory Hub] load error:', err);
        setDbError(err?.message || 'ไม่สามารถเชื่อมต่อ Database ได้');
        setLoading(false);
      }
    }
    loadAll();
  }, []);

  // build series map once items are loaded
  useEffect(() => {
    if (!items.length) return;
    seriesMap.current = {};
    for (const it of items) {
      const dailyAvg = (sales30d[it.sku] || 10) / 30;
      seriesMap.current[it.sku] = makeSeries(dailyAvg * 2, dailyAvg * 1.4);
    }
  }, [items.length]); // eslint-disable-line

  // ---- realtime subscriptions ----
  useEffect(() => {
    if (!items.length) return;
    const ch = db.channel('inventory-realtime')
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'movements' },
        (payload) => {
          setMovements(prev => [normMv(payload.new), ...prev].slice(0, 200));
        }
      )
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'stock' },
        (payload) => {
          const { sku, location_id, qty } = payload.new;
          setStock(prev => ({
            ...prev,
            [sku]: { ...(prev[sku] || {}), [location_id]: qty },
          }));
        }
      )
      .subscribe();

    return () => { db.removeChannel(ch); };
  }, [items.length]); // eslint-disable-line

  // ---- derived values ----
  const totalStock = useMemo(() => {
    return items.reduce((acc, it) =>
      acc + Object.values(stock[it.sku] || {}).reduce((a, b) => a + b, 0), 0);
  }, [items, stock]);

  const totalValue = useMemo(() => {
    return items.reduce((acc, it) => {
      const qty = Object.values(stock[it.sku] || {}).reduce((a, b) => a + b, 0);
      return acc + qty * it.cost;
    }, 0);
  }, [items, stock]);

  const lowStock = useMemo(() => {
    return items.filter(it => {
      const qty = Object.values(stock[it.sku] || {}).reduce((a, b) => a + b, 0);
      return qty <= it.reorder;
    });
  }, [items, stock]);

  const sellerRanking = useMemo(() => {
    return items
      .map(it => ({
        item: it,
        sales:   sales30d[it.sku] || 0,
        revenue: (sales30d[it.sku] || 0) * it.price,
      }))
      .sort((a, b) => b.sales - a.sales);
  }, [items, sales30d]);

  // ---- helpers ----
  const pushToast = useCallback((msg, kind = 'ok') => {
    const id = Math.random().toString(36).slice(2);
    setToasts(t => [...t, { id, msg, kind }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3200);
  }, []);

  const nextRefId = () => `MV-${++mvCounter.current}`;

  const addLocalMv = useCallback((mv) => {
    setMovements(prev => [mv, ...prev].slice(0, 200));
  }, []);

  // ---- mutations ----
  const receiveGoods = useCallback(async ({ sku, qty, to, ref, note, user = 'คุณ' }) => {
    // optimistic update
    setStock(prev => {
      const cur = { ...(prev[sku] || {}) };
      cur[to] = (cur[to] || 0) + qty;
      return { ...prev, [sku]: cur };
    });
    const refId = nextRefId();
    addLocalMv({ id: refId, ts: Date.now(), type: 'in', sku, qty, from: null, to, ref: ref || '', user, note: note || '' });

    try {
      await Promise.all([
        db.rpc('adjust_stock', { p_sku: sku, p_loc: to, p_delta: qty }),
        db.from('movements').insert({
          ref_id: refId, type: 'in', sku, qty,
          to_loc: to, ref: ref || '', user_name: user, note: note || '',
        }),
      ]);
      const item = items.find(i => i.sku === sku);
      pushToast(`รับเข้า ${qty} ${item?.name || sku} → ${to}`, 'ok');
    } catch (err) {
      console.error('receiveGoods:', err);
      pushToast('เกิดข้อผิดพลาด — กรุณาลองใหม่', 'err');
    }
  }, [items, pushToast, addLocalMv]);

  const issueGoods = useCallback(async ({ sku, qty, from, ref, note, user = 'คุณ' }) => {
    setStock(prev => {
      const cur = { ...(prev[sku] || {}) };
      cur[from] = Math.max(0, (cur[from] || 0) - qty);
      return { ...prev, [sku]: cur };
    });
    setSales30d(prev => ({ ...prev, [sku]: (prev[sku] || 0) + qty }));
    const refId = nextRefId();
    addLocalMv({ id: refId, ts: Date.now(), type: 'out', sku, qty, from, to: null, ref: ref || '', user, note: note || '' });

    try {
      await Promise.all([
        db.rpc('adjust_stock', { p_sku: sku, p_loc: from, p_delta: -qty }),
        db.rpc('increment_sales', { p_sku: sku, p_qty: qty }),
        db.from('movements').insert({
          ref_id: refId, type: 'out', sku, qty,
          from_loc: from, ref: ref || '', user_name: user, note: note || '',
        }),
      ]);
      const item = items.find(i => i.sku === sku);
      pushToast(`จ่ายออก ${qty} ${item?.name || sku} จาก ${from}`, 'info');
    } catch (err) {
      console.error('issueGoods:', err);
      pushToast('เกิดข้อผิดพลาด — กรุณาลองใหม่', 'err');
    }
  }, [items, pushToast, addLocalMv]);

  const transferGoods = useCallback(async ({ sku, qty, from, to, ref, note, user = 'คุณ' }) => {
    setStock(prev => {
      const cur = { ...(prev[sku] || {}) };
      cur[from] = Math.max(0, (cur[from] || 0) - qty);
      cur[to]   = (cur[to]   || 0) + qty;
      return { ...prev, [sku]: cur };
    });
    const refId = nextRefId();
    addLocalMv({ id: refId, ts: Date.now(), type: 'transfer', sku, qty, from, to, ref: ref || '', user, note: note || '' });

    try {
      await Promise.all([
        db.rpc('adjust_stock', { p_sku: sku, p_loc: from, p_delta: -qty }),
        db.rpc('adjust_stock', { p_sku: sku, p_loc: to,   p_delta:  qty }),
        db.from('movements').insert({
          ref_id: refId, type: 'transfer', sku, qty,
          from_loc: from, to_loc: to, ref: ref || '', user_name: user, note: note || '',
        }),
      ]);
      pushToast(`โอน ${qty} หน่วย: ${from} → ${to}`, 'info');
    } catch (err) {
      console.error('transferGoods:', err);
      pushToast('เกิดข้อผิดพลาด — กรุณาลองใหม่', 'err');
    }
  }, [pushToast, addLocalMv]);

  const addItem = useCallback(async (itemData) => {
    const { error } = await db.from('items').insert(itemData);
    if (error) {
      pushToast('เพิ่มสินค้าไม่สำเร็จ: ' + error.message, 'err');
      return false;
    }
    setItems(prev => [...prev, { ...itemData, desc: itemData.description || '' }].sort((a, b) => a.name.localeCompare(b.name, 'th')));
    pushToast(`เพิ่ม "${itemData.name}" แล้ว`, 'ok');
    return true;
  }, [pushToast]);

  const updateItem = useCallback(async (sku, patch) => {
    const { error } = await db.from('items').update(patch).eq('sku', sku);
    if (error) {
      pushToast('แก้ไขไม่สำเร็จ: ' + error.message, 'err');
      return false;
    }
    setItems(prev => prev.map(i => i.sku === sku
      ? { ...i, ...patch, desc: patch.description !== undefined ? patch.description : i.desc }
      : i));
    return true;
  }, [pushToast]);

  const deleteItem = useCallback(async (sku) => {
    await db.from('movements').delete().eq('sku', sku);
    const { error } = await db.from('items').delete().eq('sku', sku);
    if (error) {
      pushToast('ลบสินค้าไม่สำเร็จ: ' + error.message, 'err');
      return false;
    }
    setItems(prev => prev.filter(i => i.sku !== sku));
    setStock(prev => { const n = { ...prev }; delete n[sku]; return n; });
    setSales30d(prev => { const n = { ...prev }; delete n[sku]; return n; });
    setMovements(prev => prev.filter(m => m.sku !== sku));
    pushToast('ลบสินค้าแล้ว', 'ok');
    return true;
  }, [pushToast]);

  const totalForSku = useCallback((sku) => {
    return Object.values(stock[sku] || {}).reduce((a, b) => a + b, 0);
  }, [stock]);

  const stockByLocation = useCallback((locId) => {
    return items.map(it => ({ item: it, qty: stock[it.sku]?.[locId] || 0 }));
  }, [items, stock]);

  // ---- loading / error screens ----
  if (loading) {
    return (
      <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', flexDirection:'column', gap:16, fontFamily:'Noto Sans Thai,sans-serif', color:'#888' }}>
        <div style={{ width:40, height:40, border:'3px solid #e8e7e0', borderTopColor:'oklch(0.5 0.16 260)', borderRadius:'50%', animation:'spin 0.8s linear infinite' }} />
        <p style={{ margin:0, fontSize:14 }}>กำลังโหลดข้อมูล...</p>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  if (dbError) {
    return (
      <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', flexDirection:'column', gap:12, fontFamily:'Noto Sans Thai,sans-serif', padding:32, textAlign:'center' }}>
        <div style={{ fontSize:40 }}>⚠️</div>
        <p style={{ margin:0, fontWeight:700, fontSize:16, color:'#c0392b' }}>เชื่อมต่อ Database ไม่สำเร็จ</p>
        <p style={{ margin:0, fontSize:13, color:'#888' }}>{dbError}</p>
        <p style={{ margin:0, fontSize:12, color:'#bbb' }}>กรุณาตรวจสอบ SUPABASE_URL และ SUPABASE_ANON_KEY ใน supabase-client.jsx</p>
        <button
          onClick={() => location.reload()}
          style={{ marginTop:8, padding:'8px 24px', background:'oklch(0.5 0.16 260)', color:'#fff', border:'none', borderRadius:8, cursor:'pointer', fontSize:14 }}
        >ลองใหม่</button>
      </div>
    );
  }

  const value = {
    items, locations, stock, movements, sales30d, photos, role, toasts,
    seriesMap: seriesMap.current,
    totalStock, totalValue, lowStock,
    receiveGoods, issueGoods, transferGoods,
    addItem, updateItem, deleteItem,
    totalForSku, stockByLocation, sellerRanking,
    setPhotos, setRole, pushToast,
  };

  return <StoreCtx.Provider value={value}>{children}</StoreCtx.Provider>;
}

function useStore() {
  return useContext(StoreCtx);
}

// ========== Helpers ==========
function fmtNum(n) {
  return new Intl.NumberFormat('th-TH').format(n);
}
function fmtBaht(n) {
  return '฿' + new Intl.NumberFormat('th-TH', { maximumFractionDigits: 0 }).format(n);
}
function timeAgo(ts) {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  if (m < 1)  return 'เพิ่งเกิดขึ้น';
  if (m < 60) return m + ' นาทีที่แล้ว';
  const h = Math.floor(m / 60);
  if (h < 24) return h + ' ชั่วโมงที่แล้ว';
  return Math.floor(h / 24) + ' วันที่แล้ว';
}
function fmtTime(ts) {
  return new Date(ts).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
}
function stockStatus(total, reorder) {
  if (total === 0)             return { kind: 'danger', label: 'หมด' };
  if (total <= reorder * 0.5) return { kind: 'danger', label: 'ต่ำมาก' };
  if (total <= reorder)       return { kind: 'warn',   label: 'ใกล้หมด' };
  return { kind: 'ok', label: 'ปกติ' };
}

Object.assign(window, {
  StoreProvider, useStore,
  fmtNum, fmtBaht, timeAgo, fmtTime, stockStatus,
});
