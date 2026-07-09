// ==========================================
// 状態管理を一元化
// ==========================================
const state = {
  isBoredToDeath: false,
  mentalGauge: 100,
  isHomeProtocolExecuted: false,
  isBossAlerted: false,
  targetTime: { hours: 17, minutes: 45, seconds: 0 },
  audioCtx: null,          // AudioContext シングルトン保持用
  caffeineTimeoutId: null, // カフェインデバフのタイマーID保持用
  bossDistance: 5.0,       // 上司の初期位置
  
  // --- 実績システム用状態管理 ---
  unlockedAchievements: new Set(),
  caffeineCount: 0
};

// ==========================================
// システム設定値
// ==========================================
const CONFIG = {
  MENTAL: {
    MAX: 100,
    MIN: 0,
    DEFAULT: 100,
    CONSUME_PER_SEC: 1,
    THRESHOLD_WARN: 50,
    THRESHOLD_DANGER: 20,
  },
  BOSS: {
    INITIAL_DISTANCE: 5.0,
    MAX_DISTANCE: 5.0,
    MIN_DISTANCE: 0.1,
    ALERT_DISTANCE: 1.0,
    WARP_DISTANCE: 0.2, // 背後に立つイベント等の強制接近距離
    MOVE_SPEED_MAX: 0.8, // ランダムウォークの最大移動幅
  },
  PROBABILITY: {
    TOILET_EMERGENCY: 0.02, // 突発的大波タイムアタックの確率
    RANDOM_EVENT: 0.30,     // イベント発生の閾値
  },
  LIFEHACK: {
    TOILET_HEAL: 15,
    CAFFEINE_HEAL: 30,
    CAFFEINE_DEBUFF: 40,
    CAFFEINE_DURATION_MS: 5000,
    OSHI_HEAL: 50,
  },
  AUDIO: {
    BEEP_FREQ: 1000,
    BEEP_GAIN: 0.005,
    BEEP_DURATION_SEC: 0.03,
  },
  SPEECH: {
    VOLUME: 0.15,
    RATE: 1.3,
    PITCH: 0.5,
  },
  CONFETTI: {
    COUNT: 100,
    COLORS: ['#f43f5e', '#3b82f6', '#10b981', '#eab308', '#a855f7', '#ff7849']
  }
};

// ==========================================
// 実績マスターデータ定義
// ==========================================
const ACHIEVEMENTS = {
  FIRST_STEP: { title: "【定時への執念】", desc: "定時退勤生存ルーチンを初めて起動した。" },
  SURVIVED: { title: "【完全犯罪（定時ダッシュ）】", desc: "上司の目を盗み、無傷で会社から脱出した。" },
  FORCE_OUT: { title: "【ノー残業のテロリスト】", desc: "定時を待たずに自らPCを閉じて強制脱出した。" },
  CAFFEINE_ADDICT: { title: "【合法トランス状態】", desc: "1回の勤務でエナジードリンクを3回以上キメた。" },
  OSHI_SAVIOR: { title: "【限界オタクの底力】", desc: "メンタル瀕死状態（20以下）から推しの顔だけで生還した。" },
  SANITY_ZERO: { title: "【有給の向こう側】", desc: "メンタルが完全に崩壊し、意識が有給休暇を取得した。" },
  SOCIAL_DEATH: { title: "【尊厳のトワイライト】", desc: "大波タイムアタックに失敗し、社会的に死亡した。" },
  CLOSE_CALL: { title: "【冷や汗の10センチ】", desc: "上司が至近距離（0.2m以下）まで肉薄した。" },
  ALASKA: { title: "【アラスカの旅人】", desc: "エアコンが寒すぎてオフィスで凍えかけた。" },
  SLACK_BOMB: { title: "【スタンプ職人】", desc: "Slackスタンプ爆撃に巻き込まれ通知バッジの精神攻撃を受けた。" },
  VPN_APOCALYPSE: { title: "【サボりの大義名分】", desc: "VPNが死亡し、合法的に業務が完全停止した。" }
};

// ==========================================
// 各種定数データ
// ==========================================
const fakeActions = [
  "FAKE TYPING LOUDLY (キーボードを無駄に強打中)",
  "SCROLLING OUTLOOK INFINITELY (受信トレイをただ往復スクロール中)",
  "HOLDING CHIN INTENSELY (顎に手を当てて「深刻なエラーに悩むプログラマ」を熱演中)",
  "MAKING A SIGH OF CAPABILITY (周囲に聞こえる音量でデキる男風のタメ息を出力中)",
  "BROWSING QIITA VAINLY (技術記事を読んで勉強している雰囲気を周囲に放射中)",
  "ANALYZING BOSS SIGH (隣の席の先輩のタメ息の周波数を解析中。機嫌：警戒)",
  "DEEP THINKING DINNER (今日の晩御飯のおかずについて脳内ディープラーニング中)",
  "MOUSE MOVING RANDOM (デスクトップ上でマウスカーソルを円形に無限周回中)"
];

