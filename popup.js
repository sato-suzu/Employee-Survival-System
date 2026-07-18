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
  caffeineStack: 0,        // エナドリのカフェイン蓄積数
  bossDistance: 5.0,       // 上司の初期位置
  isMuted: false,          // ミュート状態管理

  // --- 実績システム用状態管理 ---
  unlockedAchievements: new Set(),

  // --- トイレ用の状態管理 ---
  isToiletEmergency: false, 
  toiletCountdown: 0,       // 残り秒数をメインループと完全同期

  // --- ループ多重起動防止 ---
  loopRunning: false,

  // --- 統計カウンター ---
  totalEventsEncountered: 0,
  totalFakeActionsExecuted: 0,
  totalCaffeineConsumedMl: 0,
  totalToiletEscapes: 0
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
    WARP_DISTANCE: 0.2, 
    MOVE_SPEED_MAX: 0.8, 
  },
  PROBABILITY: {
    TOILET_EMERGENCY: 0.02, 
    RANDOM_EVENT: 0.30,     
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
  },
  LOG: {
    MAX_DISPLAY_ROWS: 300 
  }
};

// ==========================================
// IndexedDB ログ永続化管理クラス
// ==========================================
/**
 * アプリケーションのログをIndexedDBに永続化するための管理クラス
 */
class LogDatabase {
  constructor() {
    /** @type {string} データベース名 */
    this.dbName = "SlackerRoutineDB";
    /** @type {string} オブジェクトストア（テーブル）名 */
    this.storeName = "logs";
    /** @type {IDBDatabase|null} 接続済みのDBインスタンス */
    this.db = null;
  }

  /**
   * データベースを初期化し、接続を確立する
   * @returns {Promise<void>} 初期化完了時にresolveされるPromise
   */
  init() {
    return new Promise((resolve, reject) => {
      // データベースをバージョン1でオープン
      const request = indexedDB.open(this.dbName, 1);

      // データベースが新規作成、またはバージョンアップされた場合の処理
      request.onupgradeneeded = (e) => {
        const db = e.target.result;
        // ストアが存在しない場合のみ新規作成（idを自動インクリメントの主キーに設定）
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName, { keyPath: "id", autoIncrement: true });
        }
      };

      // データベース接続成功時
      request.onsuccess = (e) => {
        this.db = e.target.result;
        resolve();
      };

      // データベース接続失敗時
      request.onerror = (e) => {
        console.error("IndexedDB initialization failed:", e.target.error);
        reject(e.target.error);
      };
    });
  }

  /**
   * ログをデータベースに保存する
   * @param {string} text - ログの本文
   * @param {string} type - ログの種類（例: "info", "error", "debug" など）
   * @returns {Promise<void>} 保存処理終了時にresolveされるPromise（成否に関わらずresolveする）
   */
  saveLog(text, type) {
    // DBが初期化されていない場合は、何もせず処理を抜ける
    if (!this.db) return Promise.resolve();

    return new Promise((resolve) => {
      // 読み書きモードでトランザクションを開始
      const transaction = this.db.transaction([this.storeName], "readwrite");
      const store = transaction.objectStore(this.storeName);

      // 保存するログデータのオブジェクトを作成
      const logEntry = {
        timestamp: Date.now(), // 現在のタイムスタンプ（ミリ秒）
        text: text,
        type: type
      };

      // オブジェクトストアにデータを追加
      const request = store.add(logEntry);
      
      // アプリの主処理をブロックしないよう、成否（success/error）に関わらずPromiseを解決(resolve)
      request.onsuccess = () => resolve();
      request.onerror = () => resolve();
    });
  }
}

// グローバルまたはモジュール内で利用するインスタンスを作成
const logDB = new LogDatabase();

// ==========================================
// 音声合成管理（Web Speech API 共通化クラス）
// ==========================================
// ==========================================
// 音声合成管理（Web Speech API 共通化クラス）
// ==========================================
/**
 * Web Speech API を用いて、テキストの音声読み上げをキュー管理するクラス
 */
class WhisperManager {
  /**
   * @param {Object} config - 音声設定オブジェクト
   * @param {number} config.VOLUME - 音量 (0.0 ～ 1.0)
   * @param {number} config.RATE - 読み上げ速度 (0.1 ～ 10.0)
   * @param {number} config.PITCH - 音の高さ (0.0 ～ 2.0)
   */
  constructor(config) {
    this.config = config;
    /** @type {Promise<void>} 発話タスクを順番に実行するためのPromiseチェーン（キュー） */
    this.queue = Promise.resolve();
  }

  /**
   * 指定されたテキストを音声で読み上げる（複数実行時はキューに積まれ、順番に再生）
   * @param {string} text - 読み上げるテキスト
   * @returns {Promise<void>} 該当テキストの発話（またはスキップ）が完了したときにresolveされるPromise
   */
  speak(text) {
    // 【ガード句】ミュート中、または退屈（特定条件）していない場合は再生せずに終了
    // ※ 外部スコープの `state` オブジェクトを参照
    if (state.isMuted || !state.isBoredToDeath) return Promise.resolve();

    // 既存のキュー（Promise）に次の発話処理をチェーニングする
    this.queue = this.queue.then(() => {
      return new Promise((resolve) => {
        // 発話オブジェクトの生成とパラメータ設定
        const uttr = new SpeechSynthesisUtterance(text);
        uttr.lang = 'ja-JP';
        uttr.volume = this.config.VOLUME;
        uttr.rate = this.config.RATE;
        uttr.pitch = this.config.PITCH;

        // 再生終了時、またはエラー発生時、次のキューへ進めるためにPromiseを解決(resolve)
        uttr.onend = () => resolve();
        uttr.onerror = () => resolve();

        // ブラウザに発話を実行させる
        window.speechSynthesis.speak(uttr);
      });
    });

    return this.queue;
  }

  /**
   * 現在再生中の音声をすべて強制停止し、待機中の発話キューもクリアする
   */
  stopAll() {
    // ブラウザの音声合成を即座にキャンセル
    window.speechSynthesis.cancel();
    // キュー（Promiseチェーン）を初期状態にリセット
    this.queue = Promise.resolve();
  }
}

// 共通設定（CONFIG.SPEECH）を渡してインスタンス化
const whisper = new WhisperManager(CONFIG.SPEECH);


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
  VPN_APOCALYPSE: { title: "【サボりの大義名分】", desc: "VPNが死亡し、合法的に業務が完全停止した。" },
  OVERDOSE: { title: "【心臓バクバク丸】", desc: "短時間にカフェインを過剰摂取し、時を止めかけた。" },
  GOD_TYPIST: { title: "【打鍵音の魔術師】", desc: "意味のない高速タイピングにより周囲を圧倒した。" },
  LEGEND_SLACKER: { title: "【最強の不労所得】", desc: "全く仕事をしないまま定時を迎える極致に達した。" }
};

