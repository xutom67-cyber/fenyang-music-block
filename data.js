/* ============================================================
   汾阳路音乐街区 · 小程序原型数据
   上海音乐学院汾阳路校区所在街区（衡复音乐街区 · 汾阳路片区）
   手绘示意地图坐标系统：viewBox 0 0 760 880
   ============================================================ */
window.FY = {
  /* ---------- 街区色块（编辑模式下可改色） ---------- */
  blocks: [
    { id: 'campus', name: '主地块 · 上方花园·新康·校园', main: true,  fill: '#D9E9D6', points: '600,132 430,420 110,420 110,120' },
    { id: 'ne',     name: '东北街区', fill: '#F6F6F3', points: '600,132 700,139 700,420 430,420' },
    { id: 'park',   name: '襄阳公园', park: true, fill: '#D2E8CE', points: '50,40 250,45 252,95 48,95' },
    { id: 'nw',     name: '西北街区', fill: '#F6F6F3', points: '110,120 -10,120 -10,420 110,420' },
    { id: 'se1',    name: '复兴东街区', fill: '#F6F6F3', points: '430,420 700,420 700,560 398,560' },
    { id: 'sw1',    name: '汾阳西南街区', fill: '#F6F6F3', points: '430,420 398,560 110,560 110,420' },
    { id: 'se2',    name: '永康东街区', fill: '#F6F6F3', points: '398,560 700,560 700,720 350,720' },
    { id: 'sw2',    name: '岳阳西街区', fill: '#F6F6F3', points: '398,560 350,722 150,640 110,640 110,560' }
  ],

  /* ---------- 道路（依据真实地块：常熟路—汾阳路—陕西南路，淮海中路—复兴中路—永康路） ---------- */
  streets: [
    { name: '淮海中路', d: 'M 40 120 L 760 140',              label: [400, 102] },
    { name: '复兴中路', d: 'M 40 420 L 760 420',              label: [400, 404] },
    { name: '汾阳路',   d: 'M 600 132 L 545 240 L 480 330 L 430 420 L 398 520 L 380 620 L 350 722', label: [522, 240], rot: -62 },
    { name: '永康路',   d: 'M 110 560 L 700 560',             label: [470, 544] },
    { name: '东平路',   d: 'M 380 620 L 700 625',             label: [540, 608] },
    { name: '桃江路',   d: 'M 350 720 L 700 720',             label: [530, 704] },
    { name: '岳阳路',   d: 'M 350 722 L 150 640',             label: [272, 664], rot: -62 },
    { name: '东湖路',   d: 'M 555 136 L 545 420 L 540 560',   label: [528, 300], rot: -80 },
    { name: '常熟路',   d: 'M 110 40 L 110 660',              label: [92, 420], rot: 90 },
    { name: '陕西南路', d: 'M 700 60 L 700 720',              label: [716, 420], rot: 90 }
  ],

  /* ---------- 普希金广场（汾阳路·岳阳路·桃江路交汇） ---------- */
  plaza: { x: 368, y: 722, r: 26, fill: '#CFE5CD' },

  /* ---------- 上方花园 · 音乐广场（线性绿地，两端与中心三处表演空间） ---------- */
  musicPlaza: {
    x: 235, y: 265, w: 120, h: 22,
    nodes: [
      { x: 185, y: 265, name: '西端舞台' },
      { x: 235, y: 265, name: '中心舞台' },
      { x: 285, y: 265, name: '东端舞台' }
    ]
  },

  parkTrees: [ [85,58], [125,55], [165,60], [100,78], [145,82], [195,76] ],

  /* ---------- 景点标记（小菱形） ---------- */
  spots: [
    { id: 'nie-er',        name: '聂耳雕像',       x: 445, y: 335, kind: 'landmark' },
    { id: 'yueqi',         name: '汾阳路乐器街',   x: 392, y: 505, kind: 'street' },
    { id: 'xinkang',       name: '新康花园 · 商业别墅', x: 160, y: 200, kind: 'landmark' },
    { id: 'gongyi',        name: '工艺美术博物馆', x: 396, y: 468, kind: 'museum' },
    { id: 'dongfang-mus',  name: '东方乐器博物馆', x: 460, y: 375, kind: 'museum' },
    { id: 'jiaoxiang-mus', name: '交响音乐博物馆', x: 570, y: 360, kind: 'museum' }
  ],

  /* ---------- 活动场地（主标记点） ---------- */
  venues: [
    {
      id: 'sy-opera', glyph: '剧', name: '上音歌剧院', addr: '汾阳路20号 · 校园东侧',
      x: 440, y: 295,
      intro: '上音校园内的专业歌剧院，以“海上音”为主题的当代声学空间，常年上演歌剧、音乐剧与跨界演出，是街区最具人气的文化地标。',
      seeds: [
        { t: 40,  title: '歌剧《茶花女》精选音乐会',  room: '主剧场',   dur: '90分钟' },
        { t: 190, title: '《梁祝》弦乐四重奏音乐会',  room: '室内乐厅', dur: '75分钟' },
        { d: 1, hm: '14:00', title: '经典咏叹调午间场', room: '主剧场', dur: '80分钟' },
        { d: 1, hm: '19:30', title: '原创音乐剧《上音之声》', room: '主剧场', dur: '120分钟' }
      ],
      densityBase: 3, passBase: 6, trend: '↑',
      ratingBase: { avg: 4.7, n: 132 },
      shops: ['zhiyin', 'yinyue-book', 'yongkang-cafe'],
      prices: [['普通票', 280], ['学生票', 180], ['双人票', 480]]
    },
    {
      id: 'sso-hall', glyph: '交', name: '上海交响乐团音乐厅', addr: '复兴中路1380号',
      x: 522, y: 388,
      intro: '由矶崎新设计的专业交响乐厅，主厅以“馄饨皮”造型著称，声学效果位居世界前列，是上海交响乐团的驻场地。',
      seeds: [
        { t: 40,  title: '贝多芬《第九交响曲》', room: '主厅',   dur: '100分钟' },
        { t: 190, title: '上交室内乐 · 莫扎特专场', room: '演艺厅', dur: '70分钟' },
        { d: 1, hm: '14:00', title: '亲子音乐会《彼得与狼》', room: '主厅', dur: '60分钟' },
        { d: 1, hm: '19:30', title: '爵士之夜', room: '演艺厅', dur: '90分钟' }
      ],
      densityBase: 4, passBase: 7, trend: '↓',
      ratingBase: { avg: 4.8, n: 218 },
      shops: ['xingfu', 'yinyue-book', 'dongping'],
      prices: [['普通票', 380], ['学生票', 280], ['双人票', 660]]
    },
    {
      id: 'he-luting', glyph: '厅', name: '贺绿汀音乐厅', addr: '汾阳路20号 · 校园内',
      x: 410, y: 250,
      intro: '以作曲家贺绿汀命名的校园音乐厅，以上音师生教学汇报、室内乐与民族器乐演出为主，氛围安静亲切。',
      seeds: [
        { t: 40,  title: '师生室内乐音乐会', room: '音乐厅', dur: '70分钟' },
        { t: 190, title: '民族器乐专场',     room: '音乐厅', dur: '80分钟' },
        { d: 1, hm: '19:30', title: '古筝与钢琴的对话', room: '音乐厅', dur: '75分钟' }
      ],
      densityBase: 2, passBase: 4, trend: '→',
      ratingBase: { avg: 4.6, n: 96 },
      shops: ['yinyue-book', 'zhiyin'],
      prices: [['普通票', 180], ['学生票', 120], ['双人票', 300]],
    },
    {
      id: 'blackstone', glyph: '集', name: '黑石公寓 · 幸福集荟', addr: '复兴中路1331号',
      x: 522, y: 462,
      intro: '1924年建成的历史公寓，底层更新为幸福集荟书店与黑石音乐台，老建筑与当代文化生活在此相遇，夜间常有小型爵士演出。',
      seeds: [
        { t: 40,  title: '黑石爵士夜 · 四重奏', room: '黑石音乐台', dur: '80分钟' },
        { t: 190, title: '黑胶分享会 · 老上海旋律', room: '幸福集荟', dur: '60分钟' },
        { d: 1, hm: '14:00', title: '小型室内乐快闪', room: '音乐台', dur: '45分钟' }
      ],
      densityBase: 3, passBase: 5, trend: '↑',
      ratingBase: { avg: 4.5, n: 164 },
      shops: ['xingfu', 'yongkang-cafe', 'dongping'],
      prices: [['普通票', 220], ['学生票', 150], ['双人票', 380]],
    },
    {
      id: 'xiangyang-park', glyph: '园', name: '襄阳公园', addr: '淮海中路1008号',
      x: 555, y: 155,
      intro: '街区最大的公共绿地，晨间合唱、露天手风琴角与周末草坪音乐会常年不断，是市民音乐生活的日常发生地。',
      seeds: [
        { t: 40,  title: '露天手风琴角',       room: '中心草坪', dur: '60分钟' },
        { t: 190, title: '市民合唱团展演',     room: '中心草坪', dur: '75分钟' },
        { d: 1, hm: '10:00', title: '亲子草坪音乐会', room: '中心草坪', dur: '55分钟' }
      ],
      densityBase: 2, passBase: 3, trend: '→',
      ratingBase: { avg: 4.3, n: 88 },
      shops: ['yongkang-cafe', 'zhiyin'],
      prices: [['普通票', 30], ['学生票', 20], ['家庭票', 60]],
    },
    {
      id: 'pushkin', glyph: '碑', name: '普希金纪念碑广场', addr: '汾阳路 · 岳阳路 · 桃江路交汇',
      x: 368, y: 700,
      intro: '三路交汇的三角形广场，中央立有普希金纪念碑，是街头快闪、诗歌朗读与周末市集的聚集地，傍晚人流最为活跃。',
      seeds: [
        { t: 40,  title: '街头小提琴快闪',   room: '广场中央', dur: '40分钟' },
        { t: 190, title: '诗歌朗读会',       room: '广场中央', dur: '50分钟' },
        { d: 1, hm: '14:00', title: '周末市集 · 街头艺人场', room: '广场周边', dur: '180分钟' }
      ],
      densityBase: 1, passBase: 2, trend: '↑',
      ratingBase: { avg: 4.4, n: 57 },
      shops: ['dongping', 'yongkang-cafe'],
      prices: [['普通票', 30], ['学生票', 20], ['双人票', 50]],
    },
    {
      id: 'shangfang-plaza', glyph: '场', name: '上方花园 · 音乐广场', addr: '淮海中路1285弄 · 线性绿地',
      x: 235, y: 225,
      intro: '上方花园中央的线性绿地改造为音乐广场，两端与中心共设三处表演空间，日常街头演出、广场音乐会与音乐市集轮番上演。',
      seeds: [
        { t: 40,  title: '西端舞台 · 街头弦乐快闪', room: '西端舞台', dur: '45分钟' },
        { t: 190, title: '中心舞台 · 广场爵士夜',   room: '中心舞台', dur: '90分钟' },
        { d: 1, hm: '10:30', title: '东端舞台 · 亲子合唱团', room: '东端舞台', dur: '60分钟' },
        { d: 1, hm: '16:00', title: '中心舞台 · 音乐市集演出', room: '中心舞台', dur: '120分钟' }
      ],
      densityBase: 2, passBase: 3, trend: '→',
      ratingBase: { avg: 4.5, n: 76 },
      shops: ['nongtang-cafe', 'yimu-workshop'],
      prices: [['普通票', 40], ['学生票', 25], ['双人票', 70]],
    }
  ],

  /* ---------- 商店 ---------- */
  shops: {
    'xingfu': {
      glyph: '书', name: '幸福集荟书店', type: '书店 · 文创',
      addr: '复兴中路1331号 · 黑石公寓底商',
      intro: '位于黑石公寓底层的历史建筑书店，黑胶唱片、音乐书籍与上海城市记忆文创在此陈列，是音乐街区的标志性文化空间。',
      prices: [ ['黑胶唱片（老上海系列）', '¥128'], ['音乐街区明信片套装', '¥15'], ['手冲挂耳咖啡（礼盒装）', '¥38'] ],
      crowdBase: 14, ordersBase: 3, waitBase: 4, status: '空闲',
      ratingBase: { avg: 4.8, n: 96 },
      reviews: [
        { user: 'Momo', stars: 5, text: '黑胶角落太棒了，午后阳光配爵士乐，氛围拉满。' },
        { user: '阿哲', stars: 4, text: '空间很有味道，文创定价略高，但值得一逛。' },
        { user: 'Momo', stars: 5, text: '文创最近上新了联名款，可以再逛逛～', replyTo: '阿哲' }
      ],
      map: { x: 545, y: 470 }
    },
    'zhiyin': {
      glyph: '琴', name: '知音琴行', type: '乐器行',
      addr: '汾阳路60号',
      intro: '汾阳路乐器街上的老牌琴行，主营提琴、吉他、民族乐器与配件，提供乐器保养与调试服务，音乐生常来光顾。',
      prices: [ ['尤克里里（入门款）', '¥399'], ['二胡入门套装', '¥880'], ['学生级小提琴', '¥1280'] ],
      crowdBase: 6, ordersBase: 2, waitBase: 3, status: '空闲',
      ratingBase: { avg: 4.6, n: 58 },
      reviews: [
        { user: '弦上春秋', stars: 5, text: '老师傅调音很专业，二胡手感比网上买的好太多。' },
        { user: '小圆', stars: 4, text: '品类很全，店员耐心，价格和网上持平。' }
      ],
      map: { x: 424, y: 520 }
    },
    'yongkang-cafe': {
      glyph: '咖', name: '永康路手冲咖啡馆', type: '咖啡 · 甜品',
      addr: '永康路86号',
      intro: '永康路网红咖啡馆的代表，主打单品手冲与巴斯克蛋糕，窗口位能看到街区的梧桐与行人，周末常常一座难求。',
      prices: [ ['澳白', '¥28'], ['单品手冲（当日豆单）', '¥38–58'], ['巴斯克蛋糕', '¥32'] ],
      crowdBase: 18, ordersBase: 6, waitBase: 8, status: '排队中',
      ratingBase: { avg: 4.5, n: 210 },
      reviews: [
        { user: '拿铁不加糖', stars: 5, text: '埃塞俄比亚豆子很干净，巴斯克入口即化。' },
        { user: 'Tiger', stars: 4, text: '周末排队半小时起，建议工作日来。' },
        { user: '乐呵', stars: 4, text: '窗边座位拍照绝了，咖啡中上水平。' }
      ],
      map: { x: 330, y: 588 }
    },
    'dongping': {
      glyph: '餐', name: '东平路小酒馆', type: '餐吧 · 简餐',
      addr: '东平路12号',
      intro: '藏在小马路里的音乐餐吧，夜晚有驻唱演出，招牌牛肉面与精酿啤酒颇受欢迎，适合演出结束后小酌。',
      prices: [ ['招牌牛肉面', '¥48'], ['精酿啤酒（自酿）', '¥38'], ['音乐晚餐套餐', '¥128'] ],
      crowdBase: 9, ordersBase: 4, waitBase: 6, status: '出餐中',
      ratingBase: { avg: 4.2, n: 74 },
      reviews: [
        { user: '夜猫子', stars: 5, text: '驻唱小哥唱得真好，牛肉面配啤酒绝了。' },
        { user: '徐徐', stars: 4, text: '位置有点难找，跟着导航走就行，氛围很放松。' }
      ],
      map: { x: 480, y: 652 }
    },
    'yinyue-book': {
      glyph: '谱', name: '汾阳路音乐书店', type: '书店 · 乐谱',
      addr: '汾阳路32号',
      intro: '专注音乐出版的专业书店，正版乐谱、音乐史丛书与五线谱本一应俱全，上音师生几乎人人知晓。',
      prices: [ ['正版乐谱（单本）', '¥25–160'], ['音乐史丛书', '¥68'], ['五线谱本', '¥12'] ],
      crowdBase: 5, ordersBase: 1, waitBase: 2, status: '空闲',
      ratingBase: { avg: 4.9, n: 41 },
      reviews: [
        { user: '钢琴老师王', stars: 5, text: '谱子全，车尔尼到德彪西都有，店员能帮你找版本。' }
      ],
      map: { x: 442, y: 330 }
    },
    'yimu-workshop': {
      glyph: '木', name: '一木工坊', type: '木作 · 工作坊',
      addr: '新康花园 · 淮海中路1273弄9号',
      intro: '老别墅里的木作工坊，提供木工体验课与定制家具，周末常有亲子木作活动，锯木声与琴声相映成趣。',
      prices: [ ['木作体验课（2小时）', '¥168'], ['定制原木杯垫', '¥58'], ['胡桃木小板凳 DIY', '¥298'] ],
      crowdBase: 6, ordersBase: 2, waitBase: 3, status: '空闲',
      ratingBase: { avg: 4.7, n: 43 },
      reviews: [
        { user: '小木匠', stars: 5, text: '老师傅手把手教，做完的凳子现在天天在用。' },
        { user: '叶子', stars: 4, text: '环境很有氛围，就是周末人有点多。' }
      ],
      map: { x: 145, y: 182 }
    },
    'shitao-studio': {
      glyph: '陶', name: '拾陶工作室', type: '陶艺 · 工作坊',
      addr: '新康花园 · 淮海中路1273弄11号',
      intro: '别墅庭院中的陶艺工作室，拉坯体验与成品烧制一体，庭院里摆满学员作品，适合慢慢消磨一下午。',
      prices: [ ['拉坯体验（90分钟）', '¥138'], ['陶瓷杯上釉烧制', '¥98'], ['双人陶艺课程', '¥258'] ],
      crowdBase: 5, ordersBase: 1, waitBase: 2, status: '空闲',
      ratingBase: { avg: 4.8, n: 51 },
      reviews: [
        { user: '泥巴', stars: 5, text: '第一次拉坯就成功了，老师超耐心，作品两周后寄到家。' },
        { user: 'CC', stars: 5, text: '庭院拍照绝美，顺便逛了隔壁的咖啡。' }
      ],
      map: { x: 178, y: 178 }
    },
    'huayuan-rest': {
      glyph: '食', name: '花园小馆', type: '融合餐厅',
      addr: '新康花园 · 淮海中路1273弄3号',
      intro: '老洋房花园里的融合菜餐厅，主打本帮与西餐创意融合，庭院座最受欢迎，夜晚常有驻唱演出。',
      prices: [ ['招牌油爆虾', '¥88'], ['花园蔬菜沙拉', '¥42'], ['红酒慢炖牛腩', '¥128'] ],
      crowdBase: 12, ordersBase: 5, waitBase: 9, status: '排队中',
      ratingBase: { avg: 4.4, n: 132 },
      reviews: [
        { user: '干饭人', stars: 5, text: '油爆虾一绝，庭院座要提前订。' },
        { user: 'Mika', stars: 4, text: '氛围很好，周末排队有点久。' },
        { user: '老周', stars: 4, text: '融合菜有新意，份量略小。' }
      ],
      map: { x: 148, y: 222 }
    },
    'nongtang-cafe': {
      glyph: '啡', name: '弄堂咖啡', type: '咖啡 · 甜品',
      addr: '新康花园 · 淮海中路1273弄14号',
      intro: '藏在花园别墅里的社区咖啡，自烘焙豆子，窗口位能望见音乐广场的演出，咖啡香与歌声一起发酵。',
      prices: [ ['美式', '¥22'], ['燕麦拿铁', '¥30'], ['招牌巴斯克', '¥30'] ],
      crowdBase: 10, ordersBase: 3, waitBase: 5, status: '出餐中',
      ratingBase: { avg: 4.6, n: 89 },
      reviews: [
        { user: '豆子', stars: 5, text: '自烘焙耶加雪菲很干净，窗口位视野绝佳。' },
        { user: 'Lulu', stars: 4, text: '巴斯克好吃，下午人多要等位。' }
      ],
      map: { x: 188, y: 232 }
    }
  },

  /* 编辑模式色板预设 */
  palette: [
    { name: '淡绿', v: '#D9E9D6' },
    { name: '灰白', v: '#F6F6F3' },
    { name: '米白', v: '#F4EFE3' },
    { name: '浅蓝', v: '#DFE9F2' },
    { name: '浅粉', v: '#F5E7E7' },
    { name: '浅黄', v: '#F4EDD6' },
    { name: '公园绿', v: '#D2E8CE' },
    { name: '浅紫', v: '#E9E2F0' }
  ]
};