const fakeWorkSites = [
  "https://itmedia.co.jp",
  "https://stackoverflow.com",
  "https://github.com",
  "https://qiita.com",
  "https://google.com", 
];

// ==========================================
// 社畜ランダムイベントデータ
// ==========================================
const randomEvents = [
{
  text: "📧 CC地獄: メールを開いた瞬間、自分には関係ないと思っていた案件のCC欄に自分の名前が発見されました。胃が沈みます。",
  effect: (s) => { 
    s.mentalGauge = Math.max(CONFIG.MENTAL.MIN, s.mentalGauge - 12); 
  },
  type: 'warn'
},
{
  text: "🍜 帰宅後の希望: 同僚が「今日は絶対定時で帰ってラーメン食べる」と宣言。帰宅欲が限界突破しました。",
  effect: (s) => { 
    s.mentalGauge = Math.min(CONFIG.MENTAL.MAX, s.mentalGauge + 8); 
  },
  type: 'info'
},
{
  text: "📝 議事録指名: 会議終了直前に「誰か議事録お願いできますか？」という魔法の言葉が発動。全員が沈黙しました。",
  effect: (s) => { 
    s.mentalGauge = Math.max(CONFIG.MENTAL.MIN, s.mentalGauge - 18); 
  },
  type: 'error'
},
{
  text: "🎧 ノイズキャンセル発動: 隣席の雑談攻撃に対抗するためヘッドホン装備。世界との接続を遮断しました。",
  effect: (s) => { 
    s.mentalGauge = Math.min(CONFIG.MENTAL.MAX, s.mentalGauge + 12); 
  },
  type: 'info'
},
{
  text: "🕵️ 画面覗き込み疑惑: 後ろを通った上司が一瞬こちらを見た気がしました。即座にExcelを開きました。",
  effect: (s) => { 
    s.bossDistance = Math.max(CONFIG.BOSS.MIN_DISTANCE, s.bossDistance - 0.8);
    s.mentalGauge = Math.max(CONFIG.MENTAL.MIN, s.mentalGauge - 10); 
  },
  type: 'warn'
},
{
  text: "💬 チャット誤爆: 別部署宛てのつもりだったメッセージが自分の上司に送信されていることに気付きました。",
  effect: (s) => { 
    s.mentalGauge = Math.max(CONFIG.MENTAL.MIN, s.mentalGauge - 25); 
  },
  type: 'error'
},
{
  text: "🛗 エレベーター待機: 帰宅しようとした瞬間、エレベーターが各階停止モードになりました。",
  effect: (s) => { 
    s.mentalGauge = Math.max(CONFIG.MENTAL.MIN, s.mentalGauge - 7); 
  },
  type: 'warn'
},
{
  text: "🌅 定時前ミラクル: 隣のチームが全員帰宅準備開始。帰れる空気がフロア全体に発生しました。",
  effect: (s) => { 
    s.mentalGauge = Math.min(CONFIG.MENTAL.MAX, s.mentalGauge + 20); 
  },
  type: 'info'
},
{
  text: "📊 Excel崩壊: 3時間かけた資料のセル結合が全部ズレました。原因は不明です。",
  effect: (s) => { 
    s.mentalGauge = Math.max(CONFIG.MENTAL.MIN, s.mentalGauge - 22); 
  },
  type: 'error'
},
{
  text: "☕ コーヒーマシン故障: 唯一の回復手段である給湯室の機械が沈黙しました。",
  effect: (s) => { 
    s.mentalGauge = Math.max(CONFIG.MENTAL.MIN, s.mentalGauge - 10); 
  },
  type: 'warn'
},
{
  text: "🧘 無我の境地: 仕事をしているフリを極めて何も感じなくなりました。",
  effect: (s) => { 
    s.mentalGauge = Math.min(CONFIG.MENTAL.MAX, s.mentalGauge + 5); 
  },
  type: 'info'
},
{
  text: "📅 明日の予定発覚: カレンダーを確認したら朝イチ会議が入っていました。未来の自分に絶望。",
  effect: (s) => { 
    s.mentalGauge = Math.max(CONFIG.MENTAL.MIN, s.mentalGauge - 15); 
  },
  type: 'warn'
},
{
  text: "🦸 同僚ヒーロー登場: 有能な同僚が「それ自分やりますよ」とタスクを引き受けました。神を見ました。",
  effect: (s) => { 
    s.mentalGauge = Math.min(CONFIG.MENTAL.MAX, s.mentalGauge + 25); 
  },
  type: 'info'
},
{
  text: "🔥 障害対応召喚: 定時前に突然システム障害アラートが鳴りました。世界が終わります。",
  effect: (s) => { 
    s.mentalGauge = Math.max(CONFIG.MENTAL.MIN, s.mentalGauge - 35);
    s.bossDistance = Math.max(CONFIG.BOSS.MIN_DISTANCE, s.bossDistance - 1.0);
  },
  type: 'error'
},
{
  text: "👔 上司の独り言: 「あー、今日終わらないなぁ」という恐怖の発言を検知しました。",
  effect: (s) => { 
    s.bossDistance = Math.max(CONFIG.BOSS.MIN_DISTANCE, s.bossDistance - 1.2);
    s.mentalGauge = Math.max(CONFIG.MENTAL.MIN, s.mentalGauge - 15);
  },
  type: 'error'
},
{
  text: "🎮 帰宅後予定バフ: 家で遊ぶゲームのアップデート完了通知を思い出しました。生きる理由を再確認。",
  effect: (s) => { 
    s.mentalGauge = Math.min(CONFIG.MENTAL.MAX, s.mentalGauge + 15); 
  },
  type: 'info'
},
  {
    text: "⚠️ 突然のメンション: Slackで全体メンション「誰か今動ける方いませんか？」を検知。気配を消します。",
    effect: (s) => { s.mentalGauge = Math.max(CONFIG.MENTAL.MIN, s.mentalGauge - 15); },
    type: 'warn'
  },
  {
    text: "🚨 予期せぬエラー: 開発環境が謎のエラーを吐き出しました。胃がキュッとなりました。",
    effect: (s) => { s.mentalGauge = Math.max(CONFIG.MENTAL.MIN, s.mentalGauge - 20); },
    type: 'error'
  },
  {
    text: "📞 内線電話: 隣の席の電話が鳴り響いています。頼むから取ってくれと心の中で祈祷中。",
    effect: (s) => { s.mentalGauge = Math.max(CONFIG.MENTAL.MIN, s.mentalGauge - 10); },
    type: 'warn'
  },
  {
    text: "🍡 差し入れ: 同僚から謎の海外土産（謎の激甘クッキー）を配られました。咀嚼で時間を稼ぎます。",
    effect: (s) => { s.mentalGauge = Math.min(CONFIG.MENTAL.MAX, s.mentalGauge + 10); },
    type: 'info'
  },
  {
    text: "👣 足音の幻聴: 廊下から上司の足音が聞こえた気がして背筋が伸びました（空振り）。",
    effect: (s) => { s.mentalGauge = Math.max(CONFIG.MENTAL.MIN, s.mentalGauge - 5); },
    type: 'warn'
  },
  {
    text: "💬 同僚の離脱: 隣の席のプロが生々しいタメ息と共に「お先に失礼します」と定時ダッシュを決めて嫉妬で脳が焼かれます。",
    effect: (s) => { s.mentalGauge = Math.max(CONFIG.MENTAL.MIN, s.mentalGauge - 25); },
    type: 'error'
  },
  {
    text: "☕️ 奇跡の平穏: 部署全体が静寂に包まれました。完全にエアポケットです。無になります。",
    effect: (s) => { s.mentalGauge = Math.min(CONFIG.MENTAL.MAX, s.mentalGauge + 5); },
    type: 'info'
  },
  {
    text: "👹 悪魔の囁き: 上司が「あ、そういえばさ…」と誰かに話しかける声を感知！警戒レベルMAX！",
    effect: (s) => { s.bossDistance = Math.max(CONFIG.BOSS.MIN_DISTANCE, s.bossDistance - 1.5); }, 
    type: 'error'
  },
  {
    text: "💻 Windows Update: 『更新プログラムを構成しています。』このタイミングで強制再起動の恐怖が脳裏をよぎる！",
    effect: (s) => { s.mentalGauge = Math.max(CONFIG.MENTAL.MIN, s.mentalGauge - 15); },
    type: 'error'
  },
  {
    text: "👥 雑談の巻き込み: 隣のチームが週末の予定について盛り上がっています。話を振られないよう「クソデカため息」でバリアを展開。",
    effect: (s) => { s.mentalGauge = Math.max(CONFIG.MENTAL.MIN, s.mentalGauge - 8); },
    type: 'warn'
  },
  {
    text: "👀 視線感知: 斜め後ろの席の先輩がコチラの画面を見つめている気がする。Qiitaのタブをそっと閉じた。",
    effect: (s) => { s.mentalGauge = Math.max(CONFIG.MENTAL.MIN, s.mentalGauge - 12); },
    type: 'warn'
  },
  {
    text: "🍫 秘密の備蓄: 引き出しの奥から賞味期限が3ヶ月切れたチョコを発見。背に腹は代えられないので摂取！",
    effect: (s) => { s.mentalGauge = Math.min(CONFIG.MENTAL.MAX, s.mentalGauge + 15); },
    type: 'info'
  },
  {
    text: "👻 背後に立つ者: 【怪奇現象】気配がしたと思ったら、上司が真後ろで別の同僚と話し始めた！心臓が跳ね上がる！",
    effect: (s) => { 
      s.bossDistance = CONFIG.BOSS.WARP_DISTANCE; 
      s.mentalGauge = Math.max(CONFIG.MENTAL.MIN, s.mentalGauge - 30);
    },
    type: 'error'
  },
  {
    text: "⏳ Teams会議延長: 「最後もう1点だけ…」からが本番。定時間際の不毛な議論で虚無の時間を過ごす。",
    effect: (s) => { s.mentalGauge = Math.max(CONFIG.MENTAL.MIN, s.mentalGauge - 18); },
    type: 'error'
  },
  {
    text: "💥 Outlook爆発: 全社宛ての誤送信スレッドに「各位、返信の全体送信をやめてください」という全体返信が連鎖しメールボックスが機能停止。",
    effect: (s) => { s.mentalGauge = Math.max(CONFIG.MENTAL.MIN, s.mentalGauge - 15); },
    type: 'error'
  },
  {
    text: "⚠️ コピー機詰まり: 自分の直前で「紙詰まり：複合機内部のレバーA1を開けてください」の絶望表示。なぜ自分が直さねばならんのか。",
    effect: (s) => { s.mentalGauge = Math.max(CONFIG.MENTAL.MIN, s.mentalGauge - 10); },
    type: 'warn'
  },
  {
    text: "🥱 謎の朝礼: 連絡事項ゼロ。「今週も折り返しですが気合を入れていきましょう」という精神論だけを浴びる儀式。",
    effect: (s) => { s.mentalGauge = Math.max(CONFIG.MENTAL.MIN, s.mentalGauge - 12); },
    type: 'warn'
  },
  {
    text: "👁‍局 部長巡回: 腕を後ろで組みながらフロアを鋭い眼光で練り歩くボスを検知！強制的に間合いを詰められます！",
    effect: (s) => { 
      s.bossDistance = Math.max(CONFIG.BOSS.MIN_DISTANCE, s.bossDistance - 2.0); 
      s.mentalGauge = Math.max(CONFIG.MENTAL.MIN, s.mentalGauge - 10);
    },
    type: 'error'
  },
  {
    text: "🔊 隣がオンライン会議: 隣の席の同僚がノーヘッドセットで大声ミーティングを開始。「はい！弊社といたしましては！」が脳を直撃。",
    effect: (s) => { s.mentalGauge = Math.max(CONFIG.MENTAL.MIN, s.mentalGauge - 14); },
    type: 'warn'
  },
  {
    text: "🥶 エアコン寒すぎ: オフィスの室温が局所的にアラスカ（22度設定）に。指先が冷えてキーボードの打鍵速度が低下中。",
    effect: (s) => { 
      s.mentalGauge = Math.max(CONFIG.MENTAL.MIN, s.mentalGauge - 8); 
      unlockAchievement('ALASKA');
    },
    type: 'warn'
  },
  {
    text: "☠️ VPN死亡: 「リモートホストへの接続が切断されました」。社内システムへのアクセスが全滅し何もできなくなりました（手遅れ）。",
    effect: (s) => { 
      s.mentalGauge = Math.max(CONFIG.MENTAL.MIN, s.mentalGauge - 25); 
      unlockAchievement('VPN_APOCALYPSE');
    },
    type: 'error'
  },
  {
    text: "🖨 プリンタ故障: 印刷ジョブが無限に『スプール中』のまま静止。背後に次の順番を待つ人のプレッシャーを感じる。",
    effect: (s) => { s.mentalGauge = Math.max(CONFIG.MENTAL.MIN, s.mentalGauge - 11); },
    type: 'warn'
  },
  {
    text: "💣 Slackスタンプ爆撃: チャンネル内で謎のスタンプ大喜利が勃変。通知の赤いバッジ（数字）が狂ったように増えていく恐怖。",
    effect: (s) => { 
      s.mentalGauge = Math.max(CONFIG.MENTAL.MIN, s.mentalGauge - 7); 
      unlockAchievement('SLACK_BOMB');
    },
    type: 'info'
  }
];

