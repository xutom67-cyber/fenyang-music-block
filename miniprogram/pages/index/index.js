const util = require('../../utils/util.js');
const FY = util.FY;

Page({
  data: {
    statusBarH: 20,
    layer: 'base',
    banners: [
      { t: '汾阳路音乐街区 · 夏日音乐季', s: '演出 · 市集 · 工作坊，持续整个夏天', go: 'venues', grad: 'linear-gradient(135deg,#7FB69A,#5E9C80)', note: '♪♫♬' },
      { t: '本周演出精选', s: '《茶花女》· 贝多芬第九 · 黑石爵士夜', go: 'venues', grad: 'linear-gradient(135deg,#8FA6D9,#5E74A8)', note: '♬♪' },
      { t: '会员日 · 演出票 9.5 折', s: '汾阳乐迷专属权益，购票下单立享', go: 'profile', grad: 'linear-gradient(135deg,#C9A97E,#96764E)', note: '♫♬' }
    ],
    bannerIdx: 0,
    shows: [],
    shops: []
  },
  onLoad() {
    const info = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
    this.setData({ statusBarH: info.statusBarHeight || 20 });
    this.buildShops();
  },
  onShow() { this.refreshShows(); },
  onUnload() { if (this.timer) { clearInterval(this.timer); this.timer = null; } },
  onHide() { if (this.timer) { clearInterval(this.timer); this.timer = null; } },
  refreshShows() {
    const now = new Date();
    const shows = util.nextShows(3, now).map(({ v, p }) => {
      const start = p.time.getTime(), end = start + parseInt(p.dur) * 60000;
      return {
        vid: v.id, title: p.title, room: p.room, venue: v.name,
        hm: util.hm(p.time), label: p.label,
        cd: now.getTime() < start ? '距开演 ' + util.fmtDur(start - now.getTime())
          : now.getTime() < end ? '演出中' : ''
      };
    });
    this.setData({ shows });
  },
  startTimer() {
    if (this.timer) clearInterval(this.timer);
    this.timer = setInterval(() => this.refreshShows(), 1000);
  },
  buildShops() {
    const list = Object.entries(FY.shops)
      .map(([id, s]) => ({ id, glyph: s.glyph, name: s.name, type: s.type, rate: s.ratingBase.avg.toFixed(1) }))
      .sort((a, b) => b.rate - a.rate).slice(0, 6);
    this.setData({ shops: list });
  },
  setLayer(e) {
    this.setData({ layer: e.currentTarget.dataset.l });
    if (this.data.layer === 'show') this.startTimer(); else if (this.timer) { clearInterval(this.timer); this.timer = null; }
  },
  onBanner(e) { this.setData({ bannerIdx: e.detail.current }); },
  goBanner(e) {
    const go = e.currentTarget.dataset.go;
    wx.switchTab({ url: '/pages/' + go + '/' + go });
  },
  onSearch() { wx.showToast({ title: '搜索功能演示中', icon: 'none' }); },
  goEntry(e) {
    wx.switchTab({ url: '/pages/' + e.currentTarget.dataset.go + '/' + e.currentTarget.dataset.go });
  },
  openShow(e) {
    const vid = e.currentTarget.dataset.vid;
    wx.navigateTo({ url: '/pages/venue-detail/venue-detail?id=' + vid });
  },
  openShop(e) {
    wx.navigateTo({ url: '/pages/shop-detail/shop-detail?id=' + e.currentTarget.dataset.id });
  },
  onMarkerTap(e) {
    const { type, id } = e.detail;
    if (type === 'venue') wx.navigateTo({ url: '/pages/venue-detail/venue-detail?id=' + id });
    else wx.navigateTo({ url: '/pages/shop-detail/shop-detail?id=' + id });
  }
});