// ==========================================
// 【共通化】メンタル変動＆UI更新関数
// ==========================================
function modifyMental(amount) {
  if (amount > 0) {
    state.mentalGauge = Math.min(CONFIG.MENTAL.MAX, state.mentalGauge + amount);
  } else {
    state.mentalGauge = Math.max(CONFIG.MENTAL.MIN, state.mentalGauge + amount);
  }
  updateMentalUI();
  return state.mentalGauge;
}

// ==========================================
// 偽装アクション
// ==========================================
const fakeActions = [
  "FAKE TYPING LOUDLY (キーボードを無駄に強打中)",
  "SCROLLING OUTLOOK INFINITELY (受信トレイをただ往復スクロール中)",
  "HOLDING CHIN INTENSELY (顎に手を当てて「深刻なエラーに悩むプログラマ」を熱演中)",
  "MAKING A SIGH OF CAPABILITY (周囲に聞こえる音量でデキる男風のタメ息を出力中)",
  "BROWSING QIITA VAINLY (技術記事を読んで勉強している雰囲気を周囲に放射中)",
  "ANALYZING BOSS SIGH (隣の席の先輩のタメ息の周波数を解析中。機嫌：警戒)",
  "DEEP THINKING DINNER (今日の晩御飯のおかずについて脳内ディープラーニング中)",
  "MOUSE MOVING RANDOM (デスクトップ上でマウスカーソルを円形に無限周回中)",
  "EXCEL CELL COLORING (意味もなくExcelのセルを一時的に黄色にして戻す知的作業を演出中)",
  "GIT STATUS LOOP (ターミナルで git status を3秒に1回叩いてブランチの安全を確認中)",
  "CHROME DEVTOOLS STARE (検証ツールの赤エラーを険しい顔で凝視し、世界のバグと戦うポーズ)",
  "ADJUSTING GLASSES (メガネのブリッジを中指で押し上げ、知的スタックを25%上昇中)",
  "NECK STRETCHING (首を左右にバキバキ鳴らし、限界まで戦うタフな戦士のオーラを放出)",
  "DESK CLEANING (ウエットティッシュでキーボードの隙間を拭き、リファクタリング感を演出)",
  "PEN CLICKING SPEEDRUN (ボールペンを無音で高速ノックし、脳内のセロトニンを強制分泌中)",
  "LOOKING AT CEILING (天井の一点を見つめ、壮大なシステムアーキテクチャを設計するフリ)",
  "FOLDING ARMS GRIMLY (腕をがっちり組み、足元の電源タップを睨みつけてバグの根源を威嚇)"
];

