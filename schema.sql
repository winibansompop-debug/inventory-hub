-- ============================================================
-- Inventory Hub — Supabase Schema
-- วิธีใช้: เปิด SQL Editor ใน Supabase dashboard แล้ว Run ไฟล์นี้ทั้งหมด
-- ============================================================

-- 1. Locations
CREATE TABLE IF NOT EXISTS locations (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  kind        TEXT NOT NULL DEFAULT 'warehouse',
  address     TEXT DEFAULT '',
  capacity    INTEGER DEFAULT 0
);

-- 2. Items (product catalog)
CREATE TABLE IF NOT EXISTS items (
  sku         TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  category    TEXT DEFAULT '',
  color       TEXT DEFAULT '',
  price       NUMERIC(12,2) DEFAULT 0,
  cost        NUMERIC(12,2) DEFAULT 0,
  reorder     INTEGER DEFAULT 0,
  supplier    TEXT DEFAULT '',
  description TEXT DEFAULT ''
);

-- 3. Current stock levels
CREATE TABLE IF NOT EXISTS stock (
  sku         TEXT NOT NULL REFERENCES items(sku) ON DELETE CASCADE,
  location_id TEXT NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  qty         INTEGER NOT NULL DEFAULT 0 CHECK (qty >= 0),
  PRIMARY KEY (sku, location_id)
);

-- 4. Movement log
CREATE TABLE IF NOT EXISTS movements (
  id          BIGSERIAL PRIMARY KEY,
  ref_id      TEXT NOT NULL,
  ts          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  type        TEXT NOT NULL CHECK (type IN ('in', 'out', 'transfer', 'import')),
  sku         TEXT REFERENCES items(sku),
  qty         INTEGER NOT NULL CHECK (qty > 0),
  from_loc    TEXT REFERENCES locations(id),
  to_loc      TEXT REFERENCES locations(id),
  ref         TEXT DEFAULT '',
  user_name   TEXT DEFAULT 'คุณ',
  note        TEXT DEFAULT ''
);

-- 5. Sales summary (30-day rolling, updated on each goods issue)
CREATE TABLE IF NOT EXISTS sales_30d (
  sku         TEXT PRIMARY KEY REFERENCES items(sku) ON DELETE CASCADE,
  qty         INTEGER NOT NULL DEFAULT 0
);

-- ============================================================
-- Indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS movements_ts_idx  ON movements (ts DESC);
CREATE INDEX IF NOT EXISTS movements_sku_idx ON movements (sku);
CREATE INDEX IF NOT EXISTS stock_sku_idx     ON stock (sku);

-- ============================================================
-- RPC: atomic stock adjustment (prevents race conditions)
-- ============================================================
CREATE OR REPLACE FUNCTION adjust_stock(p_sku TEXT, p_loc TEXT, p_delta INTEGER)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO stock (sku, location_id, qty)
  VALUES (p_sku, p_loc, GREATEST(0, p_delta))
  ON CONFLICT (sku, location_id)
  DO UPDATE SET qty = GREATEST(0, stock.qty + p_delta);
END;
$$;

CREATE OR REPLACE FUNCTION increment_sales(p_sku TEXT, p_qty INTEGER)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO sales_30d (sku, qty) VALUES (p_sku, p_qty)
  ON CONFLICT (sku)
  DO UPDATE SET qty = sales_30d.qty + p_qty;
END;
$$;

-- ============================================================
-- Row Level Security (open policies — ล็อกด้วย Auth ได้ภายหลัง)
-- ============================================================
ALTER TABLE locations  ENABLE ROW LEVEL SECURITY;
ALTER TABLE items      ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock      ENABLE ROW LEVEL SECURITY;
ALTER TABLE movements  ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_30d  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "allow all" ON locations  FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow all" ON items      FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow all" ON stock      FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow all" ON movements  FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow all" ON sales_30d  FOR ALL USING (true) WITH CHECK (true);

-- ============================================================
-- Enable Realtime (for live movement feed + stock updates)
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE movements;
ALTER PUBLICATION supabase_realtime ADD TABLE stock;

