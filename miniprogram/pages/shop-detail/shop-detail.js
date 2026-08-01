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