// ==========================================
// 社畜ランダムイベントデータ
// ==========================================
const randomEvents = [
  {
    text: "📧 CC地獄: メールを開いた瞬間、自分には関係ないと思っていた案件のCC欄に自分の名前が発見されました。胃が沈みます。",
    effect: (s) => { modifyMental(-12); },
    type: 'warn'
  },
  {
    text: "🍜 帰宅後の希望: 同僚が「今日は絶対定時で帰ってラーメン食べる」と宣言。帰宅欲が限界突破しました。",
    effect: (s) => { modifyMental(8); },
    type: 'info'
  },
  {
    text: "📝 議事録指名: 会議終了直前に「誰か議事録お願いできますか？」という魔法の言葉が発動。全員が沈黙しました。",
    effect: (s) => { modifyMental(-18); },
    type: 'error'
  },
  {
    text: "🎧 ノイズキャンセル発動: 隣席の雑談攻撃に対抗するためヘッドホン装備。世界との接続を遮断しました。",
    effect: (s) => { modifyMental(12); },
    type: 'info'
  },
  {
    text: "🕵️ 画面覗き込み疑惑: 後ろを通った上司が一瞬こちらを見た気がしました。即座にExcelを開きました。",
    effect: (s) => { 
      s.bossDistance = Math.max(CONFIG.BOSS.MIN_DISTANCE, s.bossDistance - 0.8);
      modifyMental(-10); 
    },
    type: 'warn'
  },
  {
    text: "💬 チャット誤爆: 別部署宛てのつもりだったメッセージが自分の上司に送信されていることに気付きました。",
    effect: (s) => { modifyMental(-25); },
    type: 'error'
  },
  {
    text: "🛗 エレベーター待機: 帰宅しようとした瞬間、エレベーターが各階停止モードになりました。",
    effect: (s) => { modifyMental(-7); },
    type: 'warn'
  },
  {
    text: "👑 定時前ミラクル: 隣のチームが全員帰宅準備開始。帰れる空気がフロア全体に発生しました。",
    effect: (s) => { modifyMental(20); },
    type: 'info'
  },
  {
    text: "📊 Excel崩壊: 3時間かけた資料のセル結合が全部ズレました。原因は不明です。",
    effect: (s) => { modifyMental(-22); },
    type: 'error'
  },
  {
    text: "☕ コーヒーマシン故障: 唯一の回復手段である給湯室の機械が沈黙しました。",
    effect: (s) => { modifyMental(-10); },
    type: 'warn'
  },
  {
    text: "🧘 無我の境地: 仕事をしているフリを極めて何も感じなくなりました。",
    effect: (s) => { modifyMental(5); },
    type: 'info'
  },
  {
    text: "📅 明日の予定発覚: カレンダーを確認したら朝イチ会議が入っていました。未来の自分に絶望。",
    effect: (s) => { modifyMental(-15); },
    type: 'warn'
  },
  {
    text: "🦸 同僚ヒーロー登場: 有能な同僚が「それ自分やりますよ」とタスクを引き受けました。神を見ました。",
    effect: (s) => { modifyMental(25); },
    type: 'info'
  },
  {
    text: "🔥 障害対応召喚: 定時前に突然システム障害アラートが鳴りました。世界が終わります。",
    effect: (s) => { 
      modifyMental(-35);
      s.bossDistance = Math.max(CONFIG.BOSS.MIN_DISTANCE, s.bossDistance - 1.0);
    },
    type: 'error'
  },
  {
    text: "👔 上司の独り言: 「あー、今日終わらないなぁ」という恐怖の発言を検知しました。",
    effect: (s) => { 
      s.bossDistance = Math.max(CONFIG.BOSS.MIN_DISTANCE, s.bossDistance - 1.2);
      modifyMental(-15);
    },
    type: 'error'
  },
  {
    text: "🎮 帰宅後予定バフ: 家で遊ぶゲームのアップデート完了通知を思い出しました。生きる理由を再確認。",
    effect: (s) => { modifyMental(15); },
    type: 'info'
  },
  {
    text: "⚠️ 突然のメンション: Slackで全体メンション「誰か今動ける方いませんか？」を検知。気配を消します。",
    effect: (s) => { modifyMental(-15); },
    type: 'warn'
  },
  {
    text: "🚨 予期せぬエラー: 開発環境が謎のエラーを吐き出しました。胃がキュッとなりました。",
    effect: (s) => { modifyMental(-20); },
    type: 'error'
  },
  {
    text: "📞 内線電話: 隣の席の電話が鳴り響いています。頼むから取ってくれと心の中で祈祷中。",
    effect: (s) => { modifyMental(-10); },
    type: 'warn'
  },
  {
    text: "🍡 差し入れ: 同僚から謎の海外土産（謎の激甘クッキー）を配られました。咀嚼で時間を稼ぎます。",
    effect: (s) => { modifyMental(10); },
    type: 'info'
  },
  {
    text: "👣 足音の幻聴: 廊下から上司の足音が聞こえた気がして背筋が伸びました（空振り）。",
    effect: (s) => { modifyMental(-5); },
    type: 'warn'
  },
  {
    text: "💬 同僚の離脱: 隣の席のプロが生々しいタメ息と共に「お先に失礼します」と定時ダッシュを決めて嫉妬で脳が焼かれます。",
    effect: (s) => { modifyMental(-25); },
    type: 'error'
  },
  {
    text: "☕️ 奇跡の平穏: 部署全体が静寂に包まれました。完全にエアポケットです。無になります。",
    effect: (s) => { modifyMental(5); },
    type: 'info'
  },
  {
    text: "👹 悪魔の囁き: 上司が「あ、そういえばさ…」と誰かに話しかける声を感知！警戒レベルMAX！",
    effect: (s) => { s.bossDistance = Math.max(CONFIG.BOSS.MIN_DISTANCE, s.bossDistance - 1.5); }, 
    type: 'error'
  },
  {
    text: "💻 Windows Update: 『更新プログラムを構成しています。』このタイミングで強制再起動の恐怖が脳裏をよぎる！",
    effect: (s) => { modifyMental(-15); },
    type: 'error'
  },
  {
    text: "👥 雑談の巻き込み: 隣のチームが週末の予定について盛り上がっています。話を振られないよう「クソデカため息」でバリアを展開。",
    effect: (s) => { modifyMental(-8); },
    type: 'warn'
  },
  {
    text: "👀 視線感知: 斜め後ろの席の先輩がコチラの画面を見つめている気がする。Qiitaのタブをそっと閉じた。",
    effect: (s) => { modifyMental(-12); },
    type: 'warn'
  },
  {
    text: "🍫 秘密の備蓄: 引き出しの奥から賞味期限が3ヶ月切れたチョコを発見。背に腹は代えられないので摂取！",
    effect: (s) => { modifyMental(15); },
    type: 'info'
  },
  {
    text: "👻 背後に立つ者: 【怪奇現象】気配がしたと思ったら、上司が真後ろで別の同僚と話し始めた！心臓が跳ね上がる！",
    effect: (s) => { 
      s.bossDistance = CONFIG.BOSS.WARP_DISTANCE; 
      modifyMental(-30);
    },
    type: 'error'
  },
  {
    text: "⏳ Teams会議延長: 「最後もう1点だけ…」からが本番。定時間際の不毛な議論で虚無の時間を過ごす。",
    effect: (s) => { modifyMental(-18); },
    type: 'error'
  },
  {
    text: "💥 Outlook爆発: 全社宛ての誤送信スレッドに「各位、返信の全体送信をやめてください」という全体返信が連鎖しメールボックスが機能停止。",
    effect: (s) => { modifyMental(-15); },
    type: 'error'
  },
  {
    text: "⚠️ コピー機詰まり: 自分の直前で「紙詰まり：複合機内部のレバーA1を開けてください」の絶望表示。なぜ自分が直さねばならんのか。",
    effect: (s) => { modifyMental(-10); },
    type: 'warn'
  },
  {
    text: "🥱 謎の朝礼: 連絡事項ゼロ。「今週も折り返しですが気合を入れていきましょう」という精神論だけを浴びる儀式。",
    effect: (s) => { modifyMental(-12); },
    type: 'warn'
  },
  {
    text: "👁‍ 部長巡回: 腕を後ろで組みながらフロアを鋭い眼光で練り歩くボスを検知！強制的に間合いを詰められます！",
    effect: (s) => { 
      s.bossDistance = Math.max(CONFIG.BOSS.MIN_DISTANCE, s.bossDistance - 2.0); 
      modifyMental(-10);
    },
    type: 'error'
  },
  {
    text: "🔊 隣がオンライン会議: 隣の席の同僚がノーヘッドセットで大声ミーティングを開始。「はい！弊社といたしましては！」が脳を直撃。",
    effect: (s) => { modifyMental(-14); },
    type: 'warn'
  },
  {
    text: "🥶 エアコン寒すぎ: オフィスの室温が局所的にアラスカ（22度設定）に。指先が冷えてキーボードの打鍵速度が低下中。",
    effect: (s) => { 
      modifyMental(-8); 
      unlockAchievement('ALASKA');
    },
    type: 'warn'
  },
  {
    text: "☠️ VPN死亡: 「リモートホストへの接続が切断されました」。社内システムへのアクセスが全滅し何もできなくなりました（手遅れ）。",
    effect: (s) => { 
      modifyMental(-25); 
      unlockAchievement('VPN_APOCALYPSE');
    },
    type: 'error'
  },
  {
    text: "🖨 プリンタ故障: 印刷ジョブが無限に『スプール中』のまま静止。背後に次の順番を待つ人のプレッシャーを感じる。",
    effect: (s) => { modifyMental(-11); },
    type: 'warn'
  },
  {
    text: "💣 Slackスタンプ爆撃: チャンネル内で謎のスタンプ大喜利が発生。通知の赤いバッジ（数字）が狂ったように増えていく恐怖。",
    effect: (s) => { 
      modifyMental(-7); 
      unlockAchievement('SLACK_BOMB');
    },
    type: 'info'
  },
  {
    text: "🔧 急な仕様変更: 『あ、ゴメン。さっきの機能やっぱりナシで、代わりにこっちのAPI繋いでくれる？』とカジュアルに爆弾が投下された。",
    effect: (s) => { modifyMental(-28); },
    type: 'error'
  },
  {
    text: "🤫 噂話の傍聴: 給湯室で『今年の冬のボーナス、ちょっと調整が入るらしいよ』という不穏な会話が漏れ聞こえてきた。",
    effect: (s) => { modifyMental(-15); },
    type: 'warn'
  },
  {
    text: "🔋 マウス電池切れ: ワイヤレスマウスのバッテリーが完全沈黙。予備の電池を求めて深夜の引き出し発掘作戦が開始される。",
    effect: (s) => { modifyMental(-9); },
    type: 'warn'
  },
  {
    text: "📅 パスワード定期変更の刑: ログインしようとした瞬間に『パスワードの有効期限が切れています。過去3世代と同じものは使えません』の無慈悲な宣告。",
    effect: (s) => { modifyMental(-14); },
    type: 'error'
  }
];

