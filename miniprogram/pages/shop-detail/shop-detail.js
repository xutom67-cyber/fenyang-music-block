const FY = require('../../utils/data.js');
const util = require('../../utils/util.js');

Page({
  data: {
    statusBarH: 20, id: '', shop: {}, live: {}, items: [], slots: [], slotIdx: 0,
    total: 0, ordered: false, orderCode: '', orderSlot: '', routeOn: false, route: {}, nearby: [], showMap: false
  },
  onLoad(options) {
    const info = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
    this.id = options.id;
    this.shop = FY.shops[this.id];
    this.setData({ statusBarH: info.statusBarHeight || 20, id: this.id, street: util.STREET_MAP[this.id] || '' });
    this.buildShop();
    this.buildItems();
    this.buildSlots();
    this.buildNearby();
    this.loadReviews();
  },
  /* ===== 评价与互动 ===== */
  loadReviews() {
    const s = this.shop;
    this.ratings = util.load('fy_ratings_v1', { perf: {}, shop: {} });
    const entry = this.ratings.shop[this.id] || {};
    const myRate = entry.my || 0;
    const starsStr = st => '★'.repeat(Math.round(st)) + '☆'.repeat(5 - Math.round(st));
    const mine = (entry.comments || []).map(c => Object.assign({}, c, { starsStr: starsStr(c.stars) }));
    const seeds = (s.reviews || []).map(r => Object.assign({}, r, { starsStr: starsStr(r.stars) }));
    const base = s.ratingBase || { avg: 4.5, n: 10 };
    const n = base.n + (myRate ? 1 : 0);
    const avg = ((base.avg * base.n + myRate) / n).toFixed(1);
    this.setData({
      rate: myRate, avg: avg, n,
      reviews: [...mine, ...seeds],
      cmtInput: '', cmtPlaceholder: '写一句评价（可选）…', replyTo: ''
    });
  },
  tapStar(e) {
    const v = parseInt(e.currentTarget.dataset.i);
    this.ratings.shop[this.id] = this.ratings.shop[this.id] || {};
    this.ratings.shop[this.id].my = v;
    util.save('fy_ratings_v1', this.ratings);
    const s = this.shop;
    const base = s.ratingBase || { avg: 4.5, n: 10 };
    const n = base.n + 1;
    const avg = ((base.avg * base.n + v) / n).toFixed(1);
    this.setData({ rate: v, avg, n });
    wx.showToast({ title: '已评 ' + v + ' 分', icon: 'none' });
  },
  tapReview(e) {
    const to = e.currentTarget.dataset.author;
    this.setData({ replyTo: to, cmtPlaceholder: '回复 @' + to + '：' });
  },
  onCmtInput(e) { this.setData({ cmtInput: e.detail.value }); },
  addCmt() {
    const txt = (this.data.cmtInput || '').trim();
    if (!txt) { wx.showToast({ title: '先写一句评价吧', icon: 'none' }); return; }
    const entry = this.ratings.shop[this.id] = this.ratings.shop[this.id] || {};
    entry.comments = entry.comments || [];
    const c = { user: '我', stars: entry.my || 4, text: txt, replyTo: this.data.replyTo || '', time: new Date().toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }) };
    entry.comments.push(c);
    util.save('fy_ratings_v1', this.ratings);
    wx.showToast({ title: '评价已发布', icon: 'none' });
    const starsStr = st => '★'.repeat(Math.round(st)) + '☆'.repeat(5 - Math.round(st));
    const s = this.shop;
    const base = s.ratingBase || { avg: 4.5, n: 10 };
    const n = base.n + (entry.my ? 1 : 0);
    const avg = ((base.avg * base.n + (entry.my || 0)) / n).toFixed(1);
    this.setData({
      reviews: [...(entry.comments.map(c => Object.assign({}, c, { starsStr: starsStr(c.stars) }))), ...((s.reviews || []).map(r => Object.assign({}, r, { starsStr: starsStr(r.stars) })))],
      cmtInput: '', cmtPlaceholder: '写一句评价（可选）…', replyTo: '', rate: entry.my || 0, avg, n
    });
  },
  buildShop() {
    const s = this.shop;
    const busy = (s.ordersBase || 0) >= 4 || (s.crowdBase || 0) >= 15;
    this.setData({
      shop: { glyph: s.glyph, name: s.name, addr: s.addr, intro: s.intro },
      live: {
        crowd: s.crowdBase || 0, orders: s.ordersBase || 0, wait: s.waitBase || 0,
        status: busy ? '排队中' : (s.ordersBase > 0 ? '出餐中' : s.status || '空闲')
      }
    });
  },
  buildItems() {
    const items = (this.shop.prices || []).map(p => {
      const price = parseInt(String(p[1]).replace(/\D/g, '')) || 0;
      return { name: p[0], price, qty: 0 };
    });
    this.setData({ items });
  },
  buildSlots() {
    const now = new Date();
    const mk = (label, t) => ({ label, time: util.hm(t) });
    this.setData({
      slots: [mk('立即到店', now), mk('30 分钟后', new Date(now.getTime() + 30 * 60000)),
        mk('1 小时后', new Date(now.getTime() + 60 * 60000)), mk('2 小时后', new Date(now.getTime() + 120 * 60000))]
    });
  },
  buildNearby() {
    const s = this.shop, now = new Date();
    const ranked = FY.venues
      .map(v => ({ v, d: Math.hypot(v.x - s.map.x, v.y - s.map.y) }))
      .sort((a, b) => a.d - b.d);
    const near = ranked.filter(x => x.d <= 300);
    const rows = (near.length >= 2 ? near : ranked.slice(0, 3)).slice(0, 4);
    const nearby = [];
    for (const { v, d } of rows) {
      const next = util.buildSchedule(v, now).find(p => !util.isPast(p, now));
      if (!next) continue;
      nearby.push({
        vid: v.id, title: next.title, room: next.room, venue: v.name,
        hm: util.hm(next.time), label: next.label, mins: Math.max(1, Math.round(d * 1.5 / 80))
      });
    }
    this.setData({ nearby });
  },
  step(e) {
    const i = e.currentTarget.dataset.i, d = e.currentTarget.dataset.d;
    const items = this.data.items.slice();
    items[i].qty = util.clamp(items[i].qty + d, 0, 9);
    this.setData({ items, total: items.reduce((a, it) => a + it.qty * it.price, 0) });
  },
  pickSlot(e) { this.setData({ slotIdx: e.currentTarget.dataset.i }); },
  toggleMap() { this.setData({ showMap: !this.data.showMap }); },
  toggleRoute() {
    this.setData({ routeOn: !this.data.routeOn });
  },
  onRouteChange(e) {
    // 组件计算好路线后回传信息条数据（保证与地图上的折线一致）
    this.setData({ route: e.detail });
  },
  pay() {
    const total = this.data.total;
    if (total <= 0) return;
    wx.showLoading({ title: '支付处理中' });
    setTimeout(() => {
      wx.hideLoading();
      const g = getApp().globalData;
      const items = this.data.items.filter(it => it.qty > 0).map(it => ({ name: it.name, price: it.price, qty: it.qty }));
      const slot = this.data.slots[this.data.slotIdx];
      const slotDate = new Date(Date.now() + this.data.slotIdx * 30 * 60000);
      const code = 'FY' + String(Math.floor(Math.random() * 1e8)).padStart(8, '0');
      g.shopOrders.push({
        id: 'SO' + Date.now(), kind: 'shop', shopId: this.id, shopName: this.shop.name, glyph: this.shop.glyph,
        items, total, slot: slot.label, slotISO: slotDate.toISOString(), code, status: 'waiting', createdAt: Date.now()
      });
      util.save('fy_orders_v1', g.shopOrders);
      this.setData({ ordered: true, orderCode: code.slice(0, 2) + ' ' + code.slice(2, 6) + ' ' + code.slice(6), orderSlot: slot.label + ' ' + slot.time });
    }, 700);
  },
  viewOrders() { wx.switchTab({ url: '/pages/profile/profile' }); },
  openVenue(e) { wx.navigateTo({ url: '/pages/venue-detail/venue-detail?id=' + e.currentTarget.dataset.vid }); },
  goBack() { wx.navigateBack(); },
  noop() {}
});
