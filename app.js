/* ============================================================
   汾阳路音乐街区 · 小程序原型逻辑
   主界面地图 / 编辑模式 / 二级界面（时间表·倒计时·密度·商店）
   / 评分系统（0–5.0） / localStorage 持久化
   ============================================================ */
(function () {
'use strict';
const D = window.FY;
const $  = (s, el) => (el || document).querySelector(s);
const $$ = (s, el) => Array.from((el || document).querySelectorAll(s));
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
const NS = 'http://www.w3.org/2000/svg';

/* ---------------- 持久化 ---------------- */
const LS_EDIT = 'fy_editor_v1';
const LS_RATE = 'fy_ratings_v1';
function loadJSON(key, fb) { try { const v = JSON.parse(localStorage.getItem(key)); return v == null ? fb : v; } catch (e) { return fb; } }

let editState = loadJSON(LS_EDIT, null);   // { blocks:{id:color}, markers:{id:{x,y}}, renov:{id:{x,y,w,h,title,body,label,num}} }
let ratings   = loadJSON(LS_RATE, { perf: {}, shop: {} }); // { perf:{key:{my,comments}}, shop:{id:{my,comments}} }
let editMode = false;
let currentVenue = null, currentShop = null;
let cdTimer = null, paletteTarget = null, markerMoved = false;
let mapLayer = 'base', currentCdList = null;
let view = { x: 0, y: 0, w: 760, h: 880 };   // 地图视口（viewBox）
let panMoved = false;                          // 平移后抑制误触点击
const VIEW_MIN_W = 240, VIEW_MAX_W = 1700;

/* ---------------- 地图校准（大小 / 位置 / 朝向 / 风格，来自 calibrate.html） ---------------- */
const LS_CAL = 'fy_calib_v1';
let calib = loadJSON(LS_CAL, null);            // { style:'hand'|'sat'|'map', sx, sy, rot, ox, oy }
/* 无存档时默认：卫星底图 + 已验证的对齐参数（小清新滤镜由 CSS 应用） */
if (!calib) calib = { style: 'sat', sx: 1, sy: 1.18, rot: 6, ox: 10, oy: 13 };
/* 默认仿射（示意图坐标 → 经纬度，轴对齐 + 修正纵向比例）：
   常熟路×淮海中路 (110,120)→(121.4487,31.2168)；陕西南路×淮海中路 (700,139)→(121.4577,31.2158)
   淮海中路→复兴中路 300 单位 ≈ 0.0045°（修正了纵向被压扁 46% 的问题） */
const GEO = { c1: 121.44702, s1: 1.5254e-5, c2: 31.2186, s2: -1.5e-5 };
const TILE_UNITS = 360 / GEO.s1;               // 360° 经度对应的示意图单位数
const lngOf = x => GEO.c1 + GEO.s1 * x;
const latOf = y => GEO.c2 + GEO.s2 * y;
function wmFrac(lng, lat) {
  const r = lat * Math.PI / 180;
  return [(lng + 180) / 360, (1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2];
}
function wmLatInv(fy) { return Math.atan(Math.sinh(Math.PI * (1 - 2 * fy))) * 180 / Math.PI; }
function tileUrl(tx, ty, z) {
  const h = 1 + ((tx + ty) % 4);
  return calib.style === 'sat'
    ? `https://webst0${h}.is.autonavi.com/appmaptile?style=6&x=${tx}&y=${ty}&z=${z}`
    : `https://webrd0${h}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x=${tx}&y=${ty}&z=${z}`;
}
function contentTransform() {
  if (!calib) return '';
  const ox = calib.ox || 0, oy = calib.oy || 0, rot = calib.rot || 0;
  const sx = calib.sx || calib.scale || 1, sy = calib.sy || calib.scale || 1;
  return `translate(${ox},${oy}) rotate(${rot}) scale(${sx},${sy})`;
}
let lastTileKey = '';
function renderTiles() {
  const layer = $('#tile-layer');
  if (!layer) return;
  const key = `${view.x.toFixed(0)},${view.y.toFixed(0)},${view.w.toFixed(0)},${view.h.toFixed(0)}|${calib ? calib.style : ''}`;
  if (key === lastTileKey) return;
  lastTileKey = key;
  layer.innerHTML = '';
  if (!calib || calib.style === 'hand') return;
  const z = clamp(Math.round(Math.log2(TILE_UNITS * 343 / (view.w * 130))), 14, 19);
  const N = 2 ** z;
  const [fx1, fy1] = wmFrac(lngOf(view.x), latOf(view.y));
  const [fx2, fy2] = wmFrac(lngOf(view.x + view.w), latOf(view.y + view.h));
  const tx1 = Math.floor(fx1 * N), tx2 = Math.floor(fx2 * N);
  const ty1 = Math.floor(fy1 * N), ty2 = Math.floor(fy2 * N);
  if ((tx2 - tx1 + 1) * (ty2 - ty1 + 1) > 42) return;   // 极端缩放时限制瓦片数量
  for (let ty = ty1; ty <= ty2; ty++) for (let tx = tx1; tx <= tx2; tx++) {
    const lngA = tx / N * 360 - 180, lngB = (tx + 1) / N * 360 - 180;
    const latT = wmLatInv(ty / N), latB = wmLatInv((ty + 1) / N);
    const x1 = (lngA - GEO.c1) / GEO.s1, x2 = (lngB - GEO.c1) / GEO.s1;
    const y1 = (latT - GEO.c2) / GEO.s2, y2 = (latB - GEO.c2) / GEO.s2;
    const img = svgEl('image', {
      x: Math.min(x1, x2), y: Math.min(y1, y2),
      width: Math.abs(x2 - x1), height: Math.abs(y2 - y1),
      preserveAspectRatio: 'none', opacity: .96, 'pointer-events': 'none'
    }, layer);
    img.setAttribute('href', tileUrl(tx, ty, z));
  }
}

function saveEdit()  { localStorage.setItem(LS_EDIT, JSON.stringify(editState)); }
function saveRatings(){ localStorage.setItem(LS_RATE, JSON.stringify(ratings)); }
function blockFill(id) {
  const b = D.blocks.find(x => x.id === id);
  return (editState && editState.blocks && editState.blocks[id]) || b.fill;
}
function markerPos(id) {
  if (editState && editState.markers && editState.markers[id]) return editState.markers[id];
  const v = D.venues.find(x => x.id === id);
  return { x: v.x, y: v.y };
}

/* ================= 地图缩放 / 平移 ================= */
function applyView() {
  $('#map').setAttribute('viewBox', `${view.x} ${view.y} ${view.w} ${view.h}`);
  renderTiles();
}
function clampView() {
  view.x = clamp(view.x, -view.w * 0.45, 760 - view.w * 0.55);
  view.y = clamp(view.y, -view.h * 0.45, 880 - view.h * 0.55);
}
let viewSaveTimer = null;
function queueSaveView() {
  clearTimeout(viewSaveTimer);
  viewSaveTimer = setTimeout(() => {
    if (!editState) editState = {};
    editState.view = { x: view.x, y: view.y, w: view.w, h: view.h };
    saveEdit();
  }, 400);
}
function zoomBy(f) {
  const nw = clamp(view.w * f, VIEW_MIN_W, VIEW_MAX_W);
  const nh = nw * 880 / 760;
  view.x += (view.w - nw) / 2;
  view.y += (view.h - nh) / 2;
  view.w = nw; view.h = nh;
  clampView(); applyView(); queueSaveView();
}
function resetView() {
  view = { x: 0, y: 0, w: 760, h: 880 };
  applyView(); queueSaveView();
}

/* 滚轮缩放（以光标位置为中心） */
$('#map').addEventListener('wheel', e => {
  e.preventDefault();
  const r = $('#map').getBoundingClientRect();
  const fx = (e.clientX - r.left) / r.width, fy = (e.clientY - r.top) / r.height;
  const f = e.deltaY < 0 ? 0.86 : 1.16;
  const nw = clamp(view.w * f, VIEW_MIN_W, VIEW_MAX_W);
  const nh = nw * 880 / 760;
  view.x = view.x + fx * view.w - fx * nw;
  view.y = view.y + fy * view.h - fy * nh;
  view.w = nw; view.h = nh;
  clampView(); applyView(); queueSaveView();
}, { passive: false });

/* 拖动平移 + 双指缩放（编辑模式下禁用，拖动留给标记点） */
const pointers = new Map();
let drag = null;
$('#map').addEventListener('pointerdown', e => {
  panMoved = false;
  if (editMode) return;
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (pointers.size === 1) {
    drag = { pinch: false, id: e.pointerId, sx: e.clientX, sy: e.clientY, vx: view.x, vy: view.y, moved: false };
  } else if (pointers.size === 2) {
    const pts = [...pointers.values()];
    drag = {
      pinch: true,
      dist: Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y),
      vx: view.x, vy: view.y, vw: view.w,
      cx: (pts[0].x + pts[1].x) / 2, cy: (pts[0].y + pts[1].y) / 2
    };
  }
});
window.addEventListener('pointermove', e => {
  if (!pointers.has(e.pointerId) || !drag) return;
  if (drag.pinch) {
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const pts = [...pointers.values()];
    const nd = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
    if (nd > 0 && drag.dist > 0) {
      const vh = drag.vw * 880 / 760;
      const nw = clamp(drag.vw * drag.dist / nd, VIEW_MIN_W, VIEW_MAX_W);
      const nh = nw * 880 / 760;
      const r = $('#map').getBoundingClientRect();
      const fx = drag.cx / r.width, fy = drag.cy / r.height;
      view.x = drag.vx + fx * drag.vw - fx * nw;
      view.y = drag.vy + fy * vh - fy * nh;
      view.w = nw; view.h = nh;
      clampView(); applyView();
    }
    return;
  }
  if (e.pointerId !== drag.id) return;
  const dx = e.clientX - drag.sx, dy = e.clientY - drag.sy;
  if (Math.abs(dx) + Math.abs(dy) > 5) drag.moved = true;
  const r = $('#map').getBoundingClientRect();
  const s = view.w / r.width;
  view.x = drag.vx - dx * s;
  view.y = drag.vy - dy * s;
  clampView(); applyView();
});
window.addEventListener('pointerup', e => {
  if (!pointers.has(e.pointerId)) return;
  pointers.delete(e.pointerId);
  if (drag && drag.pinch) {
    if (pointers.size >= 2) return;
    if (pointers.size === 1) {
      const pid = [...pointers.keys()][0], p = [...pointers.values()][0];
      drag = { pinch: false, id: pid, sx: p.x, sy: p.y, vx: view.x, vy: view.y, moved: false };
      return;
    }
    drag = null;
    queueSaveView();
  } else if (drag && e.pointerId === drag.id) {
    if (drag.moved) panMoved = true;
    drag = null;
    queueSaveView();
  }
});
window.addEventListener('pointercancel', e => {
  pointers.delete(e.pointerId);
  if (drag && (drag.id === e.pointerId || drag.pinch)) drag = null;
});

/* ================= 地图渲染 ================= */
function svgEl(tag, attrs, parent) {
  const n = document.createElementNS(NS, tag);
  for (const k in attrs) n.setAttribute(k, attrs[k]);
  if (parent) parent.appendChild(n);
  return n;
}

function renderMap() {
  const svg = $('#map');
  svg.innerHTML = '';
  const L = mapLayer;
  const real = !!(calib && calib.style !== 'hand');

  /* 写实底图图层（置于最底层，由 renderTiles 填充；卫星样式加小清新滤镜） */
  const tl = svgEl('g', { id: 'tile-layer', 'pointer-events': 'none' }, svg);
  if (real) tl.dataset.style = calib.style;
  lastTileKey = '';   // 图层已重建，强制 renderTiles 重新生成瓦片
  /* 内容组：应用校准的大小 / 位置变换 */
  const C = svgEl('g', { id: 'map-content', transform: contentTransform() }, svg);

  const defs = svgEl('defs', {}, C);
  const pat = svgEl('pattern', { id: 'bld', width: 46, height: 44, patternUnits: 'userSpaceOnUse' }, defs);
  svgEl('rect', { x: 3, y: 5, width: 36, height: 24, rx: 3, fill: '#FFFFFF', stroke: '#E6E8E0', 'stroke-width': 1.1, opacity: .88 }, pat);
  const tpat = svgEl('pattern', { id: 'treeP', width: 52, height: 52, patternUnits: 'userSpaceOnUse' }, defs);
  svgEl('circle', { cx: 12, cy: 14, r: 5.5, fill: '#BCD9B0', opacity: .9 }, tpat);
  svgEl('circle', { cx: 38, cy: 38, r: 4.5, fill: '#C9E2BE', opacity: .9 }, tpat);
  const hf = svgEl('filter', { id: 'heatBlur', x: '-60%', y: '-60%', width: '220%', height: '220%' }, defs);
  svgEl('feGaussianBlur', { stdDeviation: 16 }, hf);

  /* 街区色块（仅手绘模式；写实模式由卫星底图呈现真实街区） */
  if (!real) {
  for (const b of D.blocks) {
    const poly = svgEl('polygon', {
      points: b.points, class: 'block' + (editMode ? ' editable' : ''),
      fill: blockFill(b.id),
      'pointer-events': editMode ? 'all' : 'none',
      'data-id': b.id
    }, C);
    if (editMode) poly.addEventListener('click', onBlockClick);
    svgEl('polygon', { points: b.points, fill: b.park ? 'url(#treeP)' : 'url(#bld)', 'pointer-events': 'none' }, C);
  }
    for (const [x, y] of D.parkTrees) svgEl('circle', { cx: x, cy: y, r: 7, class: 'tree' }, C);
    svgEl('text', { x: 150, y: 66, class: 'park-name' }, C).textContent = '襄阳公园';
  }

  /* 道路（仅手绘模式） */
  if (!real) {
  for (const s of D.streets) {
    svgEl('path', { d: s.d, class: 'street-edge', 'pointer-events': 'none' }, C);
    svgEl('path', { d: s.d, class: 'street', 'pointer-events': 'none' }, C);
    const t = svgEl('text', { class: 'street-label', 'text-anchor': 'middle', 'dominant-baseline': 'middle', 'pointer-events': 'none' }, C);
    t.textContent = s.name;
    if (s.rot) t.setAttribute('transform', `translate(${s.label[0]},${s.label[1]}) rotate(${s.rot})`);
    else { t.setAttribute('x', s.label[0]); t.setAttribute('y', s.label[1]); }
  }
  }

  /* 普希金广场（仅手绘模式） */
  if (!real) {
  svgEl('circle', { cx: D.plaza.x, cy: D.plaza.y, r: D.plaza.r, fill: D.plaza.fill, stroke: '#BFD8C0', 'stroke-width': 2 }, C);
  svgEl('circle', { cx: D.plaza.x, cy: D.plaza.y, r: D.plaza.r - 10, fill: 'none', stroke: '#BFD8C0', 'stroke-width': 1, 'stroke-dasharray': '3 4' }, C);
  }

  /* 景点（基础 / 热力图层） */
  if (L !== 'show') for (const sp of D.spots) {
    const g = svgEl('g', {}, C);
    svgEl('path', { d: `M ${sp.x} ${sp.y - 7} L ${sp.x + 7} ${sp.y} L ${sp.x} ${sp.y + 7} L ${sp.x - 7} ${sp.y} Z`, class: 'spot-dia' }, g);
    svgEl('text', { x: sp.x, y: sp.y + 20, class: 'spot-label' }, g).textContent = sp.name;
  }

  /* 活动场地标记 */
  for (const v of D.venues) {
    const p = markerPos(v.id);
    const g = svgEl('g', { class: 'venue-marker', 'data-id': v.id, transform: `translate(${p.x},${p.y})` }, C);
    svgEl('circle', { r: 22, class: 'vm-ring', fill: '#7FB69A' }, g);
    svgEl('circle', { r: 15, class: 'vm-circle' }, g);
    svgEl('text', { class: 'vm-glyph', y: 0.5 }, g).textContent = v.glyph;
    svgEl('text', { class: 'vm-label', y: 29 }, g).textContent = v.name;
    if (L === 'show') {
      const chip = svgEl('g', { class: 'cd-chip', 'data-vid': v.id, transform: 'translate(0,47)' }, g);
      svgEl('rect', { x: -50, y: -11, width: 100, height: 22, rx: 11, fill: '#fff', stroke: '#DCEAD9' }, chip);
      svgEl('text', { class: 'cd-txt', y: 2, 'text-anchor': 'middle', 'dominant-baseline': 'central', 'font-size': 10, 'font-weight': 800 }, chip).textContent = '…';
    }
    g.addEventListener('pointerdown', onMarkerDown);
    g.addEventListener('click', () => {
      if (markerMoved) return;
      if (panMoved) { panMoved = false; return; }
      openVenue(v.id);
    });
  }

  /* 音乐广场（上方花园 · 线性绿地）——仅手绘模式；写实模式由场地标记代替 */
  const mp = D.musicPlaza;
  if (!real && L !== 'show') {
  svgEl('rect', { x: mp.x - mp.w / 2, y: mp.y - mp.h / 2, width: mp.w, height: mp.h, rx: mp.h / 2, fill: '#CBE3C7', stroke: '#A8CBA2', 'stroke-width': 1.5, 'pointer-events': 'none' }, C);
  mp.nodes.forEach(n => {
    const g = svgEl('g', { class: 'stage-node', transform: `translate(${n.x},${n.y})` }, C);
    svgEl('circle', { r: 10, fill: '#7FB69A', stroke: '#fff', 'stroke-width': 2 }, g);
    svgEl('text', { y: 1, 'font-size': 10, fill: '#fff', 'text-anchor': 'middle', 'dominant-baseline': 'central', 'font-weight': 800 }, g).textContent = '♪';
    svgEl('title', {}, g).textContent = n.name + '（点击查看演出）';
    g.addEventListener('click', () => {
      if (panMoved) { panMoved = false; return; }
      openVenue('shangfang-plaza');
    });
  });
  }

  /* 商店标记点（点击打开店铺详情，仅基础图层） */
  if (L === 'base') for (const sid in D.shops) {
    const s = D.shops[sid];
    const g = svgEl('g', { class: 'shop-marker', transform: `translate(${s.map.x},${s.map.y})` }, C);
    svgEl('circle', { r: 8.5, fill: '#fff', stroke: '#C9A96A', 'stroke-width': 1.8 }, g);
    svgEl('text', { y: 1, 'font-size': 8.5, fill: '#A87B3C', 'text-anchor': 'middle', 'dominant-baseline': 'central', 'font-weight': 800 }, g).textContent = s.glyph;
    svgEl('title', {}, g).textContent = s.name + ' · ' + s.type;
    g.addEventListener('click', e => {
      e.stopPropagation();
      if (panMoved) { panMoved = false; return; }
      openShop(sid);
    });
  }

  /* 实时热力图层（人群密度） */
  if (L === 'heat') {
    for (const v of D.venues) {
      const p = markerPos(v.id);
      const c = venueCrowd(v.id);
      svgEl('circle', { cx: p.x, cy: p.y, r: 30 + c.level * 13, fill: levelColor(c.level), opacity: .42, class: 'heat-blob', 'pointer-events': 'none' }, C);
    }
  }

  /* 指北针 + 比例尺（固定，不随内容缩放） */
  svgEl('text', { x: 706, y: 40, class: 'compass-n' }, svg).textContent = 'N';
  svgEl('text', { x: 706, y: 52, class: 'compass' }, svg).textContent = '↑';
  svgEl('line', { x1: 24, y1: 838, x2: 124, y2: 838, class: 'scale-line' }, svg);
  svgEl('line', { x1: 24, y1: 830, x2: 24, y2: 846, class: 'scale-line' }, svg);
  svgEl('line', { x1: 124, y1: 830, x2: 124, y2: 846, class: 'scale-line' }, svg);
  svgEl('text', { x: 24, y: 828, class: 'scale-txt' }, svg).textContent = '0';
  svgEl('text', { x: 78, y: 828, class: 'scale-txt', 'text-anchor': 'middle' }, svg).textContent = '100m';
  svgEl('text', { x: 124, y: 828, class: 'scale-txt', 'text-anchor': 'end' }, svg).textContent = '200m';

  /* 写实底图瓦片（依据当前视口重算） */
  renderTiles();
}

/* ---------- 编辑：街区改色 ---------- */
function onBlockClick(e) {
  e.stopPropagation();
  const id = e.currentTarget.getAttribute('data-id');
  paletteTarget = id;
  const b = D.blocks.find(x => x.id === id);
  const phRect = $('.phone').getBoundingClientRect();
  const x = e.clientX - phRect.left, y = e.clientY - phRect.top;
  openPalette(x, y, b.name, blockFill(id));
}
function openPalette(x, y, name, cur) {
  const p = $('#palette');
  p.innerHTML = '';
  const nm = document.createElement('div'); nm.className = 'pal-name'; nm.textContent = '街区 · ' + name;
  p.appendChild(nm);
  const grid = document.createElement('div'); grid.className = 'pal-grid';
  D.palette.forEach(s => {
    const sw = document.createElement('button');
    sw.className = 'sw' + (s.v.toLowerCase() === cur.toLowerCase() ? ' cur' : '');
    sw.style.background = s.v;
    const lbl = document.createElement('span'); lbl.className = 'sw-name'; lbl.textContent = s.name;
    sw.appendChild(lbl);
    sw.addEventListener('click', e => { e.stopPropagation(); setBlockColor(paletteTarget, s.v); closePalette(); });
    grid.appendChild(sw);
  });
  p.appendChild(grid);
  const custom = document.createElement('div'); custom.className = 'pal-custom';
  const inp = document.createElement('input'); inp.type = 'color'; inp.value = cur;
  const sp = document.createElement('span'); sp.textContent = '自定义颜色';
  inp.addEventListener('input', e => { e.stopPropagation(); setBlockColor(paletteTarget, inp.value); });
  custom.append(inp, sp);
  p.appendChild(custom);
  p.hidden = false;
  p.style.left = clamp(x, 8, 375 - 216) + 'px';
  p.style.top  = clamp(y, 8, 790 - 150) + 'px';
  p.addEventListener('click', e => e.stopPropagation());
}
function closePalette() { $('#palette').hidden = true; paletteTarget = null; }
function setBlockColor(id, color) {
  if (!editState) editState = {};
  if (!editState.blocks) editState.blocks = {};
  editState.blocks[id] = color;
  saveEdit();
  renderMap();
}

/* ---------- 编辑：标记点拖拽 ---------- */
function toSvg(e) {
  const svg = $('#map');
  const pt = svg.createSVGPoint();
  pt.x = e.clientX; pt.y = e.clientY;
  return pt.matrixTransform(svg.getScreenCTM().inverse());
}
function onMarkerDown(e) {
  if (!editMode) return;
  const g = e.currentTarget;
  const id = g.getAttribute('data-id');
  const svg = $('#map');
  const p0 = toSvg(e);
  markerMoved = false;
  try { g.setPointerCapture(e.pointerId); } catch (err) { /* 合成事件或指针已释放时忽略 */ }
  const move = ev => {
    const p = toSvg(ev);
    const dx = p.x - p0.x, dy = p.y - p0.y;
    if (Math.abs(dx) + Math.abs(dy) > 3) markerMoved = true;
    /* 视口增量 → 内容增量（用内容组自身的变换矩阵逆，不含 viewBox 缩放） */
    let dcx = dx, dcy = dy;
    const cg = document.getElementById('map-content');
    if (cg && cg.transform.baseVal.numberOfItems) {
      try {
        const inv = cg.transform.baseVal.consolidate().matrix.inverse();
        dcx = inv.a * dx + inv.c * dy;
        dcy = inv.b * dx + inv.d * dy;
      } catch (err) { /* 退化为恒等 */ }
    }
    const cur = markerPos(id);
    const nx = clamp(cur.x + dcx, 40, 720), ny = clamp(cur.y + dcy, 140, 800);
    g.setAttribute('transform', `translate(${nx},${ny})`);
    if (!editState) editState = {};
    if (!editState.markers) editState.markers = {};
    editState.markers[id] = { x: nx, y: ny };
  };
  const up = () => {
    g.removeEventListener('pointermove', move);
    g.removeEventListener('pointerup', up);
    saveEdit();
  };
  g.addEventListener('pointermove', move);
  g.addEventListener('pointerup', up);
}

/* ================= 编辑模式开关 ================= */
function setEditMode(on) {
  editMode = on;
  $$('.btn-edit').forEach(btn => {
    btn.textContent = on ? '✓ 完成' : '✏️ 编辑';
    btn.classList.toggle('on', on);
  });
  $('#editbar').hidden = !on;
  $('.phone').classList.toggle('editing', on);
  renderMap();
  if (!on) closePalette();
}
function exportJSON() {
  const data = {
    version: 1, exportedAt: new Date().toLocaleString('zh-CN'),
    blocks:  (editState && editState.blocks) || {},
    markers: (editState && editState.markers) || {},
    renov:   (editState && editState.renov) || {},
    view:    editState && editState.view ? editState.view : view
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = '汾阳路音乐街区-布局配置.json';
  a.click();
  URL.revokeObjectURL(a.href);
  toast('布局配置已导出');
}
function resetEdit() {
  if (!window.confirm('确定恢复默认布局？将清除当前所有颜色与位置配置。')) return;
  localStorage.removeItem(LS_EDIT);
  editState = null;
  renderMap();
  toast('已恢复默认布局');
}

/* ================= 人群 / 商店实时模拟 ================= */
const crowdState = {}, shopState = {};
function statusOf(l) { return l <= 2 ? '畅通' : l === 3 ? '较顺畅' : l === 4 ? '拥挤' : '非常拥挤'; }
function levelColor(l) { return l <= 2 ? '#6FAF8A' : l === 3 ? '#D9C36A' : l === 4 ? '#E8A96F' : '#D97B6A'; }
function venueCrowd(id) {
  const v = D.venues.find(x => x.id === id);
  if (!crowdState[id]) crowdState[id] = { level: v.densityBase, pct: v.densityBase * 16 + 12, pass: v.passBase + v.densityBase };
  return crowdState[id];
}
function shopLive(id) {
  const s = D.shops[id];
  if (!shopState[id]) shopState[id] = {
    crowd: s.crowdBase, orders: s.ordersBase, wait: s.waitBase,
    busy: s.status !== '空闲', status: s.status
  };
  return shopState[id];
}
setInterval(() => {
  for (const v of D.venues) {
    const c = venueCrowd(v.id);
    c.level = clamp(c.level + (Math.random() < .38 ? (Math.random() < .5 ? 1 : -1) : 0), 1, 5);
    c.pct = clamp(c.pct + (Math.random() - .5) * 15, 5, 98);
    c.pass = clamp(c.pass + (Math.random() - .5) * 2.6, v.passBase * .6, v.passBase * 2.2);
  }
  if (currentVenue) renderStatus(D.venues.find(x => x.id === currentVenue));
  renderVenueCards();
  if (mapLayer === 'heat') renderMap();
}, 8000);
setInterval(() => {
  for (const id in D.shops) {
    const l = shopLive(id);
    l.crowd = Math.max(0, Math.round(l.crowd + (Math.random() - .5) * 5));
    l.orders = Math.max(0, Math.round(l.orders + (Math.random() - .5) * 2));
    l.wait = Math.max(1, Math.round(l.wait + (Math.random() - .5) * 2));
    l.busy = l.orders >= 4 || l.crowd >= 15;
    l.status = l.busy ? '排队中' : (l.orders > 0 ? '出餐中' : '空闲');
  }
  if (currentShop) renderShopLive(currentShop);
}, 10000);
/* 全局 1 秒心跳：场地倒计时 + 地图演出图层倒计时芯片 + 首页今日演出倒计时 */
setInterval(() => {
  tickCountdown();
  if (mapLayer === 'show') updateMapChips();
  updateHomeShows();
}, 1000);

/* ================= 主界面：活动场地卡片 ================= */
function renderVenueCards() {
  const wrap = $('#venue-cards');
  wrap.innerHTML = '';
  D.venues.forEach(v => {
    const c = venueCrowd(v.id);
    const card = document.createElement('div');
    card.className = 'venue-card';
    card.innerHTML =
      `<div class="vc-glyph">${v.glyph}</div>` +
      `<div class="vc-info"><div class="vc-name">${v.name}</div>` +
      `<div class="vc-addr">${v.addr}</div>` +
      `<div class="vc-meta"><span class="vc-rate">★ ${v.ratingBase.avg.toFixed(1)}</span>` +
      `<span class="vc-crowd c${c.level}">${statusOf(c.level)}</span></div></div>` +
      `<span class="vc-arrow">›</span>`;
    card.addEventListener('click', () => openVenue(v.id));
    wrap.appendChild(card);
  });
}

/* ================= 页面导航 / 图层切换 ================= */
function showScreen(name) {
  ['main', 'project', 'venues', 'shops', 'profile'].forEach(n => {
    $('#screen-' + n).hidden = n !== name;
  });
  $$('#tabbar .tab').forEach(t => t.classList.toggle('on', t.dataset.tab === name));
  if (name === 'main') renderHome();
  if (name === 'profile') { renderOrders(); renderProfile(); }
  if (name !== 'main') closePalette();
}
function setLayer(l) {
  mapLayer = l;
  $$('#layer-switch button').forEach(b => b.classList.toggle('on', b.dataset.layer === l));
  renderMap();
  $('#layer-hint').textContent =
    l === 'base' ? '基础图层 · 滚轮 / 双指缩放 · 拖动平移 · 点击场地 / 商店查看详情'
    : l === 'heat' ? '实时热力 · 人群密度实时模拟，每 8 秒更新'
    : '演出图层 · 每个场地显示最近一场演出的倒计时';
}

/* ================= 商店列表页 ================= */
function renderShopList() {
  const wrap = $('#shop-list');
  wrap.innerHTML = '';
  for (const sid in D.shops) {
    const s = D.shops[sid];
    const l = shopLive(sid);
    const item = document.createElement('div');
    item.className = 'shop-item';
    item.innerHTML =
      `<div class="si-glyph">${s.glyph}</div>` +
      `<div class="si-info"><div class="si-name">${s.name}</div>` +
      `<div class="si-meta">${s.type} · ${esc(s.addr)}</div>` +
      `<div class="vc-meta"><span class="vc-rate">★ ${avgFor('shop', sid, s.ratingBase).toFixed(1)}</span>` +
      `<span class="si-status ${l.busy ? 'busy' : 'ok'}">${l.status}</span></div></div>` +
      `<span class="vc-arrow">›</span>`;
    item.addEventListener('click', () => openShop(sid));
    wrap.appendChild(item);
  }
}

/* ================= 二级界面：场地详情 ================= */
function buildSchedule(v) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return v.seeds.map((s, i) => {
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
const hm = d => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
const isPast = (p, now) => p.time.getTime() + parseInt(p.dur) * 60000 < now.getTime();
const fmtDur = ms => {
  const s = Math.floor(ms / 1000), h = Math.floor(s / 3600);
  const m = String(Math.floor((s % 3600) / 60)).padStart(2, '0'), ss = String(s % 60).padStart(2, '0');
  return h > 0 ? `${h}:${m}:${ss}` : `${m}:${ss}`;
};

function openVenue(id) {
  currentVenue = id;
  const v = D.venues.find(x => x.id === id);
  $('#venue-title').textContent = v.name;
  $('#venue-glyph').textContent = v.glyph;
  $('#venue-name').textContent = v.name;
  $('#venue-addr').textContent = v.addr;
  $('#venue-intro').textContent = v.intro;
  updateVenueHero(v);
  renderPerfList(v);
  renderStatus(v);
  renderNearby(v);
  $('#screen-venue').hidden = false;
}
function updateVenueHero(v) {
  const ov = venueOverall(v);
  const n = v.ratingBase.n + userCount('perf', v);
  $('#venue-rate').textContent = `★ ${ov.toFixed(1)}  ·  ${n} 人评分`;
}
function userCount(kind, v) {
  let c = 0;
  v.seeds.forEach((s, i) => { const e = ratings.perf[`${v.id}:${i}`]; if (e && e.my != null) c++; });
  return c;
}
function venueOverall(v) {
  let sum = v.ratingBase.avg * v.ratingBase.n, n = v.ratingBase.n;
  v.seeds.forEach((s, i) => {
    const e = ratings.perf[`${v.id}:${i}`];
    if (e && e.my != null) { sum += e.my; n++; }
  });
  return sum / n;
}

function perfBaseAvg(v, i) { return clamp(Math.round((v.ratingBase.avg - 0.25 + ((i % 3) * 0.15)) * 10) / 10, 3.8, 5); }
function perfBaseN(v, i) { return 8 + ((i * 7) % 15); }

function renderPerfList(v) {
  const wrap = $('#perf-list');
  wrap.innerHTML = '';
  const list = buildSchedule(v);
  const now = new Date();
  const firstFuture = list.findIndex(p => !isPast(p, now));
  list.forEach((p, i) => {
    const past = isPast(p, now);
    const isNext = i === firstFuture;
    const bought = ticketCount(v.id, i);
    const item = document.createElement('div');
    item.className = 'perf-item' + (isNext ? ' now' : '') + (past ? ' past' : '');
    item.innerHTML =
      `<div class="perf-time"><div class="pt-hm">${hm(p.time)}</div><div class="pt-day">${p.label}</div></div>` +
      `<div class="perf-main"><div class="perf-title">${esc(p.title)}</div>` +
      `<div class="perf-meta"><span>${esc(p.room)}</span><span>约 ${p.dur}</span></div></div>` +
      `<div class="perf-right"><div class="cd" data-venue="${v.id}" data-idx="${i}">–</div>` +
      (past ? `<span class="buy-btn off">已结束</span>` : `<span class="buy-btn" data-vid="${v.id}" data-idx="${i}">购票</span>`) +
      (bought ? `<span class="cd-bought">已购 ${bought} 张</span>` : '') +
      `</div>`;
    if (!past) {
      item.addEventListener('click', () => openTicket(v.id, i));
      const buyBtn = item.querySelector('.buy-btn');
      buyBtn.addEventListener('click', e => { e.stopPropagation(); openTicket(v.id, i); });
    }
    const rateBox = document.createElement('div');
    rateBox.className = 'perf-rate';
    bindRating(rateBox, 'perf', `${v.id}:${i}`, perfBaseAvg(v, i), perfBaseN(v, i), () => updateVenueHero(v));
    rateBox.addEventListener('click', e => e.stopPropagation());
    item.appendChild(rateBox);
    wrap.appendChild(item);
  });
  startCountdown(list);
}
function startCountdown(list) {
  currentCdList = list;
  tickCountdown();
}
function tickCountdown() {
  if (!currentVenue || !currentCdList) return;
  const now = new Date();
  currentCdList.forEach(p => {
    const el = $(`.cd[data-venue="${currentVenue}"][data-idx="${p.idx}"]`);
    if (!el) return;
    const start = p.time.getTime(), end = start + parseInt(p.dur) * 60000;
    if (now < start) { el.className = 'cd'; el.textContent = '距开演 ' + fmtDur(start - now); }
    else if (now < end) { el.className = 'cd live'; el.textContent = '进行中 ' + Math.floor((now - start) / 60000) + '′'; }
    else { el.className = 'cd over'; el.textContent = '已结束'; }
  });
}
function updateMapChips() {
  if (mapLayer !== 'show') return;
  const now = new Date();
  for (const v of D.venues) {
    const txt = document.querySelector(`#map .cd-chip[data-vid="${v.id}"] .cd-txt`);
    if (!txt) continue;
    const list = buildSchedule(v);
    const playing = list.find(p => { const s = p.time.getTime(), e = s + parseInt(p.dur) * 60000; return now >= s && now < e; });
    const next = list.find(p => !isPast(p, now));
    const chip = txt.parentElement;
    if (playing) { txt.textContent = '演出中 ' + Math.floor((now - playing.time.getTime()) / 60000) + '′'; chip.classList.add('live'); chip.classList.remove('over'); }
    else if (next) { txt.textContent = '距开演 ' + fmtDur(next.time.getTime() - now); chip.classList.remove('live', 'over'); }
    else { txt.textContent = '今日已结束'; chip.classList.add('over'); chip.classList.remove('live'); }
  }
}

function renderStatus(v) {
  const c = venueCrowd(v.id);
  const st = statusOf(c.level), col = levelColor(c.level);
  const trend = v.trend === '↑' ? '#C0703C' : v.trend === '↓' ? '#4E9A6B' : '#9AA49B';
  $('#status-card').innerHTML =
    `<div class="st-row1"><span class="density-label">人群密度</span>` +
    `<div class="density-bars">${[1, 2, 3, 4, 5].map(l => `<i style="background:${l <= c.level ? levelColor(l) : '#EDEFEA'}"></i>`).join('')}</div>` +
    `<span class="st-pct" style="color:${col}">${Math.round(c.pct)}%</span></div>` +
    `<div class="st-row2">` +
    `<div class="st-chip"><div class="k">人流状态</div><div class="v" style="color:${col}">${st}</div></div>` +
    `<div class="st-chip"><div class="k">预计通行时间</div><div class="v">${c.pass.toFixed(0)}<small> 分钟</small></div></div>` +
    `<div class="st-chip"><div class="k">人流趋势</div><div class="v" style="color:${trend}">${v.trend}</div></div>` +
    `</div>`;
}

function distLabel(ax, ay, bx, by) {
  return '约 ' + Math.round(Math.hypot(ax - bx, ay - by) * 2 / 10) * 10 + 'm';
}
function renderNearby(v) {
  const wrap = $('#nearby-shops');
  wrap.innerHTML = '';
  v.shops.forEach(sid => {
    const s = D.shops[sid];
    const l = shopLive(sid);
    const item = document.createElement('div');
    item.className = 'shop-item';
    item.innerHTML =
      `<div class="si-glyph">${s.glyph}</div>` +
      `<div class="si-info"><div class="si-name">${s.name}</div>` +
      `<div class="si-meta">${s.type} · ${distLabel(v.x, v.y, s.map.x, s.map.y)}</div></div>` +
      `<div class="si-right"><div class="si-rate">★ ${avgFor('shop', sid, s.ratingBase).toFixed(1)}</div>` +
      `<span class="si-status ${l.busy ? 'busy' : 'ok'}">${l.status}</span></div>`;
    item.addEventListener('click', () => openShop(sid));
    wrap.appendChild(item);
  });
}

/* ================= 商店弹窗 ================= */
function openShop(id) {
  currentShop = id;
  const s = D.shops[id];
  $('#shop-glyph').textContent = s.glyph;
  $('#shop-name').textContent = s.name;
  $('#shop-addr').textContent = s.addr;
  $('#shop-intro').textContent = s.intro;
  renderShopLive(id);
  renderShopOrderForm(id);
  minimapZoom = 1;
  minimapCx = calibX(s.map.x, s.map.y);
  minimapCy = calibY(s.map.x, s.map.y);
  miniRoute = null;
  $('#mini-route').hidden = true;
  renderMinimap(id);
  renderShopNearbyPerf(id);
  renderShopRating(id);
  $('#shop-modal').hidden = false;
}
function renderShopLive(id) {
  const l = shopLive(id);
  $('#live-grid').innerHTML =
    `<div class="live-cell"><div class="k">当前人数</div><div class="v">${l.crowd}<small> 人</small></div></div>` +
    `<div class="live-cell"><div class="k">排队订单</div><div class="v">${l.orders}<small> 单</small></div></div>` +
    `<div class="live-cell"><div class="k">预计等待</div><div class="v">${l.wait}<small> 分钟</small></div></div>` +
    `<div class="live-cell"><div class="k">营业状态</div><div class="v" style="font-size:12px;color:${l.busy ? '#C0703C' : '#4E9A6B'}">${l.status}</div></div>`;
}
let minimapZoom = 1;
let minimapCx = 0, minimapCy = 0;   // 迷你地图视口中心（瓦片/校准空间），支持拖动平移
let miniRoute = null;               // 导航路线 { start:{name,x,y}, d, path }（内容坐标）
const METRO_STATIONS = [
  { name: '常熟路地铁站', x: 110, y: 140 },
  { name: '陕西南路地铁站', x: 700, y: 139 }
];
function nearestStation(cx, cy) {
  let best = null, bd = Infinity;
  for (const st of METRO_STATIONS) {
    const d = Math.hypot(st.x - cx, st.y - cy);
    if (d < bd) { bd = d; best = st; }
  }
  return { st: best, d: bd };
}
function buildRoute(cx, cy) {
  const { st } = nearestStation(cx, cy);
  const mx = (st.x + cx) / 2 + (Math.random() - .5) * 30;
  const my = (st.y + cy) / 2 + (Math.random() - .5) * 24;
  const path = `M ${st.x} ${st.y} L ${mx} ${st.y} L ${mx} ${cy} L ${cx} ${cy}`;
  const len = (Math.abs(mx - st.x) + Math.abs(cy - my) + Math.abs(cx - mx)) * 1.5;   // 单位≈1.5m
  return { start: st, path, d: Math.round(len), mins: Math.max(1, Math.round(len / 80)) };
}
function toggleMiniRoute() {
  if (!currentShop) return;
  const bar = $('#mini-route');
  if (miniRoute) {
    miniRoute = null;
    bar.hidden = true;
    renderMinimap(currentShop);
    return;
  }
  const s = D.shops[currentShop];
  miniRoute = buildRoute(s.map.x, s.map.y);
  $('#mr-start').textContent = miniRoute.start.name;
  $('#mr-end').textContent = s.name;
  $('#mr-meta').textContent = `${miniRoute.d} 米 · 步行约 ${miniRoute.mins} 分钟`;
  bar.hidden = false;
  minimapZoom = 1;
  minimapCx = (calibX(miniRoute.start.x, miniRoute.start.y) + calibX(s.map.x, s.map.y)) / 2;
  minimapCy = (calibY(miniRoute.start.x, miniRoute.start.y) + calibY(s.map.x, s.map.y)) / 2;
  renderMinimap(currentShop);
}
$('#btn-mini-nav').addEventListener('click', toggleMiniRoute);
$('#btn-route-go').addEventListener('click', () => toast('模拟导航中 · 沿绿色路线步行前往'));
function calibX(x, y) {
  const r = (calib && calib.rot || 0) * Math.PI / 180, c = Math.cos(r), s = Math.sin(r);
  return (calib && calib.ox || 0) + (calib && calib.sx || 1) * (x * c - y * s);
}
function calibY(x, y) {
  const r = (calib && calib.rot || 0) * Math.PI / 180, c = Math.cos(r), s = Math.sin(r);
  return (calib && calib.oy || 0) + (calib && calib.sy || 1) * (x * s + y * c);
}
function renderMinimap(id) {
  const s = D.shops[id];
  const svg = $('#shop-minimap');
  svg.innerHTML = '';
  const real = !!(calib && calib.style !== 'hand');
  svg.removeAttribute('data-style');
  if (real) svg.setAttribute('data-style', calib.style);
  const cx = s.map.x, cy = s.map.y;
  if (!real) {
    /* 手绘模式：保留示意图街区底图 */
    svg.setAttribute('viewBox', [cx - 150, cy - 85, 300, 170].join(' '));
    svgEl('rect', { x: cx - 150, y: cy - 85, width: 300, height: 170, fill: '#FBFCF9' }, svg);
    for (const b of D.blocks) svgEl('polygon', { points: b.points, fill: blockFill(b.id), opacity: .55 }, svg);
    for (const st of D.streets) {
      svgEl('path', { d: st.d, class: 'street-edge' }, svg);
      svgEl('path', { d: st.d, class: 'street' }, svg);
    }
    for (const v of D.venues) {
      if (Math.abs(v.x - cx) < 120 && Math.abs(v.y - cy) < 75) {
        const g = svgEl('g', { transform: `translate(${v.x},${v.y})` }, svg);
        svgEl('circle', { r: 7, fill: '#fff', stroke: '#5E9C80', 'stroke-width': 1.5 }, g);
        svgEl('text', { y: 2.5, 'font-size': 8, fill: '#4F8F71', 'text-anchor': 'middle', 'dominant-baseline': 'central', 'font-weight': 700 }, g).textContent = v.glyph;
      }
    }
    const pin = svgEl('g', { transform: `translate(${cx},${cy})` }, svg);
    svgEl('circle', { r: 20, fill: '#5E9C80', opacity: .16 }, pin);
    svgEl('circle', { r: 10, fill: '#5E9C80', stroke: '#fff', 'stroke-width': 2.5 }, pin);
    svgEl('text', { y: 3, 'font-size': 11, fill: '#fff', 'text-anchor': 'middle', 'dominant-baseline': 'central', 'font-weight': 800 }, pin).textContent = s.glyph;
    drawMiniRoute(svg, svg);
    return;
  }
  /* 写实模式：卫星瓦片底图（与主地图同一套坐标映射），店铺定位用校准变换对齐 */
  const fitW = miniRoute ? Math.max(300, Math.abs(calibX(miniRoute.start.x, miniRoute.start.y) - minimapCx) * 2 + 110) : 300;
  const fitH = miniRoute ? Math.max(170, Math.abs(calibY(miniRoute.start.x, miniRoute.start.y) - minimapCy) * 2 + 90) : 170;
  const z = clamp(Math.round(Math.log2(TILE_UNITS * 343 / ((fitW / minimapZoom) * 130))), 14, 19);
  const pxc = minimapCx, pyc = minimapCy;
  const w = fitW / minimapZoom, h = fitH / minimapZoom;
  const vx = pxc - w / 2, vy = pyc - h / 2;
  svg.setAttribute('viewBox', [vx, vy, w, h].join(' '));
  const N = 2 ** z;
  const [fx1, fy1] = wmFrac(lngOf(vx), latOf(vy));
  const [fx2, fy2] = wmFrac(lngOf(vx + w), latOf(vy + h));
  const tx1 = Math.floor(fx1 * N), tx2 = Math.floor(fx2 * N);
  const ty1 = Math.floor(fy1 * N), ty2 = Math.floor(fy2 * N);
  if ((tx2 - tx1 + 1) * (ty2 - ty1 + 1) <= 42) {
    for (let ty = ty1; ty <= ty2; ty++) for (let tx = tx1; tx <= tx2; tx++) {
      const lngA = tx / N * 360 - 180, lngB = (tx + 1) / N * 360 - 180;
      const latT = wmLatInv(ty / N), latB = wmLatInv((ty + 1) / N);
      const x1 = (lngA - GEO.c1) / GEO.s1, x2 = (lngB - GEO.c1) / GEO.s1;
      const y1 = (latT - GEO.c2) / GEO.s2, y2 = (latB - GEO.c2) / GEO.s2;
      const img = svgEl('image', {
        x: Math.min(x1, x2), y: Math.min(y1, y2),
        width: Math.abs(x2 - x1), height: Math.abs(y2 - y1),
        preserveAspectRatio: 'none', opacity: .96, 'pointer-events': 'none'
      }, svg);
      img.setAttribute('href', tileUrl(tx, ty, z));
    }
  }
  /* 内容层：与主地图一致的校准变换，店铺定位 / 周边场地准确落在卫星上 */
  const C = svgEl('g', { transform: contentTransform() }, svg);
  for (const v of D.venues) {
    if (Math.abs(v.x - cx) < 120 / minimapZoom && Math.abs(v.y - cy) < 75 / minimapZoom) {
      const g = svgEl('g', { transform: `translate(${v.x},${v.y})` }, C);
      svgEl('circle', { r: 7, fill: '#fff', stroke: '#5E9C80', 'stroke-width': 1.5 }, g);
      svgEl('text', { y: 2.5, 'font-size': 8, fill: '#4F8F71', 'text-anchor': 'middle', 'dominant-baseline': 'central', 'font-weight': 700 }, g).textContent = v.glyph;
    }
  }
  const pin = svgEl('g', { transform: `translate(${cx},${cy})` }, C);
  svgEl('circle', { r: 20, fill: '#5E9C80', opacity: .18 }, pin);
  svgEl('circle', { r: 10, fill: '#5E9C80', stroke: '#fff', 'stroke-width': 2.5 }, pin);
  svgEl('text', { y: 3, 'font-size': 11, fill: '#fff', 'text-anchor': 'middle', 'dominant-baseline': 'central', 'font-weight': 800 }, pin).textContent = s.glyph;
  drawMiniRoute(svg, C);
}
function drawMiniRoute(svg, parent) {
  if (!miniRoute) return;
  const R = parent || svg;
  const st = miniRoute.start;
  svgEl('path', { d: miniRoute.path, class: 'route-casing' }, R);
  svgEl('path', { d: miniRoute.path, class: 'route-line' }, R);
  const g0 = svgEl('g', { transform: `translate(${st.x},${st.y})` }, R);
  svgEl('circle', { r: 9, fill: '#4A90D9', stroke: '#fff', 'stroke-width': 2.5 }, g0);
  svgEl('circle', { r: 3.5, fill: '#fff' }, g0);
  svgEl('text', { y: -15, 'font-size': 9, fill: '#fff', 'text-anchor': 'middle', 'font-weight': 700, 'paint-order': 'stroke', stroke: 'rgba(47,63,53,.75)', 'stroke-width': 3.5 }, g0).textContent = '我的位置';
}
function setMiniZoom(d) {
  minimapZoom = clamp(minimapZoom + d, 1, 3);
  if (currentShop) renderMinimap(currentShop);
}
$('#mini-zoom-in').addEventListener('click', () => setMiniZoom(0.5));
$('#mini-zoom-out').addEventListener('click', () => setMiniZoom(-0.5));
/* 迷你地图拖动平移：拖动中只更新 viewBox，松手后补渲染瓦片 */
let miniDragging = false, miniDragStart = null;
const miniSvgEl = $('#shop-minimap');
miniSvgEl.addEventListener('pointerdown', e => {
  miniDragging = true;
  miniDragStart = { x: e.clientX, y: e.clientY };
  miniSvgEl.classList.add('dragging');
  try { miniSvgEl.setPointerCapture(e.pointerId); } catch (err) {}
});
miniSvgEl.addEventListener('pointermove', e => {
  if (!miniDragging || !miniDragStart) return;
  const rect = miniSvgEl.getBoundingClientRect();
  const vb = miniSvgEl.viewBox.baseVal;
  const ux = vb.width / rect.width, uy = vb.height / rect.height;
  const base = { x: calibX(D.shops[currentShop].map.x, D.shops[currentShop].map.y), y: calibY(D.shops[currentShop].map.x, D.shops[currentShop].map.y) };
  minimapCx = clamp(minimapCx - (e.clientX - miniDragStart.x) * ux, base.x - 260, base.x + 260);
  minimapCy = clamp(minimapCy - (e.clientY - miniDragStart.y) * uy, base.y - 240, base.y + 240);
  miniDragStart = { x: e.clientX, y: e.clientY };
  miniSvgEl.setAttribute('viewBox', `${minimapCx - vb.width / 2} ${minimapCy - vb.height / 2} ${vb.width} ${vb.height}`);
});
const endMiniDrag = () => {
  if (!miniDragging) return;
  miniDragging = false;
  miniDragStart = null;
  miniSvgEl.classList.remove('dragging');
  if (currentShop) renderMinimap(currentShop);
};
miniSvgEl.addEventListener('pointerup', endMiniDrag);
miniSvgEl.addEventListener('pointercancel', endMiniDrag);
function renderShopNearbyPerf(id) {
  const wrap = $('#shop-nearby-perf');
  const now = new Date();
  const s = D.shops[id];
  const ranked = D.venues
    .map(v => ({ v, d: Math.hypot(v.x - s.map.x, v.y - s.map.y) }))
    .sort((a, b) => a.d - b.d);
  const near = ranked.filter(x => x.d <= 300);
  const rows = (near.length >= 2 ? near : ranked.slice(0, 3)).slice(0, 4);
  wrap.innerHTML = '';
  let shown = 0;
  rows.forEach(({ v, d }) => {
    const next = buildSchedule(v).find(p => !isPast(p, now));
    if (!next) return;
    const mins = Math.max(1, Math.round(d * 1.5 / 80));
    const item = document.createElement('div');
    item.className = 'perf-item';
    item.innerHTML =
      `<div class="perf-time"><div class="pt-hm">${hm(next.time)}</div><div class="pt-day">${next.label}</div></div>` +
      `<div class="perf-main"><div class="perf-title">${esc(next.title)}</div>` +
      `<div class="perf-meta"><span>${esc(v.name)}</span><span>${esc(next.room)}</span><span>步行约${mins}分钟</span></div></div>` +
      `<div class="perf-right" style="color:#7FB69A;font-weight:700;font-size:16px">›</div>`;
    item.addEventListener('click', () => {
      $('#shop-modal').hidden = true;
      openVenue(v.id);
    });
    wrap.appendChild(item);
    shown++;
  });
  if (!shown) wrap.innerHTML = '<div class="footer-note">附近暂无演出安排，晚些再来看看</div>';
}
function renderShopRating(id) {
  const s = D.shops[id];
  const box = $('#shop-rating');
  box.innerHTML = '';
  bindRating(box, 'shop', id, s.ratingBase.avg, s.ratingBase.n, () => {});
  renderShopReviews(id);
}
function renderShopReviews(id) {
  const s = D.shops[id];
  const mine = (ratings.shop[id] && ratings.shop[id].comments) || [];
  const wrap = $('#shop-reviews');
  if (!mine.length && !s.reviews.length) { wrap.innerHTML = '<div class="footer-note">还没有评价，来写第一条吧</div>'; return; }
  wrap.innerHTML = [...mine, ...s.reviews].map(r =>
    `<div class="rev-item${r.user === '我' ? ' rev-me' : ''}">` +
    `<div class="rev-head"><span class="rev-user">${esc(r.user)}</span>` +
    `<span class="rev-stars">${'★'.repeat(Math.round(r.stars))}${'☆'.repeat(5 - Math.round(r.stars))}</span></div>` +
    `<div class="rev-text">${esc(r.text)}${r.time ? `<br><small style="color:#B0B9B0">${esc(r.time)}</small>` : ''}</div></div>`
  ).join('');
}

/* ================= 购票付款 ================= */
const LS_TKT = 'fy_tickets_v1';
let tickets = loadJSON(LS_TKT, []);          // 演出票订单记录数组
if (!Array.isArray(tickets)) tickets = [];
let currentTicket = null;                    // { v, idx }
let ticketQty = {};                          // { tierIndex: 张数 }
let payMethod = 'wechat';
const ticketCount = (vid, idx) => tickets.filter(t => t.vid === vid && t.idx === idx).reduce((a, t) => a + t.qty, 0);
const ticketTotalQty = () => Object.values(ticketQty).reduce((a, b) => a + b, 0);
const ticketTotalPrice = v => v.prices.reduce((a, t, i) => a + (ticketQty[i] || 0) * t[1], 0);

const VENUE_ACCENT = {
  'sy-opera':       ['#8FA6D9', '#C9D6F0', '#5E74A8'],
  'sso-hall':       ['#7FA6C9', '#C3D8E8', '#4E7698'],
  'he-luting':      ['#8FB8C0', '#CBE2E6', '#5E8E96'],
  'blackstone':     ['#C9A97E', '#EADCC4', '#96764E'],
  'xiangyang-park': ['#9CC9A8', '#D4EBD9', '#6EA37F'],
  'pushkin':        ['#C9A3B8', '#EAD7E1', '#9A6E84'],
  'shangfang-plaza':['#A8C49B', '#DCE9D4', '#7C9E70']
};
const posterAccent = vid => VENUE_ACCENT[vid] || VENUE_ACCENT['xiangyang-park'];

/* 演出海报：纯 SVG 排版设计（无图片素材，小清新配色随场地变化） */
function posterSVG(v, p, idx) {
  const [c1, c2, c3] = posterAccent(v.id);
  const pMin = Math.min(...v.prices.map(t => t[1]));
  const when = p.label + ' ' + hm(p.time);
  return `<svg viewBox="0 0 340 190" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice">
<defs><linearGradient id="pg" x1="0" y1="0" x2="1" y2="1">
<stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient></defs>
<rect width="340" height="190" fill="url(#pg)"/>
<circle cx="300" cy="30" r="70" fill="#fff" opacity=".14"/>
<circle cx="38" cy="168" r="52" fill="#fff" opacity=".12"/>
<circle cx="252" cy="150" r="26" fill="#fff" opacity=".10"/>
<text x="296" y="86" font-size="52" fill="#fff" opacity=".22" text-anchor="middle" transform="rotate(18 296 86)">♪</text>
<text x="62" y="158" font-size="40" fill="#fff" opacity=".18" text-anchor="middle" transform="rotate(-12 62 158)">♫</text>
<g><circle cx="26" cy="30" r="15" fill="#fff" opacity=".95"/>
<text x="26" y="34.5" font-size="14" font-weight="800" fill="${c3}" text-anchor="middle">${v.glyph}</text>
<text x="48" y="34.5" font-size="11" font-weight="700" fill="#fff" letter-spacing="1">${esc(v.name)}</text></g>
<text x="314" y="29" font-size="8.5" fill="#fff" opacity=".85" text-anchor="end" letter-spacing="2">汾阳路音乐街区</text>
<text x="26" y="97" font-size="19" font-weight="800" fill="#2F3F35">${esc(p.title)}</text>
<text x="26" y="119" font-size="10" fill="#4A5A50" opacity=".92">${esc(v.name)} · ${esc(p.room)} · 约 ${p.dur}</text>
<text x="26" y="164" font-size="13.5" font-weight="800" fill="${c3}">${when}</text>
<g><rect x="246" y="140" width="76" height="28" rx="14" fill="#fff" opacity=".92"/>
<text x="284" y="158" font-size="11.5" font-weight="800" fill="${c3}" text-anchor="middle">¥${pMin} 起</text></g>
</svg>`;
}

function openTicket(vid, idx) {
  const v = D.venues.find(x => x.id === vid);
  currentTicket = { v, idx };
  ticketQty = {};
  v.prices.forEach((_, i) => { ticketQty[i] = 0; });
  payMethod = 'wechat';
  $('#ticket-title').textContent = '购票';
  const sch = buildSchedule(v)[idx];   // 完整场次信息（含 time/label）
  $('#ticket-poster').innerHTML = posterSVG(v, sch, idx);
  const p = v.seeds[idx];
  $('#ticket-meta').innerHTML =
    `<div class="tk-meta-item"><span class="k">时间</span><span class="v">${sch.label} ${hm(sch.time)}</span></div>` +
    `<div class="tk-meta-item"><span class="k">场地</span><span class="v">${esc(v.name)} · ${esc(p.room)}</span></div>` +
    `<div class="tk-meta-item"><span class="k">时长</span><span class="v">约 ${p.dur}</span></div>`;
  renderTiers(v);
  renderPayMethods();
  updateTicketTotal();
  $('#pay-success').hidden = true;
  $('#ticket-form').hidden = false;
  $('#screen-ticket').hidden = false;
}

function renderTiers(v) {
  const wrap = $('#ticket-tiers');
  wrap.innerHTML = '';
  v.prices.forEach(([name, price], i) => {
    const row = document.createElement('div');
    row.className = 'tk-tier';
    row.innerHTML =
      `<div class="tk-tier-info"><div class="tk-tier-name">${name}</div><div class="tk-tier-price">¥${price}</div></div>` +
      `<div class="stepper"><button class="st-btn" data-i="${i}" data-d="-1" type="button">−</button>` +
      `<span class="st-qty" id="qty-${i}">0</span>` +
      `<button class="st-btn" data-i="${i}" data-d="1" type="button">＋</button></div>`;
    wrap.appendChild(row);
  });
}

const PAY_METHODS = [['wechat', '微信支付', '💚'], ['alipay', '支付宝', '🔷'], ['apple', 'Apple Pay', '']];
function renderPayMethods() {
  $('#pay-methods').innerHTML = PAY_METHODS.map(([id, name, icon]) =>
    `<div class="pay-chip${id === payMethod ? ' on' : ''}" data-m="${id}"><span class="pm-icon">${icon}</span><span>${name}</span></div>`).join('');
}

function updateTicketTotal() {
  if (!currentTicket) return;
  const total = ticketTotalPrice(currentTicket.v);
  const q = ticketTotalQty();
  $('#ticket-total').textContent = '¥ ' + total;
  const btn = $('#btn-pay');
  btn.disabled = q === 0;
  btn.textContent = q === 0 ? '确认支付' : `确认支付 ¥${total}`;
}

function barcodeSVG(seed) {
  const w = 220, h = 44;
  let bars = '', x = 0, v = 0;
  for (const ch of seed) v = (v * 31 + ch.charCodeAt(0)) % 997;
  while (x < w) {
    const bw = 1 + (v % 3); v = (v * 7 + 3) % 997;
    if (v % 2) bars += `<rect x="${x}" y="0" width="${bw}" height="${h}" fill="#2F3F35"/>`;
    x += bw;
  }
  return `<svg viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">${bars}</svg>`;
}

function doPay() {
  if (!currentTicket || ticketTotalQty() === 0) return;
  const btn = $('#btn-pay');
  btn.disabled = true;
  btn.textContent = '处理中…';
  setTimeout(() => {
    const { v, idx } = currentTicket;
    const n = ticketTotalQty();
    const total = ticketTotalPrice(v);
    const sch = buildSchedule(v)[idx];
    const code = 'FY' + String(Math.floor(Math.random() * 1e8)).padStart(8, '0');
    tickets.push({
      id: 'TK' + Date.now(), kind: 'ticket',
      vid: v.id, idx, venue: v.name, title: v.seeds[idx].title,
      when: sch.time.toISOString(), dur: v.seeds[idx].dur,
      qty: n, total, code, status: 'waiting', createdAt: Date.now()
    });
    localStorage.setItem(LS_TKT, JSON.stringify(tickets));
    $('#ps-code').textContent = code.slice(0, 2) + ' ' + code.slice(2, 6) + ' ' + code.slice(6);
    $('#ps-barcode').innerHTML = barcodeSVG(code);
    $('#ticket-form').hidden = true;
    $('#pay-success').hidden = false;
    if (currentVenue) renderPerfList(D.venues.find(x => x.id === currentVenue));
  }, 700);
}

$('#ticket-tiers').addEventListener('click', e => {
  const btn = e.target.closest('.st-btn');
  if (!btn || !currentTicket) return;
  const i = +btn.dataset.i, d = +btn.dataset.d;
  ticketQty[i] = Math.max(0, Math.min(9, ticketQty[i] + d));
  $('#qty-' + i).textContent = ticketQty[i];
  updateTicketTotal();
});
$('#pay-methods').addEventListener('click', e => {
  const chip = e.target.closest('.pay-chip');
  if (!chip) return;
  payMethod = chip.dataset.m;
  renderPayMethods();
});
$('#btn-pay').addEventListener('click', doPay);
$('#btn-done').addEventListener('click', () => { $('#screen-ticket').hidden = true; });
$('#btn-tk-orders').addEventListener('click', () => {
  $('#screen-ticket').hidden = true;
  $('#screen-venue').hidden = true;    // 一并关闭场地详情覆盖层
  currentVenue = null; currentCdList = null;
  if (cdTimer) { clearInterval(cdTimer); cdTimer = null; }
  showScreen('profile');
});

/* ================= 商店预约 / 下单 ================= */
const LS_ORD = 'fy_orders_v1';
let shopOrders = loadJSON(LS_ORD, []);       // 商店订单记录数组
if (!Array.isArray(shopOrders)) shopOrders = [];
let shopQty = {};                            // { itemIndex: 数量 }
let shopSlot = 0;                            // 到店时段下标
const shopPrice = p => parseInt(String(p[1]).replace(/\D/g, '')) || 0;

function shopSlots() {
  const now = new Date();
  return [
    ['立即到店', now],
    ['30 分钟后', new Date(now.getTime() + 30 * 60000)],
    ['1 小时后', new Date(now.getTime() + 60 * 60000)],
    ['2 小时后', new Date(now.getTime() + 120 * 60000)]
  ];
}

function renderShopOrderForm(id) {
  const s = D.shops[id];
  shopQty = {};
  (s.prices || []).forEach((_, i) => { shopQty[i] = 0; });
  shopSlot = 0;
  const wrap = $('#so-items');
  wrap.innerHTML = '';
  (s.prices || []).forEach((p, i) => {
    const row = document.createElement('div');
    row.className = 'so-item';
    row.innerHTML =
      `<div class="so-item-info"><div class="so-item-name">${esc(p[0])}</div><div class="so-item-price">¥${shopPrice(p)}</div></div>` +
      `<div class="stepper"><button class="st-btn" data-i="${i}" data-d="-1" type="button">−</button>` +
      `<span class="st-qty" id="so-qty-${i}">0</span>` +
      `<button class="st-btn" data-i="${i}" data-d="1" type="button">＋</button></div>`;
    wrap.appendChild(row);
  });
  renderShopSlots();
  updateShopTotal();
  $('#shop-order-success').hidden = true;
  $('#shop-order-form').hidden = false;
}
function renderShopSlots() {
  $('#so-time').innerHTML = shopSlots().map((s, i) =>
    `<div class="so-slot${i === shopSlot ? ' on' : ''}" data-i="${i}">` +
    `<span class="ss-label">${s[0]}</span><span class="ss-time">${hm(s[1])}</span></div>`).join('');
}
const shopQtySum = () => Object.values(shopQty).reduce((a, b) => a + b, 0);
function updateShopTotal() {
  if (!currentShop) return;
  const s = D.shops[currentShop];
  const total = (s.prices || []).reduce((a, p, i) => a + (shopQty[i] || 0) * shopPrice(p), 0);
  const q = shopQtySum();
  $('#so-total').textContent = '¥ ' + total;
  const btn = $('#btn-shop-pay');
  btn.disabled = q === 0;
  btn.textContent = q === 0 ? '预约并支付' : `预约并支付 ¥${total}`;
}
function doShopPay() {
  if (!currentShop || shopQtySum() === 0) return;
  const btn = $('#btn-shop-pay');
  btn.disabled = true;
  btn.textContent = '处理中…';
  setTimeout(() => {
    const s = D.shops[currentShop];
    const items = (s.prices || []).map((p, i) => ({ name: p[0], price: shopPrice(p), qty: shopQty[i] })).filter(it => it.qty > 0);
    const total = items.reduce((a, it) => a + it.price * it.qty, 0);
    const slot = shopSlots()[shopSlot];
    const code = 'FY' + String(Math.floor(Math.random() * 1e8)).padStart(8, '0');
    shopOrders.push({
      id: 'SO' + Date.now(), kind: 'shop',
      shopId: currentShop, shopName: s.name, glyph: s.glyph,
      items, total, slot: slot[0], slotISO: slot[1].toISOString(), code,
      status: 'waiting', createdAt: Date.now()
    });
    localStorage.setItem(LS_ORD, JSON.stringify(shopOrders));
    $('#so-code').textContent = code.slice(0, 2) + ' ' + code.slice(2, 6) + ' ' + code.slice(6);
    $('#so-succ-sub').textContent = `${s.name} · ${slot[0]} ${hm(slot[1])}`;
    $('#so-note').textContent = '到店出示取件码，店员核对后取货';
    $('#shop-order-form').hidden = true;
    $('#shop-order-success').hidden = false;
    renderOrdersBadge();
  }, 700);
}
$('#so-items').addEventListener('click', e => {
  const btn = e.target.closest('.st-btn');
  if (!btn || !currentShop) return;
  const i = +btn.dataset.i, d = +btn.dataset.d;
  shopQty[i] = Math.max(0, Math.min(9, shopQty[i] + d));
  $('#so-qty-' + i).textContent = shopQty[i];
  updateShopTotal();
});
$('#so-time').addEventListener('click', e => {
  const chip = e.target.closest('.so-slot');
  if (!chip) return;
  shopSlot = +chip.dataset.i;
  renderShopSlots();
});
$('#btn-shop-pay').addEventListener('click', doShopPay);
$('#btn-so-orders').addEventListener('click', () => {
  $('#shop-modal').hidden = true;
  showScreen('profile');
});
$('#btn-so-done').addEventListener('click', () => { $('#shop-modal').hidden = true; });

/* ================= 订单中心 ================= */
const ticketOrderStatus = o => (Date.now() >= new Date(o.when).getTime() + parseInt(o.dur) * 60000) ? 'done' : 'waiting';
const shopOrderStatus = o => (Date.now() >= new Date(o.slotISO).getTime()) ? 'done' : 'waiting';
const fmtWhen = iso => {
  const d = new Date(iso), now = new Date();
  const label = d.toDateString() === now.toDateString() ? '今日'
    : d.toDateString() === new Date(now.getTime() + 86400000).toDateString() ? '明日'
    : `${d.getMonth() + 1}/${d.getDate()}`;
  return `${label} ${hm(d)}`;
};
function renderOrderCard(wrap, o) {
  const st = o.kind === 'ticket' ? ticketOrderStatus(o) : shopOrderStatus(o);
  const statusTxt = o.kind === 'ticket' ? (st === 'waiting' ? '待使用' : '已结束') : (st === 'waiting' ? '待使用' : '已完成');
  const item = document.createElement('div');
  item.className = 'order-card';
  item.innerHTML =
    `<div class="oc-glyph">${o.kind === 'ticket' ? '票' : (o.glyph || '购')}</div>` +
    `<div class="oc-info"><div class="oc-title">${esc(o.kind === 'ticket' ? o.title : o.shopName)}</div>` +
    `<div class="oc-meta">${esc(o.kind === 'ticket' ? `${o.venue} · ${fmtWhen(o.when)} · ${o.qty} 张` : `${o.slot} ${fmtWhen(o.slotISO)} · ${o.items.map(it => `${it.name}×${it.qty}`).join('、')}`)}</div>` +
    `<div class="oc-code">${esc(o.code)}</div></div>` +
    `<div class="oc-right"><div class="oc-total">¥${o.total}</div><span class="oc-status ${st}">${statusTxt}</span></div>`;
  item.addEventListener('click', () => openQr(o));
  wrap.appendChild(item);
}
function renderOrders() {
  const tWrap = $('#ticket-orders');
  tWrap.innerHTML = '';
  const tList = tickets.slice().reverse();
  $('#ticket-orders-count').textContent = tList.length ? `${tList.length} 笔` : '暂无';
  if (!tList.length) tWrap.innerHTML = '<div class="footer-note">还没有演出票，去「场地」页购票吧</div>';
  else tList.forEach(o => renderOrderCard(tWrap, o));

  const sWrap = $('#shop-orders');
  sWrap.innerHTML = '';
  const sList = shopOrders.slice().reverse();
  $('#shop-orders-count').textContent = sList.length ? `${sList.length} 笔` : '暂无';
  if (!sList.length) sWrap.innerHTML = '<div class="footer-note">还没有商店订单，去「商店」页预约吧</div>';
  else sList.forEach(o => renderOrderCard(sWrap, o));

  renderOrdersBadge();
}
function renderOrdersBadge() {
  const n = tickets.filter(o => ticketOrderStatus(o) === 'waiting').length
    + shopOrders.filter(o => shopOrderStatus(o) === 'waiting').length;
  const b = $('#orders-badge');
  b.hidden = n === 0;
  b.textContent = n > 99 ? '99+' : n;
}

/* ================= 订单二维码 ================= */
function openQr(o) {
  const isTicket = o.kind === 'ticket';
  const st = isTicket ? ticketOrderStatus(o) : shopOrderStatus(o);
  $('#qr-type').textContent = isTicket ? '演出票 · 兑换码' : '商店订单 · 取件码';
  $('#qr-title').textContent = isTicket ? o.title : o.shopName;
  $('#qr-meta').textContent = isTicket
    ? `${o.venue} · ${fmtWhen(o.when)} · ${o.qty} 张`
    : `${o.slot} ${fmtWhen(o.slotISO)} · ${o.items.map(it => `${it.name}×${it.qty}`).join('、')}`;
  $('#qr-code-text').textContent = o.code;
  const qr = qrcode(0, 'M');
  qr.addData(o.code.replace(/\s/g, ''));
  qr.make();
  $('#qr-canvas').innerHTML = qr.createSvgTag({ cellSize: 5, margin: 10 });
  $('#qr-note').textContent = isTicket
    ? (st === 'waiting' ? '演出前 30 分钟凭此码在入口处换取纸质票入场' : '本场演出已结束，此码已失效')
    : (st === 'waiting' ? '到店出示此码，店员扫码核对后取货' : '订单已完成，此码已失效');
  const statusEl = $('#qr-status');
  statusEl.textContent = isTicket ? (st === 'waiting' ? '待使用' : '已结束') : (st === 'waiting' ? '待使用' : '已完成');
  statusEl.className = 'qr-status ' + st;
  $('#qr-box').classList.toggle('off', st === 'done');
  $('#qr-modal').hidden = false;
}
$('#btn-qr-done').addEventListener('click', () => { $('#qr-modal').hidden = true; });

/* ================= 我的（个人信息 · 会员码） ================= */
const LS_MEMBER = 'fy_member_v1';
let member = loadJSON(LS_MEMBER, null);
if (!member) {
  member = { code: 'FY2026' + String(Math.floor(Math.random() * 9000) + 1000), level: 3, joined: '2024.09' };
  localStorage.setItem(LS_MEMBER, JSON.stringify(member));
}
const LS_PROF = 'fy_profile_v1';
let profile = loadJSON(LS_PROF, null);
if (!profile) {
  profile = { name: '徐杨义萌', ident: '同济大学 · 数字人文', bio: '音乐街区的常客，喜欢爵士与老上海旋律。', avatar: 0 };
  localStorage.setItem(LS_PROF, JSON.stringify(profile));
}
const AVATARS = [
  ['♪', 'linear-gradient(135deg,#7FB69A,#5E9C80)'],
  ['♫', 'linear-gradient(135deg,#8FA6D9,#5E74A8)'],
  ['♬', 'linear-gradient(135deg,#C9A97E,#96764E)'],
  ['🎻', 'linear-gradient(135deg,#C9A3B8,#9A6E84)'],
  ['🎹', 'linear-gradient(135deg,#8FB8C0,#5E8E96)'],
  ['🎷', 'linear-gradient(135deg,#A8C49B,#7C9E70)']
];
function renderProfile() {
  const av = AVATARS[profile.avatar] || AVATARS[0];
  $('#prof-avatar').textContent = av[0];
  $('#prof-avatar').style.background = av[1];
  $('#prof-name').innerHTML = `${esc(profile.name)} <span class="prof-badge">Lv.${member.level} · 汾阳乐迷</span>`;
  $('#prof-sub').textContent = `${profile.ident} · ${member.joined.split('.')[0]} 年加入`;
  $('#prof-bio').textContent = profile.bio;
  $('#prof-bio').hidden = !profile.bio;
  $('#member-code').textContent = member.code.slice(0, 2) + ' ' + member.code.slice(2, 6) + ' ' + member.code.slice(6);
  const qr = qrcode(0, 'M');
  qr.addData(member.code);
  qr.make();
  $('#member-qr').innerHTML = qr.createSvgTag({ cellSize: 4, margin: 8 });
  const tN = tickets.reduce((a, o) => a + o.qty, 0);
  const wN = tickets.filter(o => ticketOrderStatus(o) === 'waiting').length
    + shopOrders.filter(o => shopOrderStatus(o) === 'waiting').length;
  const rN = Object.values(ratings.perf).filter(e => e && e.my != null).length
    + Object.values(ratings.shop).filter(e => e && e.my != null).length;
  $('#stat-tickets').textContent = tN;
  $('#stat-orders').textContent = shopOrders.length;
  $('#stat-waiting').textContent = wN;
  $('#stat-ratings').textContent = rN;
}

/* ---------- 编辑资料 ---------- */
function openProfileEdit() {
  const av = AVATARS[profile.avatar] || AVATARS[0];
  $('#pe-avatar').textContent = av[0];
  $('#pe-avatar').style.background = av[1];
  $('#pe-name').value = profile.name;
  $('#pe-ident').value = profile.ident;
  $('#pe-bio').value = profile.bio || '';
  const wrap = $('#pe-avatars');
  wrap.innerHTML = '';
  AVATARS.forEach(([g, grad], i) => {
    const b = document.createElement('button');
    b.className = 'pe-avatar-opt' + (i === profile.avatar ? ' on' : '');
    b.style.background = grad;
    b.textContent = g;
    b.dataset.i = i;
    b.addEventListener('click', () => {
      profile.avatar = i;
      $$('#pe-avatars .pe-avatar-opt').forEach(x => x.classList.toggle('on', x === b));
      $('#pe-avatar').textContent = g;
      $('#pe-avatar').style.background = grad;
    });
    wrap.appendChild(b);
  });
  $('#screen-profile-edit').hidden = false;
}
function saveProfile() {
  profile.name = ($('#pe-name').value || '').trim() || '汾阳乐迷';
  profile.ident = ($('#pe-ident').value || '').trim() || '音乐街区居民';
  profile.bio = ($('#pe-bio').value || '').trim();
  localStorage.setItem(LS_PROF, JSON.stringify(profile));
  $('#screen-profile-edit').hidden = true;
  renderProfile();
  toast('资料已保存 ✓');
}
$('#btn-prof-edit').addEventListener('click', e => { e.stopPropagation(); openProfileEdit(); });
$('#prof-card').addEventListener('click', openProfileEdit);
$('#btn-pe-save').addEventListener('click', saveProfile);

/* ================= 首页：Manner 风格完整页 ================= */
const HOME_BANNERS = [
  { t: '汾阳路音乐街区 · 夏日音乐季', s: '演出 · 市集 · 工作坊，持续整个夏天', go: 'venues', grad: 'linear-gradient(135deg,#7FB69A,#5E9C80)', note: '♪♫♬' },
  { t: '本周演出精选', s: '《茶花女》· 贝多芬第九 · 黑石爵士夜', go: 'venues', grad: 'linear-gradient(135deg,#8FA6D9,#5E74A8)', note: '♬♪' },
  { t: '会员日 · 演出票 9.5 折', s: '汾阳乐迷专属权益，购票下单立享', go: 'profile', grad: 'linear-gradient(135deg,#C9A97E,#96764E)', note: '♫♬' }
];
let homeBannerIdx = 0;
function renderHome() {
  const wrap = $('#home-banner');
  if (!wrap.children.length) {
    wrap.innerHTML = HOME_BANNERS.map((b, i) =>
      `<div class="hb-slide${i === 0 ? ' on' : ''}" data-go="${b.go}" style="background:${b.grad}">` +
      `<span class="hb-note">${b.note}</span>` +
      `<div class="hb-t">${b.t}</div><div class="hb-s">${b.s}</div>` +
      `<span class="hb-cta">去看看 ›</span></div>`).join('');
    $('#home-dots').innerHTML = HOME_BANNERS.map((_, i) => `<i data-i="${i}"></i>`).join('');
    $$('#home-banner .hb-slide').forEach(s => s.addEventListener('click', () => showScreen(s.dataset.go)));
    $$('#home-dots i').forEach(d => d.addEventListener('click', () => showBanner(+d.dataset.i)));
  }
  renderHomeShows();
  renderHomeShops();
}
function showBanner(i) {
  homeBannerIdx = (i + HOME_BANNERS.length) % HOME_BANNERS.length;
  $$('#home-banner .hb-slide').forEach((s, k) => s.classList.toggle('on', k === homeBannerIdx));
  $$('#home-dots i').forEach((d, k) => d.classList.toggle('on', k === homeBannerIdx));
}
setInterval(() => showBanner(homeBannerIdx + 1), 4000);

function nextShows(n) {
  const now = new Date();
  const all = [];
  for (const v of D.venues) for (const p of buildSchedule(v)) {
    if (!isPast(p, now)) all.push({ v, p });
  }
  return all.sort((a, b) => a.p.time.getTime() - b.p.time.getTime()).slice(0, n);
}
function renderHomeShows() {
  const wrap = $('#home-shows');
  const shows = nextShows(3);
  wrap.innerHTML = '';
  if (!shows.length) { wrap.innerHTML = '<div class="footer-note">今日暂无演出安排，晚些再来看看</div>'; return; }
  shows.forEach(({ v, p }) => {
    const item = document.createElement('div');
    item.className = 'hs-card';
    item.innerHTML =
      `<div class="hs-time"><div class="hs-hm">${hm(p.time)}</div><div class="hs-day">${p.label}</div></div>` +
      `<div class="hs-main"><div class="hs-title">${esc(p.title)}</div>` +
      `<div class="hs-meta">${esc(v.name)} · ${esc(p.room)} · 约 ${p.dur}</div></div>` +
      `<div class="hs-cd" data-vid="${v.id}" data-idx="${p.idx}">–</div>`;
    item.addEventListener('click', () => openVenue(v.id));
    wrap.appendChild(item);
  });
  updateHomeShows();
}
function updateHomeShows() {
  const now = new Date();
  nextShows(3).forEach(({ v, p }) => {
    const el = document.querySelector(`.hs-cd[data-vid="${v.id}"][data-idx="${p.idx}"]`);
    if (!el) return;
    const start = p.time.getTime(), end = start + parseInt(p.dur) * 60000;
    el.textContent = now < start ? '距开演 ' + fmtDur(start - now) : now < end ? '演出中' : '';
  });
}
function renderHomeShops() {
  const wrap = $('#home-shops');
  wrap.innerHTML = '';
  const list = Object.entries(D.shops)
    .map(([id, s]) => ({ id, s, r: avgFor('shop', id, s.ratingBase) }))
    .sort((a, b) => b.r - a.r).slice(0, 6);
  list.forEach(({ id, s, r }) => {
    const item = document.createElement('div');
    item.className = 'hshop';
    item.innerHTML =
      `<div class="hshop-glyph">${s.glyph}</div>` +
      `<div class="hshop-name">${esc(s.name)}</div>` +
      `<div class="hshop-type">${esc(s.type)}</div>` +
      `<div class="hshop-rate">★ ${r.toFixed(1)}</div>`;
    item.addEventListener('click', () => openShop(id));
    wrap.appendChild(item);
  });
}

/* ================= 评分系统（0–5.0） ================= */
function avgFor(kind, key, base) {
  const e = ratings[kind][key];
  let sum = base.avg * base.n, n = base.n;
  if (e && e.my != null) { sum += e.my; n++; }
  return n > 0 ? sum / n : base.avg;
}
function starsHtml(v) {
  let html = '';
  for (let i = 1; i <= 5; i++) {
    let cls = '';
    if (v != null) cls = v >= i - 0.25 ? ' on' : (v >= i - 0.75 ? ' half' : '');
    html += `<i class="${cls}" data-i="${i}">★</i>`;
  }
  return html;
}
function bindRating(container, kind, key, baseAvg, baseN, onChange) {
  const base = { avg: baseAvg, n: baseN };
  const my = ratings[kind][key] ? ratings[kind][key].my : null;
  const mine = (ratings[kind][key] && ratings[kind][key].comments) || [];
  const totalN = base.n + (my != null ? 1 : 0);
  container.innerHTML =
    `<div class="rate-row"><span class="stars">${starsHtml(my)}</span>` +
    `<input type="range" class="rate-slider" min="0" max="5" step="0.1" value="${my == null ? 0 : my}">` +
    `<span class="rate-num">${my == null ? '未评分' : my.toFixed(1)}</span></div>` +
    `<div class="rate-avg">平均 <b>${avgFor(kind, key, base).toFixed(1)}</b> · ${totalN} 人评分</div>` +
    `<div class="rate-comment"><input placeholder="写一句评价（可选）…"><button>发表</button></div>` +
    (kind === 'perf' && mine.length ? `<div class="rate-avg" style="color:#5E9C80">我的评价：${esc(mine[mine.length - 1].text)}</div>` : '');
  const stars = container.querySelector('.stars');
  const slider = container.querySelector('.rate-slider');
  const num = container.querySelector('.rate-num');
  const apply = val => {
    val = clamp(Math.round(val * 10) / 10, 0, 5);
    const entry = ratings[kind][key] = ratings[kind][key] || {};
    entry.my = val;
    saveRatings();
    num.textContent = val.toFixed(1);
    stars.innerHTML = starsHtml(val);
    $$('i', stars).forEach(i => i.addEventListener('click', onStar));
    container.querySelector('.rate-avg').innerHTML =
      `平均 <b>${avgFor(kind, key, base).toFixed(1)}</b> · ${base.n + 1} 人评分`;
    toast('已评分 ' + val.toFixed(1) + ' 分');
    if (onChange) onChange();
  };
  const onStar = e => apply(parseFloat(e.currentTarget.dataset.i));
  $$('i', stars).forEach(i => i.addEventListener('click', onStar));
  slider.addEventListener('input', () => apply(parseFloat(slider.value)));
  /* 发表评价 */
  const btn = container.querySelector('.rate-comment button');
  const input = container.querySelector('.rate-comment input');
  btn.addEventListener('click', () => {
    const txt = input.value.trim();
    if (!txt) { toast('先写一句评价吧'); return; }
    const entry = ratings[kind][key] = ratings[kind][key] || {};
    entry.comments = entry.comments || [];
    entry.comments.push({ user: '我', stars: entry.my || 4, text: txt, time: new Date().toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }) });
    saveRatings();
    input.value = '';
    toast('评价已发布，实时生效');
    if (kind === 'shop') renderShopReviews(key);
    else bindRating(container, kind, key, baseAvg, baseN, onChange); // perf: 重绘行内我的评价
  });
}

/* ================= Toast ================= */
let toastTimer;
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.hidden = true; }, 1800);
}

