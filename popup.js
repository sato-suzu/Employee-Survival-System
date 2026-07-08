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
  bossDistance: 5.0        // 上司の初期位置（5.0m）
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

  logArea.innerHTML += `<div style="color: ${color}">[${now}] ${text}</div>`;
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
  if (state.mentalGauge > 50) mentalEl.style.color = '#fbbf24';
  else if (state.mentalGauge > 20) mentalEl.style.color = '#f97316';
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

  // 状態初期化
  state.isBoredToDeath = true;
  state.isHomeProtocolExecuted = false;
  state.isBossAlerted = false;
  state.bossDistance = 5.0;
  state.mentalGauge = 100;
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
  
  loop();
}

async function loop() {
  while (state.isBoredToDeath) {
    const now = new Date();
    const currentTime = { hours: now.getHours(), minutes: now.getMinutes(), seconds: now.getSeconds() };
    
    // 1. ランダムウォークによる上司の距離計算
    const step = (Math.random() * 0.8) - 0.4; 
    state.bossDistance = Math.min(5.0, Math.max(0.1, state.bossDistance + step));
    
    const bossDistStr = state.bossDistance.toFixed(1);
    setTargetText('distance', bossDistStr + 'm');

    // 2. 上司の接近判定（緊急偽装モード）
    if (state.bossDistance < 1.0) {
      if (!state.isBossAlerted) {
        state.isBossAlerted = true;
        appendLog(`💥 警告: 上司接近！（現在値: ${bossDistStr}m）『奴が来たーー！』`, 'warn');
        appendLog("[SYSTEM] EMERGENCY MODE: FAKE DEEP THINKING STARTED.", 'error');

        const randomUrl = fakeWorkSites[Math.floor(Math.random() * fakeWorkSites.length)];
        if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
          chrome.runtime.sendMessage({ action: "openWorkSite", url: randomUrl });
        }
      }
      // 接近中はランダムアクションのログを出さず、効果音も鳴らさない（緊迫感を表現）
    } else {
      if (state.isBossAlerted) {
        appendLog(`🍃 状況報告: 奴が離れていきました（現在値: ${bossDistStr}m）。偽装を一時解除します。`);
        state.isBossAlerted = false;
      }

      // 安全圏の時のみ、通常偽装アクションを実行
      const randomAction = fakeActions[Math.floor(Math.random() * fakeActions.length)];
      appendLog(`STATUS: ACTIVE... [ACTION] ${randomAction}`);
      playBeep();
    }

    // 3. 定時判定
    if (checkTimeReached(currentTime, state.targetTime) && !state.isHomeProtocolExecuted) {
      state.isHomeProtocolExecuted = true;
      appendLog("[SYSTEM] EVADING_ALL_OVERTIME 【定時ダッシュ！】");
      appendLog("[SYSTEM] *PSHUT!* 🍺 (ぷはぁ)");
      appendLog(`"BYE BYE COMPANY! お先に失礼します！(^-^)"`);
      setTargetText('status', 'HOME_SAFE');
      shutdownSystem();
      break;
    }

    // 4. メンタル消費（※上司が近くにいても等しく削られる絶望感を再現）
    consumeMental(1);
    
    // メンタル崩壊や外部からのシャットダウンによるループ離脱判定
    if (!state.isBoredToDeath) break;

    // 次の1秒へ
    await new Promise(r => setTimeout(r, 1000));
  }
}

// メンタル消費とサーバーダウン判定の一元化
function consumeMental(amount) {
  state.mentalGauge = Math.max(0, state.mentalGauge - amount);
  updateMentalUI();

  if (state.mentalGauge <= 0) {
    setTargetText('status', 'CRASHED');
    appendLog("[FATAL] 精神的サーバーダウン。限界です。意識が有給休暇を取得しました。", 'error');
    shutdownSystem();
    setTimeout(() => {
      alert("メンタルが崩壊しました！今すぐ有給を申請してください！");
    }, 100);
  }
}

function shutdownSystem() {
  state.isBoredToDeath = false;
  
  const btnStart = document.getElementById('btn-start');
  const inputTime = document.getElementById('input-target-time');
  if (btnStart) btnStart.disabled = false;
  if (inputTime) inputTime.disabled = false;
  
  toggleLifehackButtons(false);

  if (state.caffeineTimeoutId) {
    clearTimeout(state.caffeineTimeoutId);
    state.caffeineTimeoutId = null;
  }
}

// ==========================================
// ライフハック（回復コマンド）
// ==========================================
function useToilet() {
  if (!state.isBoredToDeath) return;
  state.mentalGauge = Math.min(100, state.mentalGauge + 15);
  updateMentalUI();
  appendLog("[LIFEHACK] 個室トイレに避難完了。個人の尊厳を一時的に回復 (+15)", 'warn');
}

function useCaffeine() {
  if (!state.isBoredToDeath) return;
  state.mentalGauge = Math.min(100, state.mentalGauge + 30);
  updateMentalUI();
  appendLog("[LIFEHACK] エナジードリンクをキメました。脳を強制駆動 (+30)", 'warn');

  if (state.caffeineTimeoutId) clearTimeout(state.caffeineTimeoutId);

  state.caffeineTimeoutId = setTimeout(() => {
    if (state.isBoredToDeath) {
      appendLog("[DEBUFF] カフェインの加護が終了。猛烈な反動が脳を襲う (-40)", 'error');
      consumeMental(40);
    }
  }, 5000);
}

function watchOshi() {
  if (!state.isBoredToDeath) return;
  state.mentalGauge = Math.min(100, state.mentalGauge + 50);
  updateMentalUI();
  appendLog("[LIFEHACK] 推しの画像を0.5秒凝視。尊さにより生命力が爆増 (+50)", 'warn');
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
  osc.frequency.setValueAtTime(1000, state.audioCtx.currentTime);
  gain.gain.setValueAtTime(0.005, state.audioCtx.currentTime);

  osc.connect(gain);
  gain.connect(state.audioCtx.destination);

  osc.start();
  osc.stop(state.audioCtx.currentTime + 0.03);

  // メモリリーク防止（使い終わったら明示的に切断）
  setTimeout(() => {
    osc.disconnect();
    gain.disconnect();
  }, 100);
}

function forceEscape() {
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