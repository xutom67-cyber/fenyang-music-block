const util = require('../../utils/util.js');
const FY = util.FY;
const ACCENT = {
  'sy-opera': ['#8FA6D9', '#C9D6F0', '#5E74A8'],
  'sso-hall': ['#7FA6C9', '#C3D8E8', '#4E7698'],
  'he-luting': ['#8FB8C0', '#CBE2E6', '#5E8E96'],
  'blackstone': ['#C9A97E', '#EADCC4', '#96764E'],
  'xiangyang-park': ['#9CC9A8', '#D4EBD9', '#6EA37F'],
  'pushkin': ['#C9A3B8', '#EAD7E1', '#9A6E84'],
  'shangfang-plaza': ['#A8C49B', '#DCE9D4', '#7C9E70']
};
const METHODS = [{ id: 'wechat', name: '微信支付' }, { id: 'alipay', name: '支付宝' }, { id: 'apple', name: 'Apple Pay' }];

Page({
  data: {
    statusBarH: 20, venue: {}, perf: {}, tiers: [], accent: ACCENT['xiangyang-park'],
    minPrice: 0, total: 0, payMethod: 'wechat', methods: METHODS, paid: false, code: '', barcodeTxt: ''
  },
  onLoad(options) {
    const info = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
    this.vid = options.id;
    this.idx = parseInt(options.idx || 0);
    this.v = FY.venues.find(x => x.id === this.vid);
    const sch = util.buildSchedule(this.v, new Date())[this.idx];
    const tiers = this.v.prices.map(([name, price], i) => ({ name, price, qty: 0 }));
    this.setData({
      statusBarH: info.statusBarHeight || 20,
      venue: { glyph: this.v.glyph, name: this.v.name },
      perf: { title: this.v.seeds[this.idx].title, room: sch.room, dur: sch.dur, label: sch.label, hm: util.hm(sch.time) },
      tiers,
      minPrice: Math.min(...this.v.prices.map(t => t[1])),
      accent: ACCENT[this.vid] || ACCENT['xiangyang-park']
    });
  },
  step(e) {
    const i = e.currentTarget.dataset.i, d = e.currentTarget.dataset.d;
    const tiers = this.data.tiers.slice();
    tiers[i].qty = util.clamp(tiers[i].qty + d, 0, 9);
    this.setData({ tiers, total: this.calcTotal(tiers) });
  },
  calcTotal(tiers) { return tiers.reduce((a, t) => a + t.qty * t.price, 0); },
  pickMethod(e) { this.setData({ payMethod: e.currentTarget.dataset.m }); },
  pay() {
    const total = this.data.total;
    if (total <= 0) return;
    wx.showLoading({ title: '支付处理中' });
    setTimeout(() => {
      wx.hideLoading();
      const g = getApp().globalData;
      const n = this.data.tiers.reduce((a, t) => a + t.qty, 0);
      const code = 'FY' + String(Math.floor(Math.random() * 1e8)).padStart(8, '0');
      g.tickets.push({
        id: 'TK' + Date.now(), kind: 'ticket',
        vid: this.vid, idx: this.idx, venue: this.v.name, title: this.v.seeds[this.idx].title,
        when: util.buildSchedule(this.v, new Date())[this.idx].time.toISOString(),
        dur: this.v.seeds[this.idx].dur, qty: n, total, code, status: 'waiting', createdAt: Date.now()
      });
      util.save('fy_tickets_v1', g.tickets);
      this.setData({
        paid: true,
        code: code.slice(0, 2) + ' ' + code.slice(2, 6) + ' ' + code.slice(6),
        barcodeTxt: code
      });
    }, 700);
  },
  viewOrders() {
    wx.switchTab({ url: '/pages/profile/profile' });
  },
  goBack() { wx.navigateBack(); }
});