/* ================= 街区影像墙（Pinterest 瀑布流） ================= */
const WALL_KEY = 'fy_wall_v1';
const WALL_SEED = [
  { img: 'images/wall/w01-concert-stage.jpg', type: 'venue', key: 'sso-hall', text: '上交的贝九，弦乐一进来整个人都起鸡皮疙瘩', author: '乐迷·小林', ago: 2 },
  { img: 'images/wall/w02-dj-lights.jpg', type: 'venue', key: 'shangfang-plaza', text: '周五晚上的广场演出，灯光和梧桐树影叠在一起', author: '街坊老王', ago: 5 },
  { img: 'images/wall/w03-concert-crowd.jpg', type: 'venue', key: 'sy-opera', text: '《茶花女》散场，人群迟迟不走', author: '上音学生·阿哲', ago: 9 },
  { img: 'images/wall/w04-singer.jpg', type: 'venue', key: 'he-luting', text: '声乐专场，唱功是真的顶', author: '乐迷·阿May', ago: 26 },
  { img: 'images/wall/w05-piano.jpg', type: 'shop', key: 'yinyue-book', text: '在音乐书店翻到绝版乐谱，店员说可以慢慢看', author: '旅人S', ago: 30 },
  { img: 'images/wall/w06-piano-keys.jpg', type: 'shop', key: 'zhiyin', text: '试琴试了半小时，老板也没催，汾阳路的老店就是这样', author: '琴童妈妈', ago: 50 },
  { img: 'images/wall/w07-vinyl.jpg', type: 'shop', key: 'xingfu', text: '黑石公寓里的幸福集荟，黑胶区一待就是一个下午', author: '乐迷·小林', ago: 53 },
  { img: 'images/wall/w08-cafe.jpg', type: 'shop', key: 'yongkang-cafe', text: '手冲配爵士，永康路的下午值得浪费', author: '咖啡客·Luna', ago: 72 },
  { img: 'images/wall/w09-cafe-interior.jpg', type: 'shop', key: 'nongtang-cafe', text: '弄堂深处的咖啡馆，安静到能听见磨豆声', author: '街坊老王', ago: 95 },
  { img: 'images/wall/w10-coffee.jpg', type: 'shop', key: 'huayuan-rest', text: '花园小馆的露台位，梧桐绿荫里吃午饭', author: '旅人S', ago: 120 },
  { img: 'images/wall/w11-interior.jpg', type: 'shop', key: 'dongping', text: '东平路的小酒馆，晚风正好', author: '阿哲', ago: 140 },
  { img: 'images/wall/w12-library.jpg', type: 'shop', key: 'xingfu', text: '书店的拱廊太好拍了，光影绝了', author: '摄影·Ken', ago: 168 },
  { img: 'images/wall/w13-books.jpg', type: 'shop', key: 'yinyue-book', text: '乐谱区，考研那阵子常来，老板都认识我了', author: '琴童妈妈', ago: 190 },
  { img: 'images/wall/w14-reading.jpg', type: 'venue', key: 'blackstone', text: '黑石公寓一层的书店区，历史感全在里面', author: '乐迷·阿May', ago: 210 },
  { img: 'images/wall/w15-building.jpg', type: 'venue', key: 'blackstone', text: '黑石公寓外立面，1924 年的老房子', author: '摄影·Ken', ago: 240 },
  { img: 'images/wall/w16-street.jpg', type: 'venue', key: 'pushkin', text: '普希金雕像前的街角，永远有人停下来', author: '街坊老王', ago: 280 }
];
let WALL_POSTS = [];