// ==========================================
// イベントリスナー初期化
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
  const registerClick = (id, fn) => document.getElementById(id)?.addEventListener('click', fn);
  
  registerClick('btn-start', startRoutine);
  registerClick('btn-escape', forceEscape);
  registerClick('btn-toilet', useToilet);
  registerClick('btn-cafe', useCaffeine);
  registerClick('btn-oshi', watchOshi);

  toggleLifehackButtons(false);

  // マスターから実績の総数を割り出してHTMLに注入
  const totalAchievements = Object.keys(ACHIEVEMENTS).length;
  setTargetText('achieve-total', totalAchievements);

  // ポップアップ起動時に、過去の保存データを自動ロード
  loadSavedAchievements();
});

// ==========================================
// UI・ログ制御用ヘルパー関数
// ==========================================
function setTargetText(id, text) {
  const el = document.getElementById(id);
  if (el) el.innerText = text;
}

function appendLog(text, type = 'info') {
  const logArea = document.getElementById('log-area');
  if (!logArea) return;
  const now = new Date().toLocaleTimeString();
  let color = '#a7f3d0';
  if (type === 'warn') color = '#fbcfe8';
  if (type === 'error') color = '#fca5a5';
  if (type === 'achievement') color = '#fef08a'; 

  const logRow = document.createElement('div');
  logRow.style.color = color;
  logRow.textContent = `[${now}] ${text}`;

  logArea.appendChild(logRow);
  logArea.scrollTop = logArea.scrollHeight;
}

