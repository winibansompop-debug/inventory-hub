// supabase-client.jsx
// ============================================================
// กรอก credentials จาก Supabase Dashboard:
// Project Settings → API → Project URL และ anon/public key
// ============================================================

(function () {
  var SUPABASE_URL     = 'https://tyfrohwsjzlvwjmameku.supabase.co';
  var SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR5ZnJvaHdzanpsdndqbWFtZWt1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk4NTE0ODMsImV4cCI6MjA5NTQyNzQ4M30.llp37NiMh8rb8n4Vsb-BbtlOPVyuFT9ch8pvqu4kBkc';

  if (!window.supabase) {
    console.error('[Inventory Hub] Supabase JS ไม่ได้โหลด — ตรวจสอบ script tag ใน HTML');
    return;
  }
  if (SUPABASE_URL.includes('YOUR_PROJECT_REF')) {
    console.warn('[Inventory Hub] กรุณาแก้ไข SUPABASE_URL และ SUPABASE_ANON_KEY ใน supabase-client.jsx');
  }

  window.supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    realtime: { params: { eventsPerSecond: 10 } },
  });
})();