function wallName(type, key) {
  if (type === 'venue') { const v = D.venues.find(x => x.id === key); return v ? v.name : key; }
  const s = D.shops[key]; return s ? s.name : key;
}
function wallTime(agoH) { return agoH < 1 ? '刚刚' : agoH < 24 ? Math.floor(agoH) + ' 小时前' : Math.floor(agoH / 24) + ' 天前'; }
function wallLoad() {
  const saved = loadJSON(WALL_KEY, null);
  if (saved && saved.length) return saved;
  return WALL_SEED.map((p, i) => ({ id: 'seed' + i, img: p.img, type: p.type, key: p.key, text: p.text, author: p.author, ts: Date.now() - p.ago * 3600000 }));
}
function wallSave(posts) { localStorage.setItem(WALL_KEY, JSON.stringify(posts)); }
function renderWall() {
  const g = $('#wall-grid');
  g.innerHTML = WALL_POSTS.map(p => {
    const name = wallName(p.type, p.key);
    const tag = p.type === 'venue' ? '演出场地' : '商店';
    return `<div class="wall-card">
      <div class="wall-img-wrap"><img class="wall-img" src="${esc(p.img)}" alt="${esc(name)}" loading="lazy">
        <span class="wall-tag ${p.type === 'venue' ? 'vt' : 'st'}">${tag}</span></div>
      <div class="wall-body">
        <div class="wall-name">${esc(name)}</div>
        ${p.text ? `<div class="wall-text">${esc(p.text)}</div>` : ''}
        <div class="wall-foot"><span class="wall-author">♪ ${esc(p.author)}</span><span class="wall-time">${wallTime((Date.now() - p.ts) / 3600000)}</span></div>
      </div></div>`;
  }).join('');
}
function wallFillTargets() {
  const t = $('#wm-type').value;
  const opts = t === 'venue'
    ? D.venues.map(v => ({ key: v.id, name: v.name }))
    : Object.entries(D.shops).map(([k, s]) => ({ key: k, name: s.name }));
  $('#wm-target').innerHTML = opts.map(o => `<option value="${o.key}">${o.name}</option>`).join('');
}
function wallOpen() {
  wallFillTargets();
  $('#wm-file').value = '';
  $('#wm-text').value = '';
  $('#wm-preview').hidden = true;
  $('#wm-imgpick').hidden = false;
  $('#wall-modal').hidden = false;
}
function wallInit() {
  WALL_POSTS = wallLoad();
  renderWall();
  $('#btn-wall-pub').addEventListener('click', wallOpen);
  $('#wm-type').addEventListener('change', wallFillTargets);
  $('#wm-imgpick').addEventListener('click', () => $('#wm-file').click());
  $('#wm-preview').addEventListener('click', () => $('#wm-file').click());
  $('#wm-file').addEventListener('change', e => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    const rd = new FileReader();
    rd.onload = () => {
      $('#wm-preview').src = rd.result;
      $('#wm-preview').hidden = false;
      $('#wm-imgpick').hidden = true;
    };
    rd.readAsDataURL(f);
  });
  $('#wm-submit').addEventListener('click', () => {
    const img = $('#wm-preview').src;
    if (!img) { toast('请先选择一张照片'); return; }
    const prof = loadJSON('fy_profile_v1', null);
    const post = {
      id: 'u' + Date.now(), img, type: $('#wm-type').value, key: $('#wm-target').value,
      text: $('#wm-text').value.trim(), author: (prof && prof.name) || '汾阳乐迷', ts: Date.now()
    };
    WALL_POSTS.unshift(post);
    wallSave(WALL_POSTS);
    renderWall();
    $('#wall-modal').hidden = true;
    toast('已发布到影像墙 ✓');
  });
}