function toggleLifehackButtons(enabled) {
  ['btn-toilet', 'btn-cafe', 'btn-oshi'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.disabled = !enabled;
  });
}

function updateMentalUI() {
  const mentalEl = document.getElementById('mental');
  if (!mentalEl) return;
  mentalEl.innerText = state.mentalGauge;

  const gaugeMental = document.getElementById('gauge-mental');
  if (gaugeMental) gaugeMental.value = state.mentalGauge;

  if (state.mentalGauge > CONFIG.MENTAL.THRESHOLD_WARN) mentalEl.style.color = '#fbbf24';
  else if (state.mentalGauge > CONFIG.MENTAL.THRESHOLD_DANGER) mentalEl.style.color = '#f97316';
  else mentalEl.style.color = '#ef4444';
}

// ==========================================
// コアロジック（ルーチン制御）
// ==========================================
function startRoutine() {
  if (state.isBoredToDeath) return;

  const timeInput = document.getElementById('input-target-time')?.value;
  if (timeInput) {
    const [hours, minutes] = timeInput.split(':').map(Number);
    state.targetTime.hours = hours;
    state.targetTime.minutes = minutes;
    state.targetTime.seconds = 0;
  }

  state.isBoredToDeath = true;
  state.isHomeProtocolExecuted = false;
  state.isBossAlerted = false;
  state.bossDistance = CONFIG.BOSS.INITIAL_DISTANCE;
  state.mentalGauge = CONFIG.MENTAL.DEFAULT;
  state.caffeineCount = 0; 
  updateMentalUI();
  
  const btnStart = document.getElementById('btn-start');
  const inputTime = document.getElementById('input-target-time');
  if (btnStart) btnStart.disabled = true;
  if (inputTime) inputTime.disabled = true;

  toggleLifehackButtons(true);
  setTargetText('status', 'WAITING_FOR_TEIJI');

  const hStr = String(state.targetTime.hours).padStart(2, '0');
  const mStr = String(state.targetTime.minutes).padStart(2, '0');
  appendLog(`[SYSTEM] 定時退勤生存ルーチンを開始。ターゲット：${hStr}:${mStr} 脱出`);
  
  unlockAchievement('FIRST_STEP');

  loop();
}

