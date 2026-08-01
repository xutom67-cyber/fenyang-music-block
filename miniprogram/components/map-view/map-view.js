/* ==================== 原生地图组件：微信 <map>（正式版图源，无需域名白名单） ====================
   坐标：内容坐标 → 校准(calibX/Y) → 真实经纬度(GEO)，标记/路线与真实世界对齐 */
const util = require('../../utils/util.js');
const FY = util.FY;
const METRO = [
  { name: '常熟路地铁站', x: 110, y: 140 },
  { name: '陕西南路地铁站', x: 700, y: 139 }
];
const ICON_VENUE = '/images/markers/venue.png';
const ICON_SHOP = '/images/markers/shop.png';
const ICON_LOC = '/images/markers/loc.png';

function pt(x, y, calib) {
  return [util.lngOf(util.calibX(x, y, calib)), util.latOf(util.calibY(x, y, calib))];
}

Component({
  properties: {
    mode: { type: String, value: 'map' },       // 'map' 首页大图 | 'mini' 商店迷你图
    shopId: { type: String, value: '' },
    showRoute: { type: Boolean, value: false }, // mini 模式导航线
    layer: { type: String, value: 'base' }      // base | heat | show
  },
  data: {
    center: { lng: 121.4528, lat: 31.2115 },
    scale: 16,
    satellite: false,
    markers: [],
    polylines: [],
    circles: []
  },
  lifetimes: {
    attached() {
      this.calib = getApp().globalData.calib || util.DEFAULT_CALIB;
      this.layer = this.properties.layer || 'base';
      this.timer = null;
      this.route = null;
      const info = wx.getSystemInfoSync();
      // 卫星图：真机（iOS/Android）开启；开发者工具模拟器不渲染卫星图层，用普通底图
      this.setData({ satellite: info.platform === 'ios' || info.platform === 'android' });
    },
    ready() {
      this.initView();
      this.rebuild();
      if (this.layer === 'show') this.startTimer();
    },
    detached() { if (this.timer) { clearInterval(this.timer); this.timer = null; } }
  },
  observers: {
    'layer': function (l) {
      this.layer = l;
      if (l === 'show') this.startTimer();
      else if (this.timer) { clearInterval(this.timer); this.timer = null; }
      this.rebuild();
    },
    'showRoute': function (on) {
      if (!on) this.route = null;
      this.rebuild();
    }
  },
  methods: {
    initView() {
      const s = this.properties.shopId && FY.shops[this.properties.shopId];
      if (this.properties.mode === 'mini' && s) {
        const [lng, lat] = pt(s.map.x, s.map.y, this.calib);
        this.setData({ center: { lng, lat }, scale: 18 });
      } else {
        const [lng, lat] = pt(380, 440, this.calib);
        this.setData({ center: { lng, lat }, scale: 16 });
      }
    },
    rebuild() {
      const data = { markers: [], polylines: [], circles: [] };
      /* 场地标记（含演出图层倒计时 callout） */
      FY.venues.forEach((v, i) => {
        const [lng, lat] = pt(v.x, v.y, this.calib);
        const mk = {
          id: 100 + i, latitude: lat, longitude: lng,
          iconPath: ICON_VENUE, width: 34, height: 34,
          label: { content: v.name, color: '#2F3F35', fontSize: 11, bgColor: '#FFFFFF', borderRadius: 8, padding: 4, anchorX: -20, anchorY: 16 }
        };
        if (this.layer === 'show') {
          const p = util.buildSchedule(v, new Date()).find(q => !util.isPast(q, new Date()));
          if (p) {
            const now = Date.now(), start = p.time.getTime();
            const txt = now < start ? '距开演 ' + util.fmtDur(start - now) : '演出中';
            mk.callout = { content: txt, color: '#4F8F71', fontSize: 11, bgColor: '#FFFFFF', borderRadius: 8, padding: 5, display: 'ALWAYS' };
          }
        }
        data.markers.push(mk);
        /* 热力图层：以圆圈近似（原生地图无热力层） */
        if (this.layer === 'heat') {
          const lv = v.densityBase || 2;
          const c = lv <= 2 ? 'rgba(111,175,138,0.45)' : lv === 3 ? 'rgba(217,195,106,0.45)' : 'rgba(217,123,106,0.45)';
          data.circles.push({ latitude: lat, longitude: lng, radius: 45 + lv * 15, color: c, fillColor: c, strokeWidth: 0 });
        }
      });
      /* 商店标记 */
      Object.entries(FY.shops).forEach(([sid, s], i) => {
        const [lng, lat] = pt(s.map.x, s.map.y, this.calib);
        data.markers.push({
          id: 200 + i, latitude: lat, longitude: lng,
          iconPath: ICON_SHOP, width: 26, height: 26,
          label: { content: s.name, color: '#8A6A35', fontSize: 10, bgColor: '#FFFDF6', borderRadius: 8, padding: 3, anchorX: -15, anchorY: 13 }
        });
      });
      /* 导航路线（mini 模式）：起终点之间折线 + 起点标记 */
      if (this.properties.mode === 'mini' && this.properties.showRoute) {
        if (!this.route) {
          const s = FY.shops[this.properties.shopId];
          let best = null, bd = Infinity;
          for (const st of METRO) {
            const d = Math.hypot(st.x - s.map.x, st.y - s.map.y);
            if (d < bd) { bd = d; best = st; }
          }
          const mx = (best.x + s.map.x) / 2 + (Math.random() - .5) * 30;
          const my = (best.y + s.map.y) / 2 + (Math.random() - .5) * 24;
          const len = (Math.abs(mx - best.x) + Math.abs(my - best.y) + Math.abs(s.map.x - mx)) * 1.5;
          this.route = {
            start: best,
            pts: [[best.x, best.y], [mx, best.y], [mx, s.map.y], [s.map.x, s.map.y]],
            d: Math.round(len), mins: Math.max(1, Math.round(len / 80))
          };
          this.triggerEvent('routechange', { start: best.name, d: this.route.d, mins: this.route.mins });
        }
        data.polylines.push({
          points: this.route.pts.map(p => {
            const [lng, lat] = pt(p[0], p[1], this.calib);
            return { longitude: lng, latitude: lat };
          }),
          color: '#4A9E6E', width: 6, dottedLine: true, arrowLine: true
        });
        const [slng, slat] = pt(this.route.start.x, this.route.start.y, this.calib);
        data.markers.push({
          id: 300, latitude: slat, longitude: slng,
          iconPath: ICON_LOC, width: 26, height: 26,
          label: { content: '我的位置', color: '#2F6FD8', fontSize: 10, bgColor: '#FFFFFF', borderRadius: 8, padding: 3, anchorX: -13, anchorY: 13 }
        });
        /* 视野覆盖起终点 */
        const [elng, elat] = pt(FY.shops[this.properties.shopId].map.x, FY.shops[this.properties.shopId].map.y, this.calib);
        this.setData({ center: { lng: (slng + elng) / 2, lat: (slat + elat) / 2 }, scale: 17 });
      }
      this.setData(data);
    },
    startTimer() {
      if (this.timer) clearInterval(this.timer);
      this.timer = setInterval(() => { if (this.layer === 'show') this.rebuild(); }, 1000);
    },
    onMarkerTap(e) {
      const id = e.detail.markerId;
      if (id >= 300) return;
      if (id >= 200) {
        const key = Object.keys(FY.shops)[id - 200];
        this.triggerEvent('markertap', { type: 'shop', id: key });
      } else {
        this.triggerEvent('markertap', { type: 'venue', id: FY.venues[id - 100].id });
      }
    },
    zoomIn() { this.zoom(1); },
    zoomOut() { this.zoom(-1); },
    zoom(d) {
      const ctx = wx.createMapContext('mvMap', this);
      ctx.getScale({
        success: res => {
          const ns = Math.max(5, Math.min(20, res.scale + d));
          ctx.setScale({ scale: ns });
        },
        fail: () => {
          this.setData({ scale: Math.max(5, Math.min(20, this.data.scale + d)) });
        }
      });
    }
  }
});
