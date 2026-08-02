const util = require('./utils/util.js');

App({
  globalData: {
    calib: util.load('fy_calib_v1', util.DEFAULT_CALIB),
    tickets: util.load('fy_tickets_v1', []),       // 演出票订单记录
    shopOrders: util.load('fy_orders_v1', []),      // 商店订单记录
    member: util.load('fy_member_v1', null),
    profile: util.load('fy_profile_v1', null)
  },
  onLaunch() {
    const g = this.globalData;
    if (!Array.isArray(g.tickets)) g.tickets = [];
    if (!Array.isArray(g.shopOrders)) g.shopOrders = [];
    if (!g.member) {
      g.member = { code: 'FY2026' + String(Math.floor(Math.random() * 9000) + 1000), level: 3, joined: '2024.09' };
      util.save('fy_member_v1', g.member);
    }
    const NICK_POOL = ['夜航西飞', '弄堂琴师', '梧桐树下', '黑胶旅人', '半音阶先生', '老克勒', '爵士猫', '汾阳路的风', '谱架小满', '旧唱片收藏家', '音阶漫步者', '复调小姐'];
    if (!g.profile) {
      let nick = util.load('fy_nick_v1', null);
      if (!nick) {
        nick = NICK_POOL[Math.floor(Math.random() * NICK_POOL.length)];
        util.save('fy_nick_v1', nick);
      }
      g.profile = { name: nick, ident: '同济大学 · 数字人文', bio: '音乐街区的常客，喜欢爵士与老上海旋律。', avatar: 0 };
      util.save('fy_profile_v1', g.profile);
    }
  }
});