// ==========================================
// メインループ
// ==========================================
async function loop() {
  while (state.isBoredToDeath) {
    const now = new Date();
    const currentTime = { hours: now.getHours(), minutes: now.getMinutes(), seconds: now.getSeconds() };
    
    const step = (Math.random() * CONFIG.BOSS.MOVE_SPEED_MAX) - (CONFIG.BOSS.MOVE_SPEED_MAX / 2); 
    state.bossDistance = Math.min(CONFIG.BOSS.MAX_DISTANCE, Math.max(CONFIG.BOSS.MIN_DISTANCE, state.bossDistance + step));
    
    const bossDistStr = state.bossDistance.toFixed(1);
    setTargetText('distance', bossDistStr + 'm');

    const gaugeDist = document.getElementById('gauge-distance');
    if (gaugeDist) gaugeDist.value = state.bossDistance;

    if (state.bossDistance <= 0.2) {
      unlockAchievement('CLOSE_CALL');
    }

    if (state.bossDistance < CONFIG.BOSS.ALERT_DISTANCE) {
      document.querySelector('.container')?.classList.add('danger-zone');
      speakWhisper("ヤバい、ヤバい");

      if (!state.isBossAlerted) {
        state.isBossAlerted = true;
        appendLog(`💥 警告: 上司接近！（現在値: ${bossDistStr}m）『奴が来たーー！』`, 'warn');
        appendLog("[SYSTEM] EMERGENCY MODE: FAKE DEEP THINKING STARTED.", 'error');

        const randomUrl = fakeWorkSites[Math.floor(Math.random() * fakeWorkSites.length)];
        if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
          chrome.runtime.sendMessage({ action: "openWorkSite", url: randomUrl });
        }
      }
    } else {
      if (state.isBossAlerted) {
        appendLog(`🍃 状況報告: 奴が離れていきました（現在値: ${bossDistStr}m）。偽装を一時解除します。`);
        state.isBossAlerted = false;
        document.querySelector('.container')?.classList.remove('danger-zone');
      }

      const rng = Math.random();
      
      if (rng < CONFIG.PROBABILITY.TOILET_EMERGENCY) {
        appendLog("🚨 【緊急事態】お腹に突発的な『大波』を検知！！3秒以内にトイレに駆け込まないと社会的に死亡します！！", 'error');
        
        const currentMentalBeforeWave = state.mentalGauge;
        await new Promise(r => setTimeout(r, 3000));
        
        if (state.isBoredToDeath && state.mentalGauge <= currentMentalBeforeWave) {
          setTargetText('status', 'SOCIAL_DEATH');
          appendLog("[FATAL] 間に合いませんでした。エンジニアとしての尊厳が消滅しました。", 'error');
          unlockAchievement('SOCIAL_DEATH'); 
          shutdownSystem();
          setTimeout(() => alert("社会的に死亡しました。着替えを持ってきてください。"), 100);
          break;
        }
      } 
      else if (rng < CONFIG.PROBABILITY.RANDOM_EVENT) {
        const ev = randomEvents[Math.floor(Math.random() * randomEvents.length)];
        appendLog(`[EVENT] ${ev.text}`, ev.type);
        ev.effect(state); 
        updateMentalUI(); 
      } 
      else {
        const randomAction = fakeActions[Math.floor(Math.random() * fakeActions.length)];
        appendLog(`STATUS: ACTIVE... [ACTION] ${randomAction}`);
      }
      playBeep();
    }

    if (checkTimeReached(currentTime, state.targetTime) && !state.isHomeProtocolExecuted) {
      state.isHomeProtocolExecuted = true;
      appendLog("[SYSTEM] EVADING_ALL_OVERTIME 【定時ダッシュ！】");
      appendLog("[SYSTEM] *PSHUT!* 🍺 (ぷはぁ)");
      appendLog(`"BYE BYE COMPANY! お先に失礼します！(^-^)"`);
      setTargetText('status', 'HOME_SAFE');
      
      unlockAchievement('SURVIVED'); 
      launchConfetti();
      shutdownSystem();
      break;
    }

    consumeMental(CONFIG.MENTAL.CONSUME_PER_SEC);
    
    if (!state.isBoredToDeath) break;
    await new Promise(r => setTimeout(r, 1000));
  }
}

