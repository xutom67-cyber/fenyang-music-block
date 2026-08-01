const util = require('../../utils/util.js');
const AVATARS = [
  ['♪', 'linear-gradient(135deg,#7FB69A,#5E9C80)'],
  ['♫', 'linear-gradient(135deg,#8FA6D9,#5E74A8)'],
  ['♬', 'linear-gradient(135deg,#C9A97E,#96764E)'],
  ['🎻', 'linear-gradient(135deg,#C9A3B8,#9A6E84)'],
  ['🎹', 'linear-gradient(135deg,#8FB8C0,#5E8E96)'],
  ['🎷', 'linear-gradient(135deg,#A8C49B,#7C9E70)']
];

Page({
  data: { statusBarH: 20, avatars: AVATARS, avatarIdx: 0, avatarGlyph: '♪', avatarGrad: AVATARS[0][1], name: '', ident: '', bio: '' },
  onLoad() {
    const info = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
    const p = getApp().globalData.profile;
    this.setData({
      statusBarH: info.statusBarHeight || 20,
      avatarIdx: p.avatar || 0,
      avatarGlyph: AVATARS[p.avatar || 0][0],
      avatarGrad: AVATARS[p.avatar || 0][1],
      name: p.name, ident: p.ident, bio: p.bio || ''
    });
  },
  pickAvatar(e) {
    const i = e.currentTarget.dataset.i;
    this.setData({ avatarIdx: i, avatarGlyph: AVATARS[i][0], avatarGrad: AVATARS[i][1] });
  },
  onName(e) { this.setData({ name: e.detail.value }); },
  onIdent(e) { this.setData({ ident: e.detail.value }); },
  onBio(e) { this.setData({ bio: e.detail.value }); },
  save() {
    const g = getApp().globalData;
    g.profile = {
      name: (this.data.name || '').trim() || '汾阳乐迷',
      ident: (this.data.ident || '').trim() || '音乐街区居民',
      bio: (this.data.bio || '').trim(),
      avatar: this.data.avatarIdx
    };
    util.save('fy_profile_v1', g.profile);
    wx.showToast({ title: '资料已保存 ✓', icon: 'none' });
    setTimeout(() => wx.navigateBack(), 600);
  },
  goBack() { wx.navigateBack(); }
});
