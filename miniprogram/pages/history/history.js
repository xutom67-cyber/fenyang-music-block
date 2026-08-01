const util = require('../../utils/util.js');
const FY = util.FY;

const SEED = [
  { img: '/images/wall/w01-concert-stage.jpg', type: 'venue', key: 'sso-hall', text: '上交的贝九，弦乐一进来整个人都起鸡皮疙瘩', author: '乐迷·小林', ago: 2 },
  { img: '/images/wall/w02-dj-lights.jpg', type: 'venue', key: 'shangfang-plaza', text: '周五晚上的广场演出，灯光和梧桐树影叠在一起', author: '街坊老王', ago: 5 },
  { img: '/images/wall/w03-concert-crowd.jpg', type: 'venue', key: 'sy-opera', text: '《茶花女》散场，人群迟迟不走', author: '上音学生·阿哲', ago: 9 },
  { img: '/images/wall/w04-singer.jpg', type: 'venue', key: 'he-luting', text: '声乐专场，唱功是真的顶', author: '乐迷·阿May', ago: 26 },
  { img: '/images/wall/w05-piano.jpg', type: 'shop', key: 'yinyue-book', text: '在音乐书店翻到绝版乐谱，店员说可以慢慢看', author: '旅人S', ago: 30 },
  { img: '/images/wall/w06-piano-keys.jpg', type: 'shop', key: 'zhiyin', text: '试琴试了半小时，老板也没催，汾阳路的老店就是这样', author: '琴童妈妈', ago: 50 },
  { img: '/images/wall/w07-vinyl.jpg', type: 'shop', key: 'xingfu', text: '黑石公寓里的幸福集荟，黑胶区一待就是一个下午', author: '乐迷·小林', ago: 53 },
  { img: '/images/wall/w08-cafe.jpg', type: 'shop', key: 'yongkang-cafe', text: '手冲配爵士，永康路的下午值得浪费', author: '咖啡客·Luna', ago: 72 },
  { img: '/images/wall/w09-cafe-interior.jpg', type: 'shop', key: 'nongtang-cafe', text: '弄堂深处的咖啡馆，安静到能听见磨豆声', author: '街坊老王', ago: 95 },
  { img: '/images/wall/w10-coffee.jpg', type: 'shop', key: 'huayuan-rest', text: '花园小馆的露台位，梧桐绿荫里吃午饭', author: '旅人S', ago: 120 },
  { img: '/images/wall/w11-interior.jpg', type: 'shop', key: 'dongping', text: '东平路的小酒馆，晚风正好', author: '阿哲', ago: 140 },
  { img: '/images/wall/w12-library.jpg', type: 'shop', key: 'xingfu', text: '书店的拱廊太好拍了，光影绝了', author: '摄影·Ken', ago: 168 },
  { img: '/images/wall/w13-books.jpg', type: 'shop', key: 'yinyue-book', text: '乐谱区，考研那阵子常来，老板都认识我了', author: '琴童妈妈', ago: 190 },
  { img: '/images/wall/w14-reading.jpg', type: 'venue', key: 'blackstone', text: '黑石公寓一层的书店区，历史感全在里面', author: '乐迷·阿May', ago: 210 },
  { img: '/images/wall/w15-building.jpg', type: 'venue', key: 'blackstone', text: '黑石公寓外立面，1924 年的老房子', author: '摄影·Ken', ago: 240 },
  { img: '/images/wall/w16-street.jpg', type: 'venue', key: 'pushkin', text: '普希金雕像前的街角，永远有人停下来', author: '街坊老王', ago: 280 }
];
const WALL_KEY = 'fy_wall_v1';
const CMT_KEY = 'fy_wall_cmts_v1', LIKE_KEY = 'fy_wall_likes_v1';

