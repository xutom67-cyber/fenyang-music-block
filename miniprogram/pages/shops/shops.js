const FY = require('../../utils/data.js');
const util = require('../../utils/util.js');

Page({
  data: { statusBarH: 20, shops: [] },
  onLoad() {
    const info = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
    this.setData({ statusBarH: info.statusBarHeight || 20 });
    this.build();
  },
  build() {
    const shops = Object.entries(FY.shops).map(([id, s]) => {
      const live = this.liveState(s);
      return {
        id, glyph: s.glyph, name: s.name, type: s.type, addr: s.addr,
        street: util.STREET_MAP[id] || '',
        rate: s.ratingBase.avg.toFixed(1),
        busy: live.busy, status: live.status
      };
    });
    this.setData({ shops });
  },
  liveState(s) {
    const busy = (s.ordersBase || 0) >= 4 || (s.crowdBase || 0) >= 15;
    return { busy, status: busy ? '排队中' : (s.ordersBase > 0 ? '出餐中' : s.status || '空闲') };
  },
  open(e) {
    wx.navigateTo({ url: '/pages/shop-detail/shop-detail?id=' + e.currentTarget.dataset.id });
  }
});