function consumeMental(amount) {
  state.mentalGauge = Math.max(CONFIG.MENTAL.MIN, state.mentalGauge - amount);
  updateMentalUI();

  if (state.mentalGauge <= CONFIG.MENTAL.MIN) {
    setTargetText('status', 'CRASHED');
    appendLog("[FATAL] 精神的サーバーダウン。限界です。意識が有給休暇を取得しました。", 'error');
    unlockAchievement('SANITY_ZERO'); 
    shutdownSystem();
    setTimeout(() => {
      alert("メンタルが崩壊しました！今すぐ有給を申請してください！");
    }, 100);
  }
}

function shutdownSystem() {
  state.isBoredToDeath = false;
  document.querySelector('.container')?.classList.remove('danger-zone');
  window.speechSynthesis.cancel(); 
  
  const btnStart = document.getElementById('btn-start');
  const inputTime = document.getElementById('input-target-time');
  if (btnStart) btnStart.disabled = false;
  if (inputTime) inputTime.disabled = false;
  
  toggleLifehackButtons(false);

  if (state.caffeineTimeoutId) {
    clearTimeout(state.caffeineTimeoutId);
    state.caffeineTimeoutId = null;
  }

  if (state.audioCtx) {
    if (state.audioCtx.state !== 'closed') {
      state.audioCtx.close().catch(err => {
        console.error("AudioContext close error:", err);
      });
    }
    state.audioCtx = null; 
  }
}