// ==========================================
// イベントリスナー初期化
// ==========================================
/**
 * DOM（HTML要素）の解析が完了したタイミングで実行される初期化処理
 */
document.addEventListener('DOMContentLoaded', async () => {
  
  // 1. ログデータベースの初期化
  try {
    // IndexedDBの接続・テーブル作成を待機
    await logDB.init();
    appendLog("[SYSTEM] ログデータベース(IndexedDB)が正常にマウントされました。");
  } catch (err) {
    // 失敗してもアプリ自体は動くよう、エラーログの出力に留める（堅牢な設計）
    console.error("IndexedDBの初期化に失敗しました。制限超過分のログは永続化されません:", err);
  }

  // 2. 目標時間の初期値設定（現在時刻の「15分後」をデフォルト値とする）
  const now = new Date();
  now.setMinutes(now.getMinutes() + 15); // 15分を加算

  const defaultHours = now.getHours();
  const defaultMinutes = now.getMinutes();

  // アプリケーションのグローバル状態（state）にデフォルトの目標時間をセット
  state.targetTime.hours = defaultHours;
  state.targetTime.minutes = defaultMinutes;
  state.targetTime.seconds = 0;

  // 時間入力フォーム（input[type="time"]など）が存在すれば、初期値を反映 (例: "14:30")
  const timeInput = document.getElementById('input-target-time');
  if (timeInput) {
    timeInput.value = `${String(defaultHours).padStart(2, '0')}:${String(defaultMinutes).padStart(2, '0')}`;
  }

  // 3. ボタンのクリックイベント登録（ヘルパー関数による共通化）
  /**
   * 指定したIDの要素が存在する場合に、クリックイベントリスナーを登録するヘルパー
   * @param {string} id - エレメントのID
   * @param {Function} fn - コールバック関数
   */
  const registerClick = (id, fn) => document.getElementById(id)?.addEventListener('click', fn);

  // 各種アクションボタンに処理をマッピング
  registerClick('btn-start', startRoutine);   // ルーチン開始
  registerClick('btn-escape', forceEscape);   // 強制離脱 / エスケープ
  registerClick('btn-toilet', useToilet);     // トイレイベント
  registerClick('btn-cafe', useCaffeine);     // カフェイン摂取
  registerClick('btn-oshi', watchOshi);       // 推しを愛でる

  // 4. ミュート（消音）ボタンのトグル制御
  const btnMute = document.getElementById('btn-mute');
  if (btnMute) {
    btnMute.addEventListener('click', () => {
      // ミュート状態の反転（true ↔ false）
      state.isMuted = !state.isMuted; 

      if (state.isMuted) {
        // ミュートON時のUI表現変更とログ出力
        btnMute.textContent = '🔇 サウンド: OFF';
        btnMute.classList.add('is-muted'); 
        appendLog("[SYSTEM] サウンド出力をミュートしました。");
      } else {
        // ミュートOFF時のUI表現変更とログ出力
        btnMute.textContent = '🔊 サウンド: ON';
        btnMute.classList.remove('is-muted');
        appendLog("[SYSTEM] サウンド出力を有効化しました。");
      }
    });
  }

  // 5. その他の初期状態セットアップ
  // ライフハック系ボタンを初期状態（無効化など）にする
  toggleLifehackButtons(false);

  // 実績（アチーブメント）の総数をカウントし、画面上のカウンターに表示
  const totalAchievements = Object.keys(ACHIEVEMENTS).length;
  setTargetText('achieve-total', totalAchievements);

  // ローカルストレージ等から、過去に解放した実績データを読み込む
  loadSavedAchievements();
});

// ==========================================
// UI・ログ制御用ヘルパー関数
// ==========================================

/**
 * 指定したIDのエレメントのテキスト（innerText）を書き換える
 * @param {string} id - 対象要素のID
 * @param {string|number} text - 設定するテキスト
 */
function setTargetText(id, text) {
  const el = document.getElementById(id);
  if (el) el.innerText = text;
}

/**
 * ログエリアに新しいログ行を追加し、上限を超えた古いログを間引いてIndexedDBへ退避する
 * @param {string} text - ログ本文
 * @param {'info'|'warn'|'error'|'achievement'} [type='info'] - ログの種類（色分けに使用）
 * @returns {Promise<void>}
 */
async function appendLog(text, type = 'info') {
  const logArea = document.getElementById('log-area');
  if (!logArea) return; // ログエリアがない場合は処理しない

  const now = new Date().toLocaleTimeString(); // 現在時刻の文字列 (例: "14:30:15")
  
  // ログのタイプに応じた配色（テーマカラー）の決定
  let color = '#a7f3d0'; // デフォルト: info (薄い緑)
  if (type === 'warn') color = '#fbcfe8';        // 警告 (薄いピンク)
  if (type === 'error') color = '#fca5a5';       // エラー (薄い赤)
  if (type === 'achievement') color = '#fef08a'; // 実績解除 (薄い黄)

  // 新しいログ要素（DOM）の構築
  const logRow = document.createElement('div');
  logRow.style.color = color;
  logRow.dataset.type = type; // 後でDB保存時に判別できるようデータ属性に保持
  logRow.textContent = `[${now}] ${text}`;

  // 画面のログエリアに挿入
  logArea.appendChild(logRow);

  // 【ログのローテーション制御】
  // 表示件数が設定された上限値を超えている間、最古の行を削除しつつDBへ永続化する
  while (logArea.children.length > CONFIG.LOG.MAX_DISPLAY_ROWS) {
    const oldestRow = logArea.firstChild;
    if (oldestRow) {
      const oldestText = oldestRow.textContent;
      const oldestType = oldestRow.dataset.type || 'info';
      
      // 画面から消すログを IndexedDB に保存（非同期処理だがログの流れを止めないため await はしない）
      logDB.saveLog(oldestText, oldestType);
      
      // 画面（DOM）から古い行を削除
      oldestRow.remove();
    }
  }

  // 常に最新のログが見えるよう、一番下まで自動スクロール
  logArea.scrollTop = logArea.scrollHeight;
}