-- ============================================================
-- Seed data (ข้อมูลเริ่มต้น)
-- ============================================================
INSERT INTO locations (id, name, kind, address, capacity) VALUES
  ('WH-A', 'คลังหลัก กรุงเทพฯ',      'warehouse', 'ลาดกระบัง 54',        1200),
  ('WH-B', 'คลังย่อย ปทุมธานี',        'warehouse', 'ปทุมธานี รังสิต',      600),
  ('SR-1', 'โชว์รูม สาทร',             'showroom',  'สาทรเหนือ',             80),
  ('SR-2', 'โชว์รูม เซ็นทรัล',         'showroom',  'เซ็นทรัลพระราม 9',     60),
  ('TR',   'พักของระหว่างขนส่ง',        'transit',   '—',                   200)
ON CONFLICT DO NOTHING;

INSERT INTO items (sku, name, category, color, price, cost, reorder, supplier, description) VALUES
  ('SOF-STH-3S',  'โซฟา 3 ที่นั่ง รุ่น Stockholm',  'โซฟา',       'เทาออาก',    24900, 14500,  6, 'Nordic Furniture Co.', 'โซฟาผ้าลินิน 3 ที่นั่ง ขาไม้แบบ Mid-century'),
  ('CHR-ERG-01',  'เก้าอี้ทำงาน Ergonomic Pro',     'เก้าอี้',    'ดำ',          8900,  4800, 12, 'OfficeMax Thailand',   'เก้าอี้สำนักงานปรับระดับ พนักหลังแบบตาข่าย'),
  ('TBL-WAL-CT',  'โต๊ะกลาง Walnut Circle',         'โต๊ะ',       'วอลนัท',      6500,  3200,  8, 'Teak House',           'โต๊ะกลางห้องนั่งเล่น ทรงกลม Ø80cm'),
  ('BED-KNG-OAK', 'เตียงนอน King Size รุ่น Oak',    'เตียงนอน',  'โอ๊ค',        18900,  9800,  4, 'Teak House',           'เตียงไม้โอ๊คขนาด King 6 ฟุต พร้อมหัวเตียงบุนวม'),
  ('SHF-LDR-5',   'ตู้หนังสือ 5 ชั้น Ladder',       'ตู้/ชั้น',  'ขาว',          4900,  2100, 10, 'MUJI Style Co.',       'ชั้นวางของแบบบันได 5 ชั้น สูง 180cm'),
  ('LMP-DSK-BR',  'โคมไฟตั้งโต๊ะ Brass Arc',        'ของตกแต่ง', 'ทองเหลือง',    2400,   980, 15, 'Lumin Studio',         'โคมไฟตั้งโต๊ะหัวโค้ง วัสดุทองเหลือง'),
  ('RUG-23-CRM',  'พรม 2x3 เมตร รุ่น Cream',        'ของตกแต่ง', 'ครีม',          5800,  2400,  8, 'Persian Loom',         'พรมขนสั้น Polyester 2x3 เมตร สีครีม'),
  ('MIR-WAL-180', 'กระจกเงา Floor Mirror 180cm',    'ของตกแต่ง', 'ดำด้าน',        3900,  1700,  6, 'Lumin Studio',         'กระจกเงาเต็มตัว ขอบเหล็กดำด้าน สูง 180cm'),
  ('CHR-DIN-RTN', 'เก้าอี้ทานข้าวรัตน์ Rattan',    'เก้าอี้',    'ธรรมชาติ',    3200,  1400, 12, 'Rattan Workshop',      'เก้าอี้ทานข้าวหวายธรรมชาติ ขาไม้สัก'),
  ('TBL-DIN-6P',  'โต๊ะทานข้าว 6 ที่นั่ง Teak',    'โต๊ะ',       'สักทอง',      22500, 11800,  3, 'Teak House',           'โต๊ะทานข้าวไม้สักทอง 180x90cm')
ON CONFLICT DO NOTHING;