// ==========================================
// ライフハック（回復コマンド）
// ==========================================
function useToilet() {
  if (!state.isBoredToDeath) return;
  state.mentalGauge = Math.min(CONFIG.MENTAL.MAX, state.mentalGauge + CONFIG.LIFEHACK.TOILET_HEAL);
  updateMentalUI();
  appendLog(`[LIFEHACK] 個室トイレに避難完了。個人の尊厳を一時的に回復 (+${CONFIG.LIFEHACK.TOILET_HEAL})`, 'warn');
}

function useCaffeine() {
  if (!state.isBoredToDeath) return;
  state.mentalGauge = Math.min(CONFIG.MENTAL.MAX, state.mentalGauge + CONFIG.LIFEHACK.CAFFEINE_HEAL);
  updateMentalUI();
  appendLog(`[LIFEHACK] エナジードリンクをキメました。脳を強制駆動 (+${CONFIG.LIFEHACK.CAFFEINE_HEAL})`, 'warn');

  state.caffeineCount++;
  if (state.caffeineCount >= 3) {
    unlockAchievement('CAFFEINE_ADDICT');
  }

  if (state.caffeineTimeoutId) clearTimeout(state.caffeineTimeoutId);

  state.caffeineTimeoutId = setTimeout(() => {
    if (state.isBoredToDeath) {
      appendLog(`[DEBUFF] カフェインの加護が終了。猛烈な反動が脳を襲う (-${CONFIG.LIFEHACK.CAFFEINE_DEBUFF})`, 'error');
      consumeMental(CONFIG.LIFEHACK.CAFFEINE_DEBUFF);
    }
  }, CONFIG.LIFEHACK.CAFFEINE_DURATION_MS);
}

function watchOshi() {
  if (!state.isBoredToDeath) return;

  if (state.mentalGauge <= 20) {
    unlockAchievement('OSHI_SAVIOR');
  }

  state.mentalGauge = Math.min(CONFIG.MENTAL.MAX, state.mentalGauge + CONFIG.LIFEHACK.OSHI_HEAL);
  updateMentalUI();
  appendLog(`[LIFEHACK] 推しの画像を0.5秒凝視。尊さにより生命力が爆増 (+${CONFIG.LIFEHACK.OSHI_HEAL})`, 'warn');
}