/**
 * 特定のライフハック（行動）ボタン群の活性・非活性（disabled）を一括で切り替える
 * @param {boolean} enabled - true でボタンを有効化、false で無効化
 */
function toggleLifehackButtons(enabled) {
  ['btn-toilet', 'btn-cafe', 'btn-oshi'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.disabled = !enabled; // 有効化(enabled=true)のとき、disabledをfalseにする
  });
}

/**
 * 現在のメンタル値（state.mentalGauge）を読み取り、UI上の数値・メーター・色を同期する
 */
function updateMentalUI() {
  const mentalEl = document.getElementById('mental');
  const gaugeMental = document.getElementById('gauge-mental');
  if (!mentalEl || !gaugeMental) return; // 必要なUI要素が揃っていなければ処理をスキップ

  const currentGauge = state.mentalGauge;

  // 数値テキストと、HTMLの <progress> 更新
  mentalEl.innerText = currentGauge;
  gaugeMental.value = currentGauge;

  // 以前のステータスクラスを一度すべてクリア
  gaugeMental.classList.remove('mental-stable', 'mental-fatigue', 'mental-danger', 'mental-critical');

  // メンタル残量に応じてステージ判定を行い、クラスと文字色を適用
  if (currentGauge >= 71) {
    // 安定状態 (Green)
    gaugeMental.classList.add('mental-stable');
    mentalEl.style.color = '#22c55e';
  } 
  else if (currentGauge >= 41) {
    // 疲労状態 (Yellow)
    gaugeMental.classList.add('mental-fatigue');
    mentalEl.style.color = '#eab308';
  } 
  else if (currentGauge >= 21) {
    // 危険状態 (Orange)
    gaugeMental.classList.add('mental-danger');
    mentalEl.style.color = '#f97316';
  } 
  else {
    // 崩壊寸前 (Red)
    gaugeMental.classList.add('mental-critical');
    mentalEl.style.color = '#ef4444';
  }
}
// ==========================================
// コアロジック（ルーチン制御）
// ==========================================
/**
 * 定時退勤生存ルーチンの稼働を開始する
 */
function startRoutine() {
  // 【ガード句】多重起動を防止
  if (state.loopRunning) {
    appendLog("[SYSTEM] 警告: 定時退勤ルーチンは既に稼働中です。多重起動を防止しました。", "warn");
    return;
  }

  // 画面の入力フォームから目標退勤時間を取得してstateに反映
  const timeInput = document.getElementById('input-target-time')?.value;
  if (timeInput) {
    const [hours, minutes] = timeInput.split(':').map(Number);
    state.targetTime.hours = hours;
    state.targetTime.minutes = minutes;
    state.targetTime.seconds = 0;
  }

  // アプリケーションの状態を初期化（リセット）
  state.isBoredToDeath = true;
  state.isHomeProtocolExecuted = false;
  state.bossDistance = CONFIG.BOSS.INITIAL_DISTANCE; 
  state.caffeineStack = 0; 
  state.isToiletEmergency = false; 
  state.toiletCountdown = 0;
  state.mentalGauge = CONFIG.MENTAL.DEFAULT;
  updateMentalUI();

  // ルーチン実行中は設定の変更や再起動ができないようUIをロック
  const btnStart = document.getElementById('btn-start');
  const inputTime = document.getElementById('input-target-time');
  if (btnStart) btnStart.disabled = true;
  if (inputTime) inputTime.disabled = true;

  // ライフハック系ボタンを有効化し、ステータスを変更
  toggleLifehackButtons(true);
  setTargetText('status', 'WAITING_FOR_TEIJI');

  // 開始ログの出力
  const hStr = String(state.targetTime.hours).padStart(2, '0');
  const mStr = String(state.targetTime.minutes).padStart(2, '0');
  appendLog(`[SYSTEM] 定時退勤生存ルーチンを開始。ターゲット：${hStr}:${mStr} 脱出`);

  // 実績「定時への執念」を解除
  unlockAchievement('FIRST_STEP');

  // メインループ（非同期処理）の実行
  loop();
}

// ==========================================
// メインループ
// ==========================================
/**
 * 1秒ごとに状態を監視・更新するアプリケーションのメインループ（ライフサイクル管理）
 */