/* 衡复历史沿革卡片（社区页置顶，点击查看全文） */
const HIST_CARDS = [
  { title: '百年衡复', img: '/images/wall/w15-building.jpg', body: '该地块隶属衡山路—复兴路历史文化风貌区，源自法租界时期的“西区”。1920—1930 年代，花园住宅、高级公寓与梧桐林荫道在此大量兴建，至今仍是上海历史风貌保存最完整的街区之一。梧桐掩映下，武康路、汾阳路、复兴中路连缀成片的老洋房与里弄，是近代上海城市生活最精致的样本。' },
  { title: '音乐学府', img: '/images/wall/w05-piano.jpg', body: '上海音乐学院源自 1927 年创办的国立音乐院，是中国第一所独立建制的高等音乐学府，萧友梅、贺绿汀等音乐家先后在此执教。汾阳路校区坐落于地块东侧、紧邻汾阳路，校园内绿树掩映、琴声不绝，傍晚路过常能听见从琴房传来的练习曲。' },
  { title: '花园里弄', img: '/images/wall/w09-cafe-interior.jpg', body: '上方花园与相邻的新康花园均为 1930 年代建成的花园住宅小区，红瓦坡顶、庭院错落，是典型的近代花园里弄。如今新康花园的别墅陆续改造为工作坊、餐厅与咖啡馆，老洋房的新生让历史街区保持日常的烟火气。' },
  { title: '音乐街区', img: '/images/wall/w16-street.jpg', body: '近年上交音乐厅、上音歌剧院相继落成，黑石公寓更新为书店与音乐空间，汾阳路乐器街与上方花园音乐广场共同生长——“音乐”成为这条街区的日常底色。从琴行试琴声到广场周末演出，衡复的每一处角落都在发生音乐。' }
];

const CMT_SEED = {
  seed0: [
    { author: '街坊老王', text: '上周刚去听过一次，音效真的震撼', replyTo: null },
    { author: '乐迷·小林', text: '同感！建议买二楼中排', replyTo: '街坊老王' }
  ],
  seed6: [
    { author: '旅人S', text: '黑胶区每周四上新，蹲了很久了', replyTo: null },
    { author: '琴童妈妈', text: '小朋友在那里第一次听黑胶，特别喜欢', replyTo: null }
  ],
  seed1: [
    { author: '摄影·Ken', text: '灯光真的绝，拍照出片', replyTo: null },
    { author: '街坊老王', text: '每周五都有，欢迎来玩', replyTo: '摄影·Ken' }
  ],
  hist1: [{ author: '上音学生·阿哲', text: '每天路过琴房都听到练琴声，太幸福了', replyTo: null }],
  hist0: [{ author: '旅人S', text: '武康路和汾阳路这段真的值得慢慢走', replyTo: null }]
};
const LIKE_SEED = { seed0: true, seed6: true, seed1: true, hist1: true };

function wallTime(ts) {
  const h = (Date.now() - ts) / 3600000;
  return h < 1 ? '刚刚' : h < 24 ? Math.floor(h) + ' 小时前' : Math.floor(h / 24) + ' 天前';
}
function targetName(type, key) {
  if (type === 'venue') { const v = FY.venues.find(x => x.id === key); return v ? v.name : key; }
  const s = FY.shops[key]; return s ? s.name : key;
}