// ==========================================
// サウンド・その他補助関数
// ==========================================
function playBeep() {
  if (!state.audioCtx) {
    state.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (state.audioCtx.state === 'suspended') {
    state.audioCtx.resume();
  }

  const osc = state.audioCtx.createOscillator();
  const gain = state.audioCtx.createGain();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(CONFIG.AUDIO.BEEP_FREQ, state.audioCtx.currentTime);
  gain.gain.setValueAtTime(CONFIG.AUDIO.BEEP_GAIN, state.audioCtx.currentTime);

  osc.connect(gain);
  gain.connect(state.audioCtx.destination);

  osc.start();
  osc.stop(state.audioCtx.currentTime + CONFIG.AUDIO.BEEP_DURATION_SEC);

  setTimeout(() => {
    osc.disconnect();
    gain.disconnect();
  }, 100);
}

function forceEscape() {
  unlockAchievement('FORCE_OUT'); 
  shutdownSystem();
  setTargetText('status', 'FORCE_QUITTED');
  appendLog("[SYSTEM] 偽装を解除。定時を待たずに脱出します！", 'error');
  setTimeout(() => {
    alert("お疲れ様でした！今すぐPCを閉じて帰りましょう！");
  }, 100);
}

function checkTimeReached(now, target) {
  return (now.hours > target.hours) ||
    (now.hours === target.hours && now.minutes > target.minutes) ||
    (now.hours === target.hours && now.minutes === target.minutes && now.seconds >= target.seconds);
}

function speakWhisper(text) {
  if (window.speechSynthesis.speaking) return;

  const uttr = new SpeechSynthesisUtterance(text);
  uttr.lang = 'ja-JP';
  uttr.volume = CONFIG.SPEECH.VOLUME; 
  uttr.rate = CONFIG.SPEECH.RATE;    
  uttr.pitch = CONFIG.SPEECH.PITCH;   

  window.speechSynthesis.speak(uttr);
}

function launchConfetti() {
  for (let i = 0; i < CONFIG.CONFETTI.COUNT; i++) {
    const confetti = document.createElement('div');
    confetti.classList.add('confetti');

    confetti.style.left = Math.random() * 100 + 'vw';
    confetti.style.backgroundColor = CONFIG.CONFETTI.COLORS[Math.floor(Math.random() * CONFIG.CONFETTI.COLORS.length)];
    
    const size = Math.random() * 8 + 6; 
    confetti.style.width = `${size}px`;
    confetti.style.height = `${size}px`;

    confetti.style.animationDuration = Math.random() * 2 + 2 + 's'; 
    confetti.style.animationDelay = Math.random() * 0.5 + 's';
    confetti.style.setProperty('--x-drift', (Math.random() * 200 - 100) + 'px'); 

    document.body.appendChild(confetti);

    confetti.addEventListener('animationend', () => {
      confetti.remove();
    });
  }
}

// ==========================================
// 💾 ストレージ操作関数
// ==========================================
// 新しい実績をローカルストレージにセーブする
function saveAchievements() {
  if (typeof chrome !== 'undefined' && chrome.storage?.local) {
    // Set型のデータは直接保存できないため、配列に変換して保存
    const listToSave = Array.from(state.unlockedAchievements);
    chrome.storage.local.set({ savedAchievements: listToSave });
  }
}

// 過去の実績をローカルストレージからロードして画面を構築する
function loadSavedAchievements() {
  if (typeof chrome !== 'undefined' && chrome.storage?.local) {
    chrome.storage.local.get(['savedAchievements'], (result) => {
      if (result.savedAchievements && Array.from(result.savedAchievements).length > 0) {
        const listEl = document.getElementById('achievement-list');
        if (listEl) listEl.textContent = ''; // 「(未解除)」を全消去

        result.savedAchievements.forEach(id => {
          if (ACHIEVEMENTS[id]) {
            state.unlockedAchievements.add(id);
            
            // DOM構築で実績リストに復元追加
            const itemEl = document.createElement('div');
            itemEl.textContent = `🏅 ${ACHIEVEMENTS[id].title} - ${ACHIEVEMENTS[id].desc}`;
            listEl.appendChild(itemEl);
          }
        });

        // 獲得数のUIに反映
        setTargetText('achieve-count', state.unlockedAchievements.size);
      }
    });
  }
}

// ==========================================
// 実績解除トリガー＆HTMLリアルタイム更新関数
// ==========================================
function unlockAchievement(id) {
  if (!ACHIEVEMENTS[id] || state.unlockedAchievements.has(id)) return;
  
  state.unlockedAchievements.add(id);
  const a = ACHIEVEMENTS[id];
  
  // 変更をストレージに即座に自動保存（セーブ）
  saveAchievements();

  // ログエリアへのログ出力
  appendLog(`🌟⭐【実績解除 / ACHIEVEMENT UNLOCKED】⭐🌟`, 'achievement');
  appendLog(`${a.title} : ${a.desc}`, 'achievement');
  appendLog(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`, 'achievement');

  // HTML側の「現在解除数」をリアルタイム更新
  setTargetText('achieve-count', state.unlockedAchievements.size);

  const listEl = document.getElementById('achievement-list');
  if (listEl) {
    if (state.unlockedAchievements.size === 1) {
      listEl.textContent = ''; // 最初の1つ目を獲得した時は「(未解除)」テキストを全消去
    }
    
    // div要素を作ってテキストを安全に流し込む（XSS・バグ防止）
    const itemEl = document.createElement('div');
    itemEl.textContent = `🏅 ${a.title} - ${a.desc}`;
    
    listEl.appendChild(itemEl);
    listEl.scrollTop = listEl.scrollHeight; // 自動スクロール
  }
}
