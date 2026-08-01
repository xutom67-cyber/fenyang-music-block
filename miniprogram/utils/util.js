/* ==================== 汾阳路音乐街区 · 通用工具 ==================== */
const FY = require('./data.js');

/* ---------- 地图坐标（与 H5 原型一致的 GEO 仿射 + 校准） ---------- */
const GEO = { c1: 121.44702, s1: 1.5254e-5, c2: 31.2186, s2: -1.5e-5 };
const DEFAULT_CALIB = { style: 'sat', sx: 1, sy: 1.18, rot: 6, ox: 10, oy: 13 };
const TILE_UNITS = 360 / GEO.s1;
const lngOf = x => GEO.c1 + GEO.s1 * x;
const latOf = y => GEO.c2 + GEO.s2 * y;
function wmFrac(lng, lat) {
  const r = lat * Math.PI / 180;
  return [(lng + 180) / 360, (1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2];
}
function wmLatInv(fy) { return Math.atan(Math.sinh(Math.PI * (1 - 2 * fy))) * 180 / Math.PI; }
function tileUrl(tx, ty, z, style) {
  const h = 1 + ((tx + ty) % 4);
  return style === 'sat'
    ? `https://webst0${h}.is.autonavi.com/appmaptile?style=6&x=${tx}&y=${ty}&z=${z}`
    : `https://webrd0${h}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x=${tx}&y=${ty}&z=${z}`;
}
/* 校准正变换：内容坐标 → 瓦片/原始坐标（与 H5 contentTransform 一致） */
function calibX(x, y, calib) {
  const c = calib || DEFAULT_CALIB;
  const r = (c.rot || 0) * Math.PI / 180, cos = Math.cos(r), sin = Math.sin(r);
  return (c.ox || 0) + (c.sx || 1) * (x * cos - y * sin);
}
function calibY(x, y, calib) {
  const c = calib || DEFAULT_CALIB;
  const r = (c.rot || 0) * Math.PI / 180, cos = Math.cos(r), sin = Math.sin(r);
  return (c.oy || 0) + (c.sy || 1) * (x * sin + y * cos);
}

/* ---------- 通用 ---------- */
function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m])); }
function pad(n) { return String(n).padStart(2, '0'); }
function hm(d) { return `${pad(d.getHours())}:${pad(d.getMinutes())}`; }
function fmtDur(ms) {
  const s = Math.floor(ms / 1000), h = Math.floor(s / 3600);
  const m = pad(Math.floor((s % 3600) / 60)), ss = pad(s % 60);
  return h > 0 ? `${h}:${m}:${ss}` : `${m}:${ss}`;
}
function load(key, fb) { try { const v = wx.getStorageSync(key); return v === '' || v == null ? fb : v; } catch (e) { return fb; } }
function save(key, v) { try { wx.setStorageSync(key, v); } catch (e) {} }

/* ---------- 演出场次 ---------- */
function buildSchedule(v, now) {
  now = now || new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return (v.seeds || []).map((s, i) => {
    let d;
    if (s.t !== undefined) d = new Date(now.getTime() + s.t * 60000);
    else {
      const day = new Date(today.getTime() + (s.d || 1) * 86400000);
      const [hh, mm] = s.hm.split(':').map(Number);
      d = new Date(day.getFullYear(), day.getMonth(), day.getDate(), hh, mm);
    }
    return { idx: i, title: s.title, room: s.room, dur: s.dur, time: d, label: s.t !== undefined ? '今日' : '明日' };
  });
}
function isPast(p, now) { return p.time.getTime() + parseInt(p.dur) * 60000 < now.getTime(); }
function nextShows(n, now) {
  now = now || new Date();
  const all = [];
  for (const v of FY.venues) for (const p of buildSchedule(v, now)) {
    if (!isPast(p, now)) all.push({ v, p });
  }
  return all.sort((a, b) => a.p.time.getTime() - b.p.time.getTime()).slice(0, n);
}
function fmtWhen(iso) {
  const d = new Date(iso), now = new Date();
  const label = d.toDateString() === now.toDateString() ? '今日'
    : d.toDateString() === new Date(now.getTime() + 86400000).toDateString() ? '明日'
    : `${d.getMonth() + 1}/${d.getDate()}`;
  return `${label} ${hm(d)}`;
}
/* 订单状态：ticket 按演出结束时间；shop 按取货时段 */
function ticketOrderStatus(o) { return Date.now() >= new Date(o.when).getTime() + parseInt(o.dur) * 60000 ? 'done' : 'waiting'; }
function shopOrderStatus(o) { return Date.now() >= new Date(o.slotISO).getTime() ? 'done' : 'waiting'; }
function ticketCount(list, vid, idx) { return list.filter(t => t.vid === vid && t.idx === idx).reduce((a, t) => a + t.qty, 0); }
function ratingCount() {
  const r = load('fy_ratings_v1', { perf: {}, shop: {} });
  let n = 0;
  Object.values(r.perf || {}).forEach(e => { if (e && e.my != null) n++; });
  Object.values(r.shop || {}).forEach(e => { if (e && e.my != null) n++; });
  return n;
}

module.exports = {
  FY, GEO, DEFAULT_CALIB, TILE_UNITS,
  lngOf, latOf, wmFrac, wmLatInv, tileUrl, calibX, calibY,
  clamp, esc, pad, hm, fmtDur, load, save,
  buildSchedule, isPast, nextShows, fmtWhen,
  ticketOrderStatus, shopOrderStatus, ticketCount, ratingCount
};
