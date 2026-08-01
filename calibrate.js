/* ============================================================
   地图校准页 · calibrate.html
   确定地图的大小（缩放）/ 位置（偏移）/ 风格（手绘 / 卫星写实 / 街道写实）
   保存至 localStorage: fy_calib_v1，由小程序主页读取应用
   ============================================================ */
(function () {
'use strict';
const D = window.FY;
const $ = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));
const NS = 'http://www.w3.org/2000/svg';
const LS = 'fy_calib_v1';
const LS_EDIT = 'fy_editor_v1';
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

/* ---------- 地理仿射：SVG 坐标 ↔ 经纬度 ----------
   锚点：常熟路×淮海中路 (110,120) ↔ (121.4486, 31.2165)
         陕西南路×淮海中路 (700,139) ↔ (121.4580, 31.2163)
   假设轴对齐（lng 只随 x，lat 只随 y），用于把示意地图叠加到真实底图上 */
const GEO = { c1: 121.44685, s1: 1.59322e-5, c2: 31.21776, s2: -1.05263e-5 };
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

/* ---------- 状态 ---------- */
let calib = null;
try { calib = JSON.parse(localStorage.getItem(LS)); } catch (e) {}
calib = calib && calib.style ? calib : { style: 'sat', sx: 1, sy: 1.18, rot: 6, ox: 10, oy: 13, ref: false, refOp: 50 };
/* 旧版本兼容：scale → sx/sy */
if (calib.sx == null) { calib.sx = calib.scale || 1; calib.sy = calib.scale || 1; delete calib.scale; }

function svgEl(tag, attrs, parent) {
  const n = document.createElementNS(NS, tag);
  for (const k in attrs) n.setAttribute(k, attrs[k]);
  if (parent) parent.appendChild(n);
  return n;
}