INSERT INTO stock (sku, location_id, qty) VALUES
  ('SOF-STH-3S',  'WH-A', 14), ('SOF-STH-3S',  'WH-B',  6), ('SOF-STH-3S',  'SR-1', 1), ('SOF-STH-3S',  'SR-2', 1), ('SOF-STH-3S',  'TR', 2),
  ('CHR-ERG-01',  'WH-A', 38), ('CHR-ERG-01',  'WH-B', 22), ('CHR-ERG-01',  'SR-1', 4), ('CHR-ERG-01',  'SR-2', 4),
  ('TBL-WAL-CT',  'WH-A',  9), ('TBL-WAL-CT',  'WH-B',  4), ('TBL-WAL-CT',  'SR-1', 1), ('TBL-WAL-CT',  'SR-2', 1),
  ('BED-KNG-OAK', 'WH-A',  5), ('BED-KNG-OAK', 'WH-B',  2), ('BED-KNG-OAK', 'SR-1', 1), ('BED-KNG-OAK', 'TR',  1),
  ('SHF-LDR-5',   'WH-A', 28), ('SHF-LDR-5',   'WH-B', 16), ('SHF-LDR-5',   'SR-1', 2), ('SHF-LDR-5',   'SR-2', 3),
  ('LMP-DSK-BR',  'WH-A',  4), ('LMP-DSK-BR',  'WH-B',  2), ('LMP-DSK-BR',  'SR-1', 3), ('LMP-DSK-BR',  'SR-2', 2),
  ('RUG-23-CRM',  'WH-A', 18), ('RUG-23-CRM',  'WH-B',  9), ('RUG-23-CRM',  'SR-1', 2), ('RUG-23-CRM',  'SR-2', 2),
  ('MIR-WAL-180', 'WH-A',  3), ('MIR-WAL-180', 'WH-B',  1), ('MIR-WAL-180', 'SR-1', 1),
  ('CHR-DIN-RTN', 'WH-A', 24), ('CHR-DIN-RTN', 'WH-B', 14), ('CHR-DIN-RTN', 'SR-1', 4), ('CHR-DIN-RTN', 'SR-2', 4), ('CHR-DIN-RTN', 'TR', 2),
  ('TBL-DIN-6P',  'WH-A',  2), ('TBL-DIN-6P',  'WH-B',  1), ('TBL-DIN-6P',  'SR-1', 1), ('TBL-DIN-6P',  'SR-2', 1)
ON CONFLICT DO NOTHING;

INSERT INTO sales_30d (sku, qty) VALUES
  ('SOF-STH-3S',   42),
  ('CHR-ERG-01',  168),
  ('TBL-WAL-CT',   28),
  ('BED-KNG-OAK',  18),
  ('SHF-LDR-5',    96),
  ('LMP-DSK-BR',  124),
  ('RUG-23-CRM',   34),
  ('MIR-WAL-180',   9),
  ('CHR-DIN-RTN',  88),
  ('TBL-DIN-6P',    4)
ON CONFLICT DO NOTHING;

INSERT INTO movements (ref_id, ts, type, sku, qty, from_loc, to_loc, ref, user_name, note) VALUES
  ('MV-1042', NOW() - INTERVAL '8 minutes',   'in',       'CHR-ERG-01',  24, NULL,   'WH-A', 'PO-2026-0142', 'สมชาย', 'Restock จาก OfficeMax'),
  ('MV-1041', NOW() - INTERVAL '22 minutes',  'out',      'LMP-DSK-BR',   3, 'SR-1', NULL,   'SO-2026-0381', 'วิภา',   'ลูกค้า: คุณนิภา'),
  ('MV-1040', NOW() - INTERVAL '45 minutes',  'transfer', 'SOF-STH-3S',   2, 'WH-A', 'SR-1', 'TF-2026-022',  'สมชาย', 'โอนไปโชว์'),
  ('MV-1039', NOW() - INTERVAL '72 minutes',  'in',       'RUG-23-CRM',  12, NULL,   'WH-B', 'PO-2026-0141', 'วิภา',   ''),
  ('MV-1038', NOW() - INTERVAL '96 minutes',  'out',      'SHF-LDR-5',    2, 'SR-2', NULL,   'SO-2026-0380', 'ปรีดา',  ''),
  ('MV-1037', NOW() - INTERVAL '140 minutes', 'out',      'CHR-ERG-01',   4, 'SR-1', NULL,   'SO-2026-0379', 'วิภา',   ''),
  ('MV-1036', NOW() - INTERVAL '240 minutes', 'transfer', 'TBL-WAL-CT',   1, 'WH-A', 'SR-2', 'TF-2026-021',  'ปรีดา',  ''),
  ('MV-1035', NOW() - INTERVAL '320 minutes', 'in',       'MIR-WAL-180',  6, NULL,   'WH-A', 'PO-2026-0140', 'สมชาย', '')
ON CONFLICT DO NOTHING;