async function loop() {
  state.loopRunning = true; // ループ起動フラグをオン

  try {
    // アクティブフラグが立っている間、1秒間隔で無限ループ
    while (state.isBoredToDeath) {
      const now = new Date();
      const currentTime = { hours: now.getHours(), minutes: now.getMinutes(), seconds: now.getSeconds() };

      // 【上司のランダム移動ロジック】設定された最大速度の範囲内で、接近・後退を計算
      const step = (Math.random() * CONFIG.BOSS.MOVE_SPEED_MAX) - (CONFIG.BOSS.MOVE_SPEED_MAX / 2); 
      state.bossDistance = Math.min(CONFIG.BOSS.MAX_DISTANCE, Math.max(CONFIG.BOSS.MIN_DISTANCE, state.bossDistance + step));

      // 画面上の上司との距離表示を更新
      const bossDistStr = state.bossDistance.toFixed(1);
      setTargetText('distance', bossDistStr + 'm');

      const gaugeDist = document.getElementById('gauge-distance');
      if (gaugeDist) gaugeDist.value = state.bossDistance;

      // 0.2m以下まで接近されたら隠し実績解除
      if (state.bossDistance <= 0.2) {
        unlockAchievement('CLOSE_CALL');
      }

      // --- パターンA: 上司が警戒距離（1m以内）に侵入した場合 ---
      if (state.bossDistance < CONFIG.BOSS.ALERT_DISTANCE) {
        state.totalFakeActionsExecuted++;
        document.querySelector('.container')?.classList.add('danger-zone'); // 画面を赤くする等の危険演出
        whisper.speak("ヤバい"); // 音声警告

        // 30%の確率で強制緊急イベント発動
        if (Math.random() < 0.3) {
          state.totalEventsEncountered++;
          const emergencyEvent = randomEvents[Math.floor(Math.random() * randomEvents.length)];
          appendLog(`[EMERGENCY EVENT] ${emergencyEvent.text}`, emergencyEvent.type);
          emergencyEvent.effect(state);
        } else {
          // 残り70%は全力で仕事しているフリを演出
          appendLog(`STATUS: EMERGENCY... [ACTION] ${fakeActions[2]} (全神経を画面に集中させています)`);
        }
      }
      // --- パターンB: 突発的トイレ緊急事態のカウントダウン中 ---
      else if (state.isToiletEmergency) {
        state.toiletCountdown--;

        if (state.toiletCountdown > 0) {
          appendLog(`🚨 【大波警告】漏れるまであと ${state.toiletCountdown} 秒！！早くトイレボタンを押せ！！`, 'error');
        } else {
          // カウントダウンが0になったら「社会的な死（ゲームオーバー）」
          setTargetText('status', 'SOCIAL_DEATH');
          appendLog("[FATAL] 間に合いませんでした。エンジニアとしての尊厳が消滅しました。", 'error');
          
          await whisper.speak("ぶりゅ、ぶりゅ、ぶりゅりゅりゅ。");
          
          unlockAchievement('SOCIAL_DEATH');
          shutdownSystem();
          setTimeout(() => {
            alert("社会的に死亡しました。着替えを持ってきてください。");
          }, 100);
          break; // ループを離脱
        }
      }
      // --- パターンC: 通常巡航状態（1m以上離れており、トイレも安全） ---
      else {
        const rng = Math.random();

        // 2%の確率でトイレ緊急事態が突発発動
        if (rng < CONFIG.PROBABILITY.TOILET_EMERGENCY) {
          state.isToiletEmergency = true;
          state.toiletCountdown = 5; //猶予は5秒
          appendLog("🚨 【緊急事態】お腹に突発的な『大波』を検知！！5秒以内にトイレに駆け込まないと社会的に死亡します！！", 'error');
        }
        // 30%の確率で社畜日常ランダムイベントが発動
        else if (rng < CONFIG.PROBABILITY.RANDOM_EVENT) {
          state.totalEventsEncountered++;
          const ev = randomEvents[Math.floor(Math.random() * randomEvents.length)];
          appendLog(`[EVENT] ${ev.text}`, ev.type);
          ev.effect(state);
        }
        // イベントが起きなければ平和にサボり偽装（ログ出力）
        else {
          state.totalFakeActionsExecuted++;
          const randomAction = fakeActions[Math.floor(Math.random() * fakeActions.length)];
          appendLog(`STATUS: ACTIVE... [ACTION] ${randomAction}`);
        }
      }

      // 生存確認のビーフ音を鳴らす（1秒に1回）
      playBeep();

      // 【定時到達判定】
      if (checkTimeReached(currentTime, state.targetTime) && !state.isHomeProtocolExecuted) {
        state.isHomeProtocolExecuted = true;
        appendLog("[SYSTEM] EVADING_ALL_OVERTIME 【定時ダッシュ！】");
        appendLog("[SYSTEM] *PSHUT!* 🍺 (ぷはぁ)");
        appendLog(`"BYE BYE COMPANY! お先に失礼します！(^-^)"`);
        setTargetText('status', 'HOME_SAFE');

        unlockAchievement('SURVIVED'); // 完全犯罪クリア実績
        launchConfetti();              // 紙吹雪演出
        shutdownSystem();
        break; // 生還クリア
      }

      // 【メンタル減少処理】上司が近くにいる時はプレッシャーにより消費量が2倍に跳ね上がる
      const actualMentalConsume = state.bossDistance < CONFIG.BOSS.ALERT_DISTANCE 
        ? CONFIG.MENTAL.CONSUME_PER_SEC * 2 
        : CONFIG.MENTAL.CONSUME_PER_SEC;

      consumeMental(actualMentalConsume);

      // ループ内で状態がオフにされた場合のセーフティ離脱
      if (!state.isBoredToDeath) break;
      // 1秒(1000ms)待機して次のサイクルへ
      await new Promise(r => setTimeout(r, 1000)); 
    }
  } finally {
    // 例外による強制終了時も含め、確実にループフラグをリセットする
    state.loopRunning = false;
    appendLog("[SYSTEM] メインループが安全に終了しました。");
  }
}

/**
 * メンタルを消費させ、0以下になった場合にゲームオーバー（メンタル崩壊）を処理するヘルパー
 * @param {number} amount - 減少させるメンタル量
 */
function consumeMental(amount) {
  const currentGauge = modifyMental(-amount);

  if (currentGauge <= CONFIG.MENTAL.MIN) {
    setTargetText('status', 'CRASHED');
    appendLog("[FATAL] 精神的サーバーダウン。限界です。意識が有給休暇を取得しました。", 'error');
    unlockAchievement('SANITY_ZERO'); // メンタル崩壊実績
    shutdownSystem();
    setTimeout(() => {
      alert("メンタルが崩壊しました！今すぐ有給を申請してください！");
    }, 100);
  }
}

/**
 * システム（メインループ）を安全にシャットダウンし、各種タイマーやUI状態をリセットする
 */