/* ---------- 渲染 ---------- */
function render() {
  const svg = $('#map');
  svg.innerHTML = '';
  const T = `translate(${calib.ox},${calib.oy}) rotate(${calib.rot}) scale(${calib.sx},${calib.sy})`;
  const real = calib.style !== 'hand';

  /* 底图层（写实样式；卫星加小清新滤镜） */
  const TLayer = svgEl('g', { id: 'tile-layer' }, svg);
  if (real) TLayer.dataset.style = calib.style;
  if (real) {
    const Z = 16, N = 2 ** Z;
    const [fx1, fy1] = wmFrac(lngOf(0), latOf(0));
    const [fx2, fy2] = wmFrac(lngOf(760), latOf(880));
    const tx1 = Math.floor(fx1 * N), tx2 = Math.floor(fx2 * N);
    const ty1 = Math.floor(fy1 * N), ty2 = Math.floor(fy2 * N);
    for (let ty = ty1; ty <= ty2; ty++) for (let tx = tx1; tx <= tx2; tx++) {
      const lngA = tx / N * 360 - 180, lngB = (tx + 1) / N * 360 - 180;
      const latT = wmLatInv(ty / N), latB = wmLatInv((ty + 1) / N);
      const x1 = (lngA - GEO.c1) / GEO.s1, x2 = (lngB - GEO.c1) / GEO.s1;
      const y1 = (latT - GEO.c2) / GEO.s2, y2 = (latB - GEO.c2) / GEO.s2;
      const img = svgEl('image', {
        x: Math.min(x1, x2), y: Math.min(y1, y2),
        width: Math.abs(x2 - x1), height: Math.abs(y2 - y1),
        preserveAspectRatio: 'none', opacity: .96
      }, TLayer);
      img.setAttribute('href', tileUrl(tx, ty, Z));
    }
  } else if (calib.ref) {
    const img = svgEl('image', {
      x: 0, y: 0, width: 760, height: 880,
      preserveAspectRatio: 'none', opacity: calib.refOp / 100
    }, svg);
    img.setAttribute('href', 'images/reference-map.png');
  }

  /* 内容组：应用校准变换 */
  const C = svgEl('g', { transform: T }, svg);

  const defs = svgEl('defs', {}, C);
  const pat = svgEl('pattern', { id: 'bld', width: 46, height: 44, patternUnits: 'userSpaceOnUse' }, defs);
  svgEl('rect', { x: 3, y: 5, width: 36, height: 24, rx: 3, fill: '#FFFFFF', stroke: '#E6E8E0', 'stroke-width': 1.1, opacity: .88 }, pat);
  const tpat = svgEl('pattern', { id: 'treeP', width: 52, height: 52, patternUnits: 'userSpaceOnUse' }, defs);
  svgEl('circle', { cx: 12, cy: 14, r: 5.5, fill: '#BCD9B0', opacity: .9 }, tpat);
  svgEl('circle', { cx: 38, cy: 38, r: 4.5, fill: '#C9E2BE', opacity: .9 }, tpat);

  /* 街区 / 道路 / 普希金广场（仅手绘模式；写实模式由底图呈现） */
  if (!real) {
  for (const b of D.blocks) {
    svgEl('polygon', { points: b.points, fill: b.fill }, C);
    svgEl('polygon', { points: b.points, fill: b.park ? 'url(#treeP)' : 'url(#bld)' }, C);
  }
    for (const [x, y] of D.parkTrees) svgEl('circle', { cx: x, cy: y, r: 7, class: 'tree' }, C);
    svgEl('text', { x: 150, y: 66, class: 'park-name' }, C).textContent = '襄阳公园';
  }
  if (!real) {
  for (const s of D.streets) {
    svgEl('path', { d: s.d, class: 'street-edge' }, C);
    svgEl('path', { d: s.d, class: 'street' }, C);
    const t = svgEl('text', { class: 'street-label', 'text-anchor': 'middle', 'dominant-baseline': 'middle' }, C);
    t.textContent = s.name;
    if (s.rot) t.setAttribute('transform', `translate(${s.label[0]},${s.label[1]}) rotate(${s.rot})`);
    else { t.setAttribute('x', s.label[0]); t.setAttribute('y', s.label[1]); }
  }
  svgEl('circle', { cx: D.plaza.x, cy: D.plaza.y, r: D.plaza.r, fill: D.plaza.fill, stroke: '#BFD8C0', 'stroke-width': 2 }, C);
  svgEl('circle', { cx: D.plaza.x, cy: D.plaza.y, r: D.plaza.r - 10, fill: 'none', stroke: '#BFD8C0', 'stroke-width': 1, 'stroke-dasharray': '3 4' }, C);
  }

  /* 景点 */
  for (const sp of D.spots) {
    const g = svgEl('g', {}, C);
    svgEl('path', { d: `M ${sp.x} ${sp.y - 7} L ${sp.x + 7} ${sp.y} L ${sp.x} ${sp.y + 7} L ${sp.x - 7} ${sp.y} Z`, class: 'spot-dia' }, g);
    svgEl('text', { x: sp.x, y: sp.y + 20, class: 'spot-label' }, g).textContent = sp.name;
  }

  /* 音乐广场 */
  const mp = D.musicPlaza;
  svgEl('rect', { x: mp.x - mp.w / 2, y: mp.y - mp.h / 2, width: mp.w, height: mp.h, rx: mp.h / 2, fill: '#CBE3C7', stroke: '#A8CBA2', 'stroke-width': 1.5 }, C);
  mp.nodes.forEach(n => {
    const g = svgEl('g', { transform: `translate(${n.x},${n.y})` }, C);
    svgEl('circle', { r: 10, fill: '#7FB69A', stroke: '#fff', 'stroke-width': 2 }, g);
    svgEl('text', { y: 1, 'font-size': 10, fill: '#fff', 'text-anchor': 'middle', 'dominant-baseline': 'central', 'font-weight': 800 }, g).textContent = '♪';
  });

  /* 场地 */
  for (const v of D.venues) {
    const g = svgEl('g', { transform: `translate(${v.x},${v.y})` }, C);
    svgEl('circle', { r: 22, class: 'vm-ring', fill: '#7FB69A' }, g);
    svgEl('circle', { r: 15, class: 'vm-circle' }, g);
    svgEl('text', { class: 'vm-glyph', y: 0.5 }, g).textContent = v.glyph;
    svgEl('text', { class: 'vm-label', y: 29 }, g).textContent = v.name;
  }

  /* 商店 */
  for (const sid in D.shops) {
    const s = D.shops[sid];
    const g = svgEl('g', { transform: `translate(${s.map.x},${s.map.y})` }, C);
    svgEl('circle', { r: 8.5, fill: '#fff', stroke: '#C9A96A', 'stroke-width': 1.8 }, g);
    svgEl('text', { y: 1, 'font-size': 8.5, fill: '#A87B3C', 'text-anchor': 'middle', 'dominant-baseline': 'central', 'font-weight': 800 }, g).textContent = s.glyph;
  }

  /* 指北针 + 比例尺（固定，不随内容变换） */
  svgEl('text', { x: 706, y: 40, class: 'compass-n' }, svg).textContent = 'N';
  svgEl('text', { x: 706, y: 52, class: 'compass' }, svg).textContent = '↑';
}