Page({
  data: {
    statusBarH: 20,
    sections: [
      { title: '百年衡复', body: '该地块隶属衡山路—复兴路历史文化风貌区，源自法租界时期的“西区”。1920—1930 年代，花园住宅、高级公寓与梧桐林荫道在此大量兴建，至今仍是上海历史风貌保存最完整的街区之一。' },
      { title: '音乐学府', body: '上海音乐学院源自 1927 年创办的国立音乐院，是中国第一所独立建制的高等音乐学府。汾阳路校区坐落于地块东侧、紧邻汾阳路，校园内绿树掩映、琴声不绝。' },
      { title: '花园里弄', body: '上方花园与相邻的新康花园均为 1930 年代建成的花园住宅小区，红瓦坡顶、庭院错落。如今新康花园的别墅陆续改造为工作坊、餐厅与咖啡馆，成为街区日常的一部分。' },
      { title: '音乐街区', body: '近年上交音乐厅、上音歌剧院相继落成，黑石公寓更新为书店与音乐空间，汾阳路乐器街与上方花园音乐广场共同生长——“音乐”成为这条街区的日常底色。' }
    ],
    posts: [],
    wallOpen: false,
    type: 'venue',
    targets: [],
    targetNames: [],
    targetIdx: 0,
    text: '',
    imgPath: '',
    postDetail: null,
    cmts: [],
    liked: false,
    likeCount: 0,
    cmtInput: '',
    cmtPlaceholder: '说点什么…（点评论可回复）'
  },
  onLoad() {
    const info = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
    this.setData({ statusBarH: info.statusBarHeight || 20 });
    this.raw = util.load(WALL_KEY, null);
    if (!this.raw || !this.raw.length) {
      this.raw = SEED.map((p, i) => ({ id: 'seed' + i, img: p.img, type: p.type, key: p.key, text: p.text, author: p.author, ts: Date.now() - p.ago * 3600000 }));
      util.save(WALL_KEY, this.raw);
    }
    this.cmtsStore = util.load(CMT_KEY, null);
    if (!this.cmtsStore) {
      this.cmtsStore = {};
      for (const pid in CMT_SEED) this.cmtsStore[pid] = CMT_SEED[pid].map(c => ({ ...c, ts: Date.now() - Math.floor(Math.random() * 48 + 2) * 3600000 }));
      util.save(CMT_KEY, this.cmtsStore);
    }
    this.likesStore = util.load(LIKE_KEY, null) || { ...LIKE_SEED };
    if (!util.load(LIKE_KEY, null)) util.save(LIKE_KEY, this.likesStore);
    this.curPid = null;
    this.replyTo = null;
    this.renderPosts();
  },
  cmtCount(pid) { const c = this.cmtsStore[pid]; return c ? c.length : 0; },
  renderPosts() {
    const hist = HIST_CARDS.map((h, i) => ({
      id: 'hist' + i, pid: 'hist' + i, img: h.img, name: h.title,
      tag: '街区历史', tagCls: 'ht',
      text: h.body.length > 52 ? h.body.slice(0, 52) + '…' : h.body,
      author: '汾阳路音乐街区', time: '沿革 · ' + this.cmtCount('hist' + i) + ' 评论'
    }));
    const posts = this.raw.map(p => ({
      id: p.id, pid: p.id, img: p.img, name: targetName(p.type, p.key),
      tag: p.type === 'venue' ? '演出场地' : '商店',
      tagCls: p.type === 'venue' ? 'vt' : 'st',
      text: p.text, author: p.author,
      time: wallTime(p.ts) + ' · ' + this.cmtCount(p.id) + ' 评论'
    }));
    this.setData({ posts: hist.concat(posts) });
  },
  /* ----- 帖子详情与互动 ----- */
  onCardTap(e) {
    this.openPost(e.currentTarget.dataset.pid);
  },
  openPost(pid) {
    this.curPid = pid;
    this.replyTo = null;
    let detail;
    if (pid.indexOf('hist') === 0) {
      const h = HIST_CARDS[Number(pid.slice(4))];
      detail = { name: h.title, img: h.img, tag: '街区历史', tagCls: 'ht', text: h.body, author: '汾阳路音乐街区', time: '沿革', canGo: false };
    } else {
      const p = this.raw.find(x => x.id === pid);
      if (!p) return;
      detail = {
        name: targetName(p.type, p.key), img: p.img,
        tag: p.type === 'venue' ? '演出场地' : '商店',
        tagCls: p.type === 'venue' ? 'vt' : 'st',
        text: p.text || '', author: p.author, time: wallTime(Date.now() - p.ts),
        canGo: true, kind: p.type, key: p.key
      };
    }
    this.setData({ postDetail: detail });
    this.refreshCmts();
  },
  refreshCmts() {
    const list = (this.cmtsStore[this.curPid] || []).slice().reverse().map(c => ({
      author: c.author, replyTo: c.replyTo, text: c.text, time: wallTime(Date.now() - c.ts), ts: c.ts
    }));
    const base = (this.curPid.length * 7) % 6 + 2;
    this.setData({
      cmts: list,
      liked: !!this.likesStore[this.curPid],
      likeCount: base + (this.likesStore[this.curPid] ? 1 : 0),
      cmtInput: '',
      cmtPlaceholder: '说点什么…（点评论可回复）'
    });
  },
  closePost() { this.setData({ postDetail: null }); },
  replyToCmt(e) {
    this.replyTo = e.currentTarget.dataset.author;
    this.setData({ cmtPlaceholder: '回复 @' + this.replyTo + '：' });
  },
  onCmtInput(e) { this.setData({ cmtInput: e.detail.value }); },
  addComment() {
    const text = this.data.cmtInput.trim();
    if (!text || !this.curPid) return;
    const prof = getApp().globalData.profile;
    const c = { author: (prof && prof.name) || '汾阳乐迷', text, replyTo: this.replyTo, ts: Date.now() };
    if (!this.cmtsStore[this.curPid]) this.cmtsStore[this.curPid] = [];
    this.cmtsStore[this.curPid].push(c);
    util.save(CMT_KEY, this.cmtsStore);
    this.replyTo = null;
    this.refreshCmts();
    this.renderPosts();
  },
  toggleLike() {
    if (!this.curPid) return;
    this.likesStore[this.curPid] = !this.likesStore[this.curPid];
    util.save(LIKE_KEY, this.likesStore);
    this.refreshCmts();
  },
  goPlace() {
    const d = this.data.postDetail;
    if (!d || !d.canGo) return;
    this.setData({ postDetail: null });
    if (d.kind === 'venue') wx.navigateTo({ url: '/pages/venue-detail/venue-detail?id=' + d.key });
    else wx.navigateTo({ url: '/pages/shop-detail/shop-detail?id=' + d.key });
  },
  /* ----- 发布 ----- */
  openWall() {
    this.setData({ type: 'venue', targetIdx: 0, text: '', imgPath: '', wallOpen: true });
    this.fillTargets();
  },
  closeWall() { this.setData({ wallOpen: false }); },
  fillTargets() {
    const t = this.data.type;
    const targets = t === 'venue'
      ? FY.venues.map(v => ({ key: v.id, name: v.name }))
      : Object.entries(FY.shops).map(([k, s]) => ({ key: k, name: s.name }));
    this.setData({ targets, targetNames: targets.map(x => x.name), targetIdx: 0 });
  },
  pickType(e) {
    this.setData({ type: e.currentTarget.dataset.t });
    this.fillTargets();
  },
  pickTarget(e) { this.setData({ targetIdx: Number(e.detail.value) }); },
  onText(e) { this.setData({ text: e.detail.value }); },
  chooseImg() {
    wx.chooseMedia({
      count: 1, mediaType: ['image'], sourceType: ['album', 'camera'],
      success: res => this.setData({ imgPath: res.tempFiles[0].tempFilePath }),
      fail: () => {}
    });
  },
  submitPost() {
    if (!this.data.imgPath) { wx.showToast({ title: '请先选择一张照片', icon: 'none' }); return; }
    const prof = getApp().globalData.profile;
    const post = {
      id: 'u' + Date.now(), img: this.data.imgPath,
      type: this.data.type, key: this.data.targets[this.data.targetIdx].key,
      text: this.data.text.trim(), author: (prof && prof.name) || '汾阳乐迷', ts: Date.now()
    };
    this.raw.unshift(post);
    util.save(WALL_KEY, this.raw);
    this.renderPosts();
    this.setData({ wallOpen: false });
    wx.showToast({ title: '已发布到影像墙 ✓', icon: 'none' });
  }
});