/* ================= 初始化 ================= */
function init() {
  renderMap();
  wallInit();
  if (editState && editState.view) Object.assign(view, editState.view);
  applyView();
  renderVenueCards();
  renderShopList();
  renderOrdersBadge();
  renderHome();
  $('#btn-enter').addEventListener('click', () => {
    const sp = $('#splash');
    sp.classList.add('hide');
    setTimeout(() => { sp.style.display = 'none'; }, 520);
  });
  $$('.he').forEach(b => b.addEventListener('click', () => showScreen(b.dataset.go)));
  $('#hh-search').addEventListener('click', () => toast('搜索功能演示中 · 敬请期待'));
  $('#zoom-in').addEventListener('click', () => zoomBy(0.8));
  $('#zoom-out').addEventListener('click', () => zoomBy(1.25));
  $('#zoom-reset').addEventListener('click', resetView);
  $$('.btn-edit').forEach(b => b.addEventListener('click', () => setEditMode(!editMode)));
  $$('#layer-switch button').forEach(b => b.addEventListener('click', () => setLayer(b.dataset.layer)));
  $$('#tabbar .tab').forEach(t => t.addEventListener('click', () => showScreen(t.dataset.tab)));
  $('#btn-export').addEventListener('click', exportJSON);
  $('#btn-reset').addEventListener('click', resetEdit);
  $$('[data-close]').forEach(b => b.addEventListener('click', () => {
    const id = b.getAttribute('data-close');
    if (id === 'screen-venue') { currentVenue = null; currentCdList = null; if (cdTimer) { clearInterval(cdTimer); cdTimer = null; } }
    if (id === 'shop-modal') currentShop = null;
    $('#' + id).hidden = true;
  }));
  document.addEventListener('click', e => { if (!e.target.closest('#palette')) closePalette(); });
}
document.addEventListener('DOMContentLoaded', init);
})();