/* ---------- 交互：拖动调位置 / 滚轮调大小 ---------- */
const mapSvg = $('#map');
let dragState = null;
mapSvg.addEventListener('pointerdown', e => {
  dragState = { x: e.clientX, y: e.clientY, ox: calib.ox, oy: calib.oy };
  try { mapSvg.setPointerCapture(e.pointerId); } catch (err) { /* 合成事件忽略 */ }
});
mapSvg.addEventListener('pointermove', e => {
  if (!dragState) return;
  const r = mapSvg.getBoundingClientRect();
  const k = 760 / r.width;
  calib.ox = clamp(dragState.ox + (e.clientX - dragState.x) * k, -200, 200);
  calib.oy = clamp(dragState.oy + (e.clientY - dragState.y) * k, -160, 160);
  syncUI(); render();
});
['pointerup', 'pointercancel'].forEach(ev => mapSvg.addEventListener(ev, () => { dragState = null; }));
mapSvg.addEventListener('wheel', e => {
  e.preventDefault();
  const r = mapSvg.getBoundingClientRect();
  const f = e.deltaY < 0 ? 1.06 : 1 / 1.06;
  const p = { x: (e.clientX - r.left) / r.width * 760, y: (e.clientY - r.top) / r.height * 880 };
  /* 光标下的内容点（考虑旋转与各向异性缩放） */
  const cr = -calib.rot * Math.PI / 180;
  const cosr = Math.cos(cr), sinr = Math.sin(cr);
  const qx = (p.x - calib.ox), qy = (p.y - calib.oy);
  const cx = (qx * cosr - qy * sinr) / calib.sx;
  const cy = (qx * sinr + qy * cosr) / calib.sy;
  const nsx = clamp(calib.sx * f, 0.55, 1.8), nsy = clamp(calib.sy * f, 0.55, 1.8);
  /* 新变换下保持内容点仍落在光标处 */
  const nqx = cx * nsx * cosr + cy * nsy * sinr;
  const nqy = -cx * nsx * sinr + cy * nsy * cosr;
  calib.ox = p.x - nqx;
  calib.oy = p.y - nqy;
  calib.sx = nsx; calib.sy = nsy;
  syncUI(); render();
}, { passive: false });

/* ---------- 控件 ---------- */
function syncUI() {
  $('#sx').value = Math.round(calib.sx * 100);
  $('#sx-val').textContent = Math.round(calib.sx * 100) + '%';
  $('#sy').value = Math.round(calib.sy * 100);
  $('#sy-val').textContent = Math.round(calib.sy * 100) + '%';
  $('#rot').value = Math.round(calib.rot * 2) / 2;
  $('#rot-val').textContent = (Math.round(calib.rot * 2) / 2) + '°';
  $('#ox').value = Math.round(calib.ox);
  $('#ox-val').textContent = Math.round(calib.ox);
  $('#oy').value = Math.round(calib.oy);
  $('#oy-val').textContent = Math.round(calib.oy);
  $('#ref-op').value = Math.round(calib.refOp);
  $('#refop-val').textContent = Math.round(calib.refOp) + '%';
  $('#ref-on').checked = !!calib.ref;
  $$('.style-card').forEach(c => c.classList.toggle('on', c.dataset.style === calib.style));
  const refUI = calib.style === 'hand';
  $('#ref-head').style.opacity = refUI ? 1 : .35;
  $('#ref-on').disabled = !refUI;
  $('#ref-op').disabled = !refUI;
  $('#stage-tip').textContent = calib.style === 'hand'
    ? '拖动 = 位置 · 滚轮 = 大小 · 旋转滑块 = 方向'
    : '拖动街区轮廓对齐真实道路 · 旋转 / 缩放微调方向与比例';
}

$('#sx').addEventListener('input', e => { calib.sx = clamp(+e.target.value / 100, 0.55, 1.8); syncUI(); render(); });
$('#sy').addEventListener('input', e => { calib.sy = clamp(+e.target.value / 100, 0.55, 1.8); syncUI(); render(); });
$('#rot').addEventListener('input', e => { calib.rot = +e.target.value; syncUI(); render(); });
$('#ox').addEventListener('input', e => { calib.ox = +e.target.value; syncUI(); render(); });
$('#oy').addEventListener('input', e => { calib.oy = +e.target.value; syncUI(); render(); });
$('#ref-on').addEventListener('change', e => { calib.ref = e.target.checked; render(); });
$('#ref-op').addEventListener('input', e => { calib.refOp = +e.target.value; syncUI(); render(); });
$$('.style-card').forEach(c => c.addEventListener('click', () => { calib.style = c.dataset.style; syncUI(); render(); }));

let toastTimer;
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg; t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.hidden = true; }, 2000);
}
$('#btn-save').addEventListener('click', () => {
  localStorage.setItem(LS, JSON.stringify(calib));
  /* 清除小程序旧视图记忆，让新校准结果生效 */
  try {
    const e = JSON.parse(localStorage.getItem(LS_EDIT));
    if (e) { delete e.view; localStorage.setItem(LS_EDIT, JSON.stringify(e)); }
  } catch (err) { /* 无旧配置则跳过 */ }
  toast('已保存并应用 ✓ 回到小程序主页查看');
});
$('#btn-reset').addEventListener('click', () => {
  calib = { style: 'sat', sx: 1, sy: 1.18, rot: 6, ox: 10, oy: 13, ref: false, refOp: 50 };
  syncUI(); render();
  toast('已恢复默认（卫星小清新 · 已验证对齐）');
});

syncUI();
render();
})();