function shutdownSystem() {
  state.isBoredToDeath = false;
  state.isToiletEmergency = false; 
  state.toiletCountdown = 0; 
  state.caffeineStack = 0;
  document.querySelector('.container')?.classList.remove('danger-zone');
  
  // 音声合成の停止
  whisper.stopAll();

  // UIロックの解除
  const btnStart = document.getElementById('btn-start');
  const inputTime = document.getElementById('input-target-time');
  if (btnStart) btnStart.disabled = false;
  if (inputTime) inputTime.disabled = false;

  toggleLifehackButtons(false);

  // カフェインデバフ用タイマーのクリア
  if (state.caffeineTimeoutId !== null) {
    clearTimeout(state.caffeineTimeoutId);
    state.caffeineTimeoutId = null; 
  }

  // Web Audio Context のクローズ処理（メモリリーク防止）
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
// トイレ妨害イベントのマスターデータ
// ==========================================
/**
 * 通常時にトイレボタンを押した際、50%の確率で発生する「サボり妨害」イベント定義
 */
const TOILET_OBSTACLE_EVENTS = [
  {
    text: "🚧 トイレ妨害：【上司の世間話エリア】トイレの前で上司が他部署の同僚と「最近の若者のタイピング速度」について軽い雑談中。話が長引くため静かに後退した…。",
    effect: (s) => {
      modifyMental(-12);
      s.bossDistance = Math.max(CONFIG.BOSS.MIN_DISTANCE, s.bossDistance - 0.6); // 上司がさらに近づく
    }
  },
  {
    text: "🚧 トイレ妨害：【配管クライシス（緊急メンテ中）】入り口を開けた瞬間、工具を持った設備業者から「緊急修理中で使えないよ！」と無慈悲な宣告を受けました。",
    effect: (s) => { modifyMental(-15); }
  },
  {
    text: "🚧 トイレ妨害：【トイレットペーパー・ゼロ】間一髪で滑り込むもホルダーに鎮座するのは茶色い芯のみ。静かに絶望の撤退。",
    effect: (s) => { modifyMental(-12); }
  },
  {
    text: "🚧 トイレ妨害：【清掃員のイエローカード】入り口にそびえ立つ『清掃中・立入禁止』の冷酷な看板。撤退を余儀なくされる。",
    effect: (s) => { modifyMental(-10); }
  },
  {
    text: "🚧 トイレ妨害：【昼休み直後のデッドヒート】昼休み直後でトイレ待ち 5人！順番が全く進まない！",
    effect: (s) => {
      modifyMental(-18);
      s.bossDistance = Math.max(CONFIG.BOSS.MIN_DISTANCE, s.bossDistance - 0.8);
    }
  },
  {
    text: "🚧 トイレ妨害：【カードキー不携帯】セキュリティカードを下げていないことに気づく。閉め出される恐怖によりサボり計画は頓挫した。",
    effect: (s) => { modifyMental(-10); }
  },
  {
    text: "🚧 トイレ妨害：【ドアロック・スタック】個室の鍵がやたらと固く「閉じ込められるのでは？」という野生の直感で命からがら脱出した。",
    effect: (s) => { modifyMental(-15); }
  }
];

// ==========================================
// ライフハック（回復コマンド）
// ==========================================
/**
 * 【行動】トイレに駆け込む（サボり・大波回避）
 */
function useToilet() {
  if (!state.isBoredToDeath) return;

  state.totalToiletEscapes++;

  // 1. 緊急事態（大波カウントダウン中）だった場合：一撃で緊急回避成功
  if (state.isToiletEmergency) {
    state.isToiletEmergency = false; 
    state.toiletCountdown = 0; 
    modifyMental(CONFIG.LIFEHACK.TOILET_HEAL);
    appendLog(`✨ 無事個室へチェックイン！人間としての尊厳は守られた。 (+${CONFIG.LIFEHACK.TOILET_HEAL})`, 'info');
  } 
  // 2. 通常時（サボり目的）だった場合：50%の確率で妨害イベントが発生するギャンブル
  else {
    const isObstructed = Math.random() < 0.50; 

    if (isObstructed) {
      const obstacle = TOILET_OBSTACLE_EVENTS[Math.floor(Math.random() * TOILET_OBSTACLE_EVENTS.length)];
      appendLog(obstacle.text, 'error');
      obstacle.effect(state); 
    } else {
      modifyMental(CONFIG.LIFEHACK.TOILET_HEAL);
      appendLog(`[LIFEHACK] 誰もいない個室トイレの獲得に成功。精神のデフラグを実行中。 (+${CONFIG.LIFEHACK.TOILET_HEAL})`, 'warn');
    }
  }
}

/**
 * 【行動】カフェイン摂取（エナジードリンク）
 * メリット：即座に大きくメンタル回復 / デメリット：5秒後にスタック数に応じた強烈な反動デバフ
 */
function useCaffeine() {
  if (!state.isBoredToDeath) return;

  state.totalCaffeineConsumedMl += 250; // 統計加算
  state.caffeineStack++; 

  modifyMental(CONFIG.LIFEHACK.CAFFEINE_HEAL);
  appendLog(`[LIFEHACK] エナジードリンクをキメました。脳を強制駆動 (+${CONFIG.LIFEHACK.CAFFEINE_HEAL})`, 'warn');

  // 3回以上の過剰摂取で実績解除
  if (state.caffeineStack >= 3) {
    unlockAchievement('CAFFEINE_ADDICT');
    unlockAchievement('OVERDOSE'); 
  }

  // デバフタイマーの起動（すでにタイマーが走っている場合は最初のタイマーにスタックをまとめて処理）
  if (state.caffeineTimeoutId === null) {
    state.caffeineTimeoutId = setTimeout(() => {
      state.caffeineTimeoutId = null;
      // システムがまだ稼働中であれば反動ダメージを適用
      if (state.isBoredToDeath) {
        const totalDamage = CONFIG.LIFEHACK.CAFFEINE_DEBUFF * state.caffeineStack;
        appendLog(`[DEBUFF] カフェインの加護が終了。${state.caffeineStack}本分の猛烈な反動が脳を襲う (-${totalDamage})`, 'error');
        consumeMental(totalDamage);
      }
      state.caffeineStack = 0; // スタックリセット
    }, CONFIG.LIFEHACK.CAFFEINE_DURATION_MS);
  }
}

/**
 * 【行動】推しを愛でる（ピンチ限定の緊急回復コマンド）
 */
function watchOshi() {
  if (!state.isBoredToDeath) return;
  
  // メンタルが20以下の瀕死時しか使えない制約（温存を促すガード句）
  if (state.mentalGauge > 20) {
    appendLog("[LIFEHACK] まだ理性が残っています。推しパワーは本当に限界になるまで温存しましょう。", "info");
    return;
  }
  
  // メンタル20以下での発動成功時に実績解除
  if (state.mentalGauge <= 20) {
    unlockAchievement('OSHI_SAVIOR');
  }

  modifyMental(CONFIG.LIFEHACK.OSHI_HEAL);
  appendLog(`[LIFEHACK] 推しの画像を0.5秒凝視。尊さにより生命力が爆増 (+${CONFIG.LIFEHACK.OSHI_HEAL})`, 'warn');
}

// ==========================================
// サウンド・その他補助関数
// ==========================================
/**
 * Web Audio API を用いて、生存シグナル用のビープ音（ミリ秒単位の短いパルス音）を単発生成・再生する
 */
function playBeep() {
  if (state.isMuted) return; // ミュート時は処理しない

  // AudioContextのシングルトン初期化
  if (!state.audioCtx) {
    state.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  // ブラウザの自動再生ポリシー対策（サスペンド状態なら再開）
  if (state.audioCtx.state === 'suspended') {
    state.audioCtx.resume();
  }

  // オシレーター（発振器）とゲイン（音量調整）ノードの生成
  const osc = state.audioCtx.createOscillator();
  const gain = state.audioCtx.createGain();

  osc.type = 'sine'; // 正弦波
  osc.frequency.setValueAtTime(CONFIG.AUDIO.BEEP_FREQ, state.audioCtx.currentTime); // 周波数設定
  gain.gain.setValueAtTime(CONFIG.AUDIO.BEEP_GAIN, state.audioCtx.currentTime);     // 微小な音量に制限

  // オーディオグラフの接続（Oscillator -> Gain -> スピーカー）
  osc.connect(gain);
  gain.connect(state.audioCtx.destination);

  // 再生終了時にノードを切断してメモリを解放（ガベコレ対策）
  osc.onended = () => {
    osc.disconnect();
    gain.disconnect();
  };

  // 指定ミリ秒分だけ即座に鳴らして止める
  osc.start();
  osc.stop(state.audioCtx.currentTime + CONFIG.AUDIO.BEEP_DURATION_SEC);
}

/**
 * 【行動】エスケープボタン（定時を待たない強制脱出・ギブアップ）
 */
function forceEscape() {
  unlockAchievement('FORCE_OUT'); // テロリスト実績解除
  shutdownSystem();
  setTargetText('status', 'FORCE_QUITTED');
  appendLog("[SYSTEM] 偽装を解除。定時を待たずに脱出します！", 'error');
  setTimeout(() => {
    alert("お疲れ様でした！今すぐPCを閉じて帰りましょう！");
  }, 100);
}

/**
 * 現在時刻が目標退勤時刻に到達しているかを厳密に比較判定する
 * @param {{hours:number, minutes:number, seconds:number}} now - 現在時刻
 * @param {{hours:number, minutes:number, seconds:number}} target - 目標時刻
 * @returns {boolean} 到達していれば true
 */
function checkTimeReached(now, target) {
  return (now.hours > target.hours) ||
    (now.hours === target.hours && now.minutes > target.minutes) ||
    (now.hours === target.hours && now.minutes === target.minutes && now.seconds >= target.seconds);
}

/**
 * 画面いっぱいにカラフルな紙吹雪（DOMアニメーション）を生成して降らせる演出関数
 */
function launchConfetti() {
  for (let i = 0; i < CONFIG.CONFETTI.COUNT; i++) {
    const confetti = document.createElement('div');
    confetti.classList.add('confetti');

    // ランダムな初期配置、色、サイズ、アニメーション速度を計算してインラインスタイルに適用
    confetti.style.left = Math.random() * 100 + 'vw';
    confetti.style.backgroundColor = CONFIG.CONFETTI.COLORS[Math.floor(Math.random() * CONFIG.CONFETTI.COLORS.length)];

    const size = Math.random() * 8 + 6; 
    confetti.style.width = `${size}px`;
    confetti.style.height = `${size}px`;

    confetti.style.animationDuration = Math.random() * 2 + 2 + 's'; 
    confetti.style.animationDelay = Math.random() * 0.5 + 's';
    confetti.style.setProperty('--x-drift', (Math.random() * 200 - 100) + 'px'); // CSSのアニメーション用カスタムプロパティ

    document.body.appendChild(confetti);

    // 落下アニメーションが終了したらDOMから自動削除
    confetti.addEventListener('animationend', () => {
      confetti.remove();
    });
  }
}

// ==========================================
// 実績リストUIへの追加共通化関数
// ==========================================
/**
 * 解除された実績のタイトルと説明文を画面上の実績リスト（DOM）に追加する
 * @param {string} id - 実績ID（ACHIEVEMENTSのキー）
 */
function addAchievementToUI(id) {
  const list = document.getElementById("achievement-list");
  if (!list || !ACHIEVEMENTS[id]) return;

  // 初期状態の「未解除」というプレースホルダーテキストをクリア
  if (list.textContent.trim() === "未解除") {
    list.textContent = "";
  }

  // 実績要素を生成してアペンド
  const item = document.createElement("div");
  item.textContent = `🏅 ${ACHIEVEMENTS[id].title} - ${ACHIEVEMENTS[id].desc}`;

  list.appendChild(item);
  list.scrollTop = list.scrollHeight; // 最新の実績までスクロール
}

// ==========================================
// ストレージ操作関数
// ==========================================
// Chrome拡張機能の非同期ストレージ書き込み競合（レースコンディション）を防ぐためのPromiseチェーン
let achievementSaveQueue = Promise.resolve();

/**
 * 現在解除済みの実績 Set を Chrome ローカルストレージへ非同期保存する（非同期キュー制御）
 * @returns {Promise<void>} 保存処理の完了を保証するPromise
 */
function saveAchievements() {
  // Chrome拡張機能（Manifest V3等）の実行環境が存在するかチェック
  if (typeof chrome !== 'undefined' && chrome.storage?.local) {
    const listToSave = Array.from(state.unlockedAchievements); // SetをArrayに変換

    // キューイングにより、連続で実績が解除されても書き込み順序を直列に保証する
    achievementSaveQueue = achievementSaveQueue.then(async () => {
      try {
        await chrome.storage.local.set({ savedAchievements: listToSave });
      } catch (error) {
        console.error('Failed to save achievements:', error);
      }
    });
  }
  return achievementSaveQueue;
}

/**
 * ページ起動時、Chrome ローカルストレージから過去に解除した実績データを復元しUIに反映する
 */
async function loadSavedAchievements() {
  // 拡張機能環境でない（通常のウェブブラウジング）場合は早期リターン
  if (typeof chrome === 'undefined' || !chrome.storage?.local) {
    return;
  }

  // 一度状態をクリア
  state.unlockedAchievements.clear();
  setTargetText('achieve-count', 0);
  
  const listEl = document.getElementById('achievement-list');
  if (listEl) {
    listEl.textContent = '未解除'; 
  }

  try {
    // ストレージから読込
    const result = await chrome.storage.local.get(['savedAchievements']);
    const savedList = result.savedAchievements;

    if (!savedList || !Array.isArray(savedList) || savedList.length === 0) {
      return;
    }

    // 保存されていた実績をSetに再格納し、UIに1件ずつ描画
    savedList.forEach(id => {
      if (ACHIEVEMENTS[id]) {
        state.unlockedAchievements.add(id);
        addAchievementToUI(id);
      }
    });

    // 実績カウンターの数値を同期
    setTargetText('achieve-count', state.unlockedAchievements.size);

  } catch (error) {
    console.error('Failed to load achievements:', error);
  }
}

/**
 * 指定された実績を新規に解除し、ストレージへの保存、紙吹雪演出、専用ログ出力を一括実行する
 * @param {string} id - 解除する実績ID
 */
async function unlockAchievement(id) {
  // 実績が存在しない、または既に解除済みの場合は何もせず終了（重複防止）
  if (!ACHIEVEMENTS[id] || state.unlockedAchievements.has(id)) return;

  // 解除フラグの格納
  state.unlockedAchievements.add(id);
  const a = ACHIEVEMENTS[id];

  // 非同期保存を開始しつつ、並行して画面演出を実行
  await saveAchievements();
  launchConfetti(); 

  // 実績解除専用の特別カラー(金色系)でコンソール（ログエリア）に大々的に出力
  appendLog(`🌟⭐【実績解除 / ACHIEVEMENT UNLOCKED】⭐🌟`, 'achievement');
  appendLog(`${a.title} : ${a.desc}`, 'achievement');
  appendLog(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`, 'achievement');

  // カウンターの更新とUIリストへの追加
  setTargetText('achieve-count', state.unlockedAchievements.size);
  addAchievementToUI(id);
}
