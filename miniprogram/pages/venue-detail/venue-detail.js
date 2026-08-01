const util = require('../../utils/util.js');
const FY = util.FY;

Page({
  data: { statusBarH: 20, venue: {}, perfs: [] },
  onLoad(options) {
    const info = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
    this.vid = options.id;
    const v = FY.venues.find(x => x.id === this.vid);
    this.v = v;
    this.setData({
      statusBarH: info.statusBarHeight || 20,
      street: util.STREET_MAP[this.vid] || ''
    });
    this.buildVenue();
    this.refreshPerfs();
    this.timer = setInterval(() => this.refreshPerfs(), 1000);
  },
  onUnload() { if (this.timer) { clearInterval(this.timer); this.timer = null; } },
  buildVenue() {
    const v = this.v;
    const lv = v.densityBase || 2;
    this.setData({
      venue: {
        glyph: v.glyph, name: v.name, addr: v.addr, intro: v.intro,
        rating: v.ratingBase.avg.toFixed(1), n: v.ratingBase.n,
        level: lv, pct: Math.round(lv * 16 + 12 + (Math.random() - .5) * 8),
        pass: v.passBase, trend: v.trend
      }
    });
  },
  refreshPerfs() {
    const now = new Date();
    const tickets = getApp().globalData.tickets;
    const list = util.buildSchedule(this.v, now);
    const firstFuture = list.findIndex(p => !util.isPast(p, now));
    const perfs = list.map((p, i) => {
      const past = util.isPast(p, now);
      const start = p.time.getTime(), end = start + parseInt(p.dur) * 60000;
      const t = now.getTime();
      return {
        idx: p.idx, title: p.title, room: p.room, dur: p.dur,
        hm: util.hm(p.time), label: p.label,
        past, next: i === firstFuture,
        state: past ? 'over' : t < start ? '' : 'live',
        cd: past ? '已结束' : t < start ? '距开演 ' + util.fmtDur(start - t) : '演出中',
        bought: util.ticketCount(tickets, this.vid, p.idx)
      };
    });
    this.setData({ perfs });
  },
  buy(e) {
    const idx = e.currentTarget.dataset.idx;
    const p = this.data.perfs[idx];
    if (p.past) return;
    wx.navigateTo({ url: `/pages/ticket/ticket?id=${this.vid}&idx=${idx}` });
  },
  goBack() { wx.navigateBack(); }
});
