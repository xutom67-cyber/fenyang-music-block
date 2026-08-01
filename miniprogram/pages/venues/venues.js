const util = require('../../utils/util.js');
const FY = util.FY;

Page({
  data: { statusBarH: 20, venues: [] },
  onLoad() {
    const info = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
    this.setData({ statusBarH: info.statusBarHeight || 20 });
    this.build();
  },
  build() {
    const venues = FY.venues.map(v => {
      const lv = v.densityBase || 2;
      return {
        id: v.id, glyph: v.glyph, name: v.name, addr: v.addr,
        rating: v.ratingBase.avg.toFixed(1),
        street: util.STREET_MAP[v.id] || '',
        level: lv,
        status: lv <= 2 ? '畅通' : lv === 3 ? '较顺畅' : lv === 4 ? '拥挤' : '非常拥挤'
      };
    });
    this.setData({ venues });
  },
  open(e) {
    wx.navigateTo({ url: '/pages/venue-detail/venue-detail?id=' + e.currentTarget.dataset.id });
  }
});
