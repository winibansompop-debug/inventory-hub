// supabase-client.jsx
// ============================================================
// กรอก credentials จาก Supabase Dashboard:
// Project Settings → API → Project URL และ anon/public key
// ============================================================

(function () {
  var SUPABASE_URL     = 'https://YOUR_PROJECT_REF.supabase.co';
  var SUPABASE_ANON_KEY = 'YOUR_ANON_KEY_HERE';

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
