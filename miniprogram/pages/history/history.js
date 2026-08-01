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
    imgPath: ''
  },
  onLoad() {
    const info = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
    this.setData({ statusBarH: info.statusBarHeight || 20 });
    this.raw = util.load(WALL_KEY, null);
    if (!this.raw || !this.raw.length) {
      this.raw = SEED.map((p, i) => ({ id: 'seed' + i, img: p.img, type: p.type, key: p.key, text: p.text, author: p.author, ts: Date.now() - p.ago * 3600000 }));
      util.save(WALL_KEY, this.raw);
    }
    this.renderPosts();
  },
  renderPosts() {
    const posts = this.raw.map(p => ({
      id: p.id, img: p.img, name: targetName(p.type, p.key),
      tag: p.type === 'venue' ? '演出场地' : '商店',
      tagCls: p.type === 'venue' ? 'vt' : 'st',
      text: p.text, author: p.author, time: wallTime(p.ts)
    }));
    this.setData({ posts });
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
