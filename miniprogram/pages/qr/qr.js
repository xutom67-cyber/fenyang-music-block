const util = require('../../utils/util.js');
const qrcode = require('../../utils/qrcode.js');

Page({
  data: { statusBarH: 20, type: '', title: '', meta: '', code: '', note: '', statusTxt: '', statusCls: 'waiting' },
  onLoad(options) {
    const info = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
    this.setData({ statusBarH: info.statusBarHeight || 20 });
    const g = getApp().globalData;
    const order = g.tickets.find(t => t.id === options.id) || g.shopOrders.find(t => t.id === options.id);
    if (!order) { wx.showToast({ title: '订单不存在', icon: 'none' }); return; }
    const isTicket = order.kind === 'ticket';
    const st = isTicket ? util.ticketOrderStatus(order) : util.shopOrderStatus(order);
    const fmt = c => c.slice(0, 2) + ' ' + c.slice(2, 6) + ' ' + c.slice(6);
    this.code = order.code;
    this.setData({
      type: isTicket ? '演出票 · 兑换码' : '商店订单 · 取件码',
      title: isTicket ? order.title : order.shopName,
      meta: isTicket
        ? `${order.venue} · ${util.fmtWhen(order.when)} · ${order.qty} 张`
        : `${order.slot} ${util.fmtWhen(order.slotISO)} · ${order.items.map(it => `${it.name}×${it.qty}`).join('、')}`,
      code: fmt(order.code),
      note: isTicket
        ? (st === 'waiting' ? '演出前 30 分钟凭此码在入口处换取纸质票入场' : '本场演出已结束，此码已失效')
        : (st === 'waiting' ? '到店出示此码，店员扫码核对后取货' : '订单已完成，此码已失效'),
      statusTxt: isTicket ? (st === 'waiting' ? '待使用' : '已结束') : (st === 'waiting' ? '待使用' : '已完成'),
      statusCls: st
    });
    this.drawQr();
  },
  drawQr() {
    const query = this.createSelectorQuery();
    query.select('#qrCanvas').fields({ node: true, size: true }).exec(res => {
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
      qr.addData(this.code.replace(/\s/g, ''));
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
  goBack() { wx.navigateBack(); }
});
