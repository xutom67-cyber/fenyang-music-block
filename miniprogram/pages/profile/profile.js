const util = require('../../utils/util.js');
const qrcode = require('../../utils/qrcode.js');
const AVATARS = [
  ['♪', 'linear-gradient(135deg,#7FB69A,#5E9C80)'],
  ['♫', 'linear-gradient(135deg,#8FA6D9,#5E74A8)'],
  ['♬', 'linear-gradient(135deg,#C9A97E,#96764E)'],
  ['🎻', 'linear-gradient(135deg,#C9A3B8,#9A6E84)'],
  ['🎹', 'linear-gradient(135deg,#8FB8C0,#5E8E96)'],
  ['🎷', 'linear-gradient(135deg,#A8C49B,#7C9E70)']
];

Page({
  data: {
    statusBarH: 20, profile: {}, member: {}, avatarGlyph: '♪', avatarGrad: AVATARS[0][1],
    statTickets: 0, statOrders: 0, statWaiting: 0, statRatings: 0,
    ticketOrders: [], shopOrders: [], ticketCount: 0, shopOrderCount: 0
  },
  onLoad() {
    const info = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
    this.setData({ statusBarH: info.statusBarHeight || 20 });
  },
  onShow() { this.render(); },
  render() {
    const g = getApp().globalData;
    const profile = g.profile, member = g.member;
    const av = AVATARS[profile.avatar] || AVATARS[0];
    const tN = g.tickets.reduce((a, o) => a + o.qty, 0);
    const wN = g.tickets.filter(o => util.ticketOrderStatus(o) === 'waiting').length
      + g.shopOrders.filter(o => util.shopOrderStatus(o) === 'waiting').length;
    const fmt = c => c.slice(0, 2) + ' ' + c.slice(2, 6) + ' ' + c.slice(6);
    const ticketOrders = g.tickets.slice().reverse().map(o => ({
      id: o.id, title: o.title, venue: o.venue, when: util.fmtWhen(o.when), qty: o.qty,
      code: fmt(o.code), total: o.total,
      statusCls: util.ticketOrderStatus(o), statusTxt: util.ticketOrderStatus(o) === 'waiting' ? '待使用' : '已结束'
    }));
    const shopOrders = g.shopOrders.slice().reverse().map(o => ({
      id: o.id, glyph: o.glyph, shopName: o.shopName, slot: o.slot, when: util.fmtWhen(o.slotISO),
      itemsTxt: o.items.map(it => `${it.name}×${it.qty}`).join('、'),
      code: fmt(o.code), total: o.total,
      statusCls: util.shopOrderStatus(o), statusTxt: util.shopOrderStatus(o) === 'waiting' ? '待使用' : '已完成'
    }));
    this.setData({
      profile,
      member: { level: member.level, code: fmt(member.code), joinedYear: (member.joined || '2024').split('.')[0] },
      avatarGlyph: av[0], avatarGrad: av[1],
      statTickets: tN, statOrders: g.shopOrders.length, statWaiting: wN, statRatings: util.ratingCount(),
      ticketOrders, shopOrders, ticketCount: ticketOrders.length, shopOrderCount: shopOrders.length
    });
    this.drawMemberQr(member.code);
  },
  drawMemberQr(code) {
    const query = this.createSelectorQuery();
    query.select('#memberQr').fields({ node: true, size: true }).exec(res => {
      if (!res || !res[0] || !res[0].node) return;
      const info = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
      const dpr = info.pixelRatio || 2;
      const canvas = res[0].node;
      canvas.width = res[0].width * dpr;
      canvas.height = res[0].height * dpr;
      const ctx = canvas.getContext('2d');
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, res[0].width, res[0].height);
      const qr = qrcode(0, 'M');
      qr.addData(code);
      qr.make();
      const n = qr.getModuleCount();
      const cell = res[0].width / (n + 4);
      const off = cell * 2;
      ctx.fillStyle = '#2F3F35';
      for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
        if (qr.isDark(r, c)) ctx.fillRect(off + c * cell, off + r * cell, cell + 0.5, cell + 0.5);
      }
    });
  },
  editProfile() { wx.navigateTo({ url: '/pages/profile-edit/profile-edit' }); },
  openQr(e) {
    wx.navigateTo({ url: '/pages/qr/qr?id=' + e.currentTarget.dataset.id });
  }
});
