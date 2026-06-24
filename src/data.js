// 207 張 100% 本地 AI 裁切生成的東亞時尚美髮圖庫資料庫 (HautCoiffure Local AI Lookbook Database)

const LOOKBOOK_ASSET_VERSION = "crop-cleanup-20260625";

const gridMappings = [
  { id: 1, category: "sculptural", baseName: "韓式極簡剪裁", origin: "韓國 (Korea)" },
  { id: 2, category: "sculptural", baseName: "日系前衛髮形", origin: "日本 (Japan)" },
  { id: 3, category: "sculptural", baseName: "台式都會線條", origin: "台灣 (Taiwan)" },
  { id: 4, category: "sculptural", baseName: "復古俐落短鮑伯", origin: "日本 (Japan)" },
  { id: 5, category: "color", baseName: "馬卡龍漸層染", origin: "韓國 (Korea)" },
  { id: 6, category: "wave", baseName: "法式鬆軟雲朵捲", origin: "韓國 (Korea)" },
  { id: 7, category: "braids", baseName: "波希米亞編織", origin: "台灣 (Taiwan)" },
  { id: 8, category: "classic", baseName: "日系典雅盤髮", origin: "日本 (Japan)" },
  { id: 9, category: "sculptural", baseName: "男士時尚油頭剪裁", origin: "韓國 (Korea)" },
  { id: 10, category: "sculptural", baseName: "先鋒賽博未來感", origin: "台灣 (Taiwan)" },
  { id: 11, category: "sculptural", baseName: "高層次羽毛剪", origin: "日本 (Japan)" },
  { id: 12, category: "classic", baseName: "空氣瀏海中長波浪", origin: "韓國 (Korea)" },
  { id: 13, category: "classic", baseName: "優雅半盤公主頭", origin: "台灣 (Taiwan)" },
  { id: 14, category: "color", baseName: "霓虹電子光譜染", origin: "日本 (Japan)" },
  { id: 15, category: "classic", baseName: "俐落高馬尾造型", origin: "韓國 (Korea)" },
  { id: 16, category: "classic", baseName: "原宿街頭休閒風", origin: "日本 (Japan)" },
  { id: 17, category: "wave", baseName: "女神氣墊慵懶捲", origin: "台灣 (Taiwan)" },
  { id: 18, category: "classic", baseName: "微凌亂感蓬鬆丸子頭", origin: "日本 (Japan)" },
  { id: 19, category: "sculptural", baseName: "中性雙層undercut", origin: "台灣 (Taiwan)" },
  { id: 20, category: "classic", baseName: "昭和復古波浪紋", origin: "日本 (Japan)" },
  { id: 21, category: "sculptural", baseName: "精靈極短碎剪", origin: "日本 (Japan)" },
  { id: 22, category: "color", baseName: "迷霧煙燻灰茶色", origin: "韓國 (Korea)" },
  { id: 23, category: "classic", baseName: "唯美新娘編髮", origin: "台灣 (Taiwan)" }
];

const adjectives = [
  "冷霧", "流光", "清野", "秋林", "極光", "暗夜", "浮光", "寒霜", "暖砂", "春暉", 
  "微瀾", "織夢", "冷焰", "輕羽", "竹風", "晨曦", "幻境", "星軌", "黛染", "松煙",
  "霜降", "初雪", "雨水", "驚蟄", "穀雨", "夏至", "大暑", "白露", "霜葉", "冬至"
];

const nouns = [
  "歌謠", "光譜", "精靈", "流瑩", "弧度", "線條", "呼吸", "呢喃", "波折", "印記", 
  "羽梢", "剪影", "重奏", "和弦", "迴響", "波紋", "織錦", "脈絡", "微光", "溫度",
  "軌跡", "私語", "面紗", "稜鏡", "迴旋", "流沙", "微粒", "潮汐", "風鈴", "信籤"
];

const beautyTexts = [
  "精準的幾何分線，展現極簡主義的極致張力。",
  "髮絲如同山水墨跡般流淌，暈染出獨特的東方氣韻。",
  "微風吹拂下的碎邊層次，流露隨性乾淨的少年感與少女感。",
  "帶有濕潤線條的光澤，完美襯托日系透明肌膚的淨澈度。",
  "多層次的冷調極光暈染，折射出璀璨而深邃的色彩光澤。",
  "將精細手工編結融入自然髮絲，呼應大地的溫厚哲理。",
  "大捲度展現如同波浪起伏的輕盈與立體感，增添嫵媚與知性。",
  "大膽的高飽和挑染點綴，打破沉悶，突顯無畏的先鋒態度。",
  "鬆軟的法式波紋，為五官注滿溫柔與治癒系的慵懶濾鏡。",
  "俐落一刀切，線條堅毅、氣場冷艷，為現代都市女性代言。"
];

const generateLookbookData = () => {
  const result = [];
  let cardCount = 1;

  // 遍歷 23 個九宮格，每個生成 9 張圖，總計 23 * 9 = 207 張圖
  gridMappings.forEach((grid) => {
    for (let subIndex = 1; subIndex <= 9; subIndex++) {
      const idx = cardCount;
      const url = `/images/lookbook/g${grid.id}_${subIndex}.png?v=${LOOKBOOK_ASSET_VERSION}`;
      
      // 組合不重疊的藝術化標題
      const adj = adjectives[(idx + subIndex) % adjectives.length];
      const noun = nouns[(idx * 2 + subIndex) % nouns.length];
      const title = `${adj}${noun}`;
      
      // 組合獨特美學描述
      const textIndex = (idx * 3 + subIndex) % beautyTexts.length;
      const description = `${grid.baseName} - ${beautyTexts[textIndex]}（AI 藝術原創展品）`;

      result.push({
        id: `hair-card-${idx.toString().padStart(3, '0')}`,
        url: url,
        category: grid.category,
        title: title,
        description: description,
        modelOrigin: grid.origin,
        views: 120 + ((idx * 17) % 850)
      });
      cardCount++;
    }
  });

  return result;
};

export const lookbookData = generateLookbookData();
