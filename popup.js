// 状態管理を一元化
const state = {
  isBoredToDeath: false,
  mentalGauge: 100,
  isHomeProtocolExecuted: false,
  isBossAlerted: false,
  targetTime: { hours: 17, minutes: 45, seconds: 0 },
  audioCtx: null,          // AudioContext シングルトン保持用
  caffeineTimeoutId: null  // カフェインデバフのタイマーID保持用
};

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

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('btn-start').addEventListener('click', startRoutine);
  document.getElementById('btn-escape').addEventListener('click', forceEscape);

  document.getElementById('btn-toilet').addEventListener('click', useToilet);
  document.getElementById('btn-cafe').addEventListener('click', useCaffeine);
  document.getElementById('btn-oshi').addEventListener('click', watchOshi);

  toggleLifehackButtons(false);
});

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
  document.getElementById('btn-toilet').disabled = !enabled;
  document.getElementById('btn-cafe').disabled = !enabled;
  document.getElementById('btn-oshi').disabled = !enabled;
}

function startRoutine() {
  if (state.isBoredToDeath) return;

  const timeInput = document.getElementById('input-target-time').value;
  if (timeInput) {
    const [hours, minutes] = timeInput.split(':').map(Number);
    state.targetTime.hours = hours;
    state.targetTime.minutes = minutes;
    state.targetTime.seconds = 0;
  }

  state.isBoredToDeath = true;
  document.getElementById('btn-start').disabled = true;
  document.getElementById('input-target-time').disabled = true;

  toggleLifehackButtons(true);
  document.getElementById('status').innerText = 'WAITING_FOR_TEIJI';

  const hStr = String(state.targetTime.hours).padStart(2, '0');
  const mStr = String(state.targetTime.minutes).padStart(2, '0');
  appendLog(`[SYSTEM] 定時退勤生存ルーチンを開始。ターゲット：${hStr}:${mStr} 脱出`);
  loop();
}

async function loop() {
  while (state.isBoredToDeath) {
    const now = new Date();
    const currentTime = { hours: now.getHours(), minutes: now.getMinutes(), seconds: now.getSeconds() };
// 上司接近システムのシミュレート
const bossDist = (Math.random() * 5).toFixed(1);
document.getElementById('distance').innerText = bossDist + 'm';

if (parseFloat(bossDist) < 1.0) {
  if (!state.isBossAlerted) {
    state.isBossAlerted = true;
    appendLog("💥 警告: 上司接近！『奴が来たーー！』", 'warn');
    appendLog("[SYSTEM] EMERGENCY MODE: FAKE DEEP THINKING STARTED.", 'error');

    // リストからランダムでURLを選択
    const randomUrl = fakeWorkSites[Math.floor(Math.random() * fakeWorkSites.length)];

    chrome.runtime.sendMessage({
      action: "openWorkSite",
      url: randomUrl
    });
  }

  await new Promise(r => setTimeout(r, 5000));
  state.isBossAlerted = false;
  continue;
}else {
      state.isBossAlerted = false;
    }

    // 定時判定
    if (checkTimeReached(currentTime, state.targetTime) && !state.isHomeProtocolExecuted) {
      state.isHomeProtocolExecuted = true;
      appendLog("[SYSTEM] EVADING_ALL_OVERTIME 【定時ダッシュ！】");
      appendLog("[SYSTEM] *PSHUT!* 🍺 (ぷはぁ)");
      appendLog(`"BYE BYE COMPANY! お先に失礼します！(^-^)"`);
      document.getElementById('status').innerText = 'HOME_SAFE';
      shutdownSystem();
      break;
    }

    // 通常稼働
    state.mentalGauge--;
    updateMentalUI();

    if (state.mentalGauge <= 0) {
      document.getElementById('status').innerText = 'CRASHED';
      appendLog("[FATAL] 精神的サーバーダウン。限界です。意識が有給休暇を取得しました。", 'error');
      shutdownSystem();
      alert("メンタルが崩壊しました！今すぐ有給を申請してください！");
      break;
    }

    const randomAction = fakeActions[Math.floor(Math.random() * fakeActions.length)];
    appendLog(`STATUS: ACTIVE... [ACTION] ${randomAction}`);
    playBeep();

    await new Promise(r => setTimeout(r, 1000));
  }
}

function shutdownSystem() {
  state.isBoredToDeath = false;
  document.getElementById('btn-start').disabled = false;
  document.getElementById('input-target-time').disabled = false;
  toggleLifehackButtons(false);

  // カフェインのタイマーが動いていたら安全に削除
  if (state.caffeineTimeoutId) {
    clearTimeout(state.caffeineTimeoutId);
    state.caffeineTimeoutId = null;
  }
}

function updateMentalUI() {
  const mentalEl = document.getElementById('mental');
  if (!mentalEl) return;
  mentalEl.innerText = state.mentalGauge;
  if (state.mentalGauge > 50) mentalEl.style.color = '#fbbf24';
  else if (state.mentalGauge > 20) mentalEl.style.color = '#f97316';
  else mentalEl.style.color = '#ef4444';
}

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
      state.mentalGauge = Math.max(0, state.mentalGauge - 40);
      updateMentalUI();
      appendLog("[DEBUFF] カフェインの加護が終了。猛烈な反動が脳を襲う (-40)", 'error');

      if (state.mentalGauge <= 0) {
        document.getElementById('status').innerText = 'CRASHED';
        appendLog("[FATAL] 精神的サーバーダウン。限界です。", 'error');
        shutdownSystem();
        alert("メンタルが崩壊しました！今すぐ有給を申請してください！");
      }
    }
  }, 5000);
}

function watchOshi() {
  if (!state.isBoredToDeath) return;
  state.mentalGauge = Math.min(100, state.mentalGauge + 50);
  updateMentalUI();
  appendLog("[LIFEHACK] 推しの画像を0.5秒凝視。尊さにより生命力が爆増 (+50)", 'warn');
}

function playBeep() {
  // シングルトン化：存在しない場合のみ生成
  if (!state.audioCtx) {
    state.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }

  // ブラウザの自動再生ブロック対策
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
}

function forceEscape() {
  shutdownSystem();
  document.getElementById('status').innerText = 'FORCE_QUITTED';
  appendLog("[SYSTEM] 偽装を解除。定時を待たずに脱出します！", 'error');
  alert("お疲れ様でした！今すぐPCを閉じて帰りましょう！");
}

function checkTimeReached(now, target) {
  return (now.hours > target.hours) ||
    (now.hours === target.hours && now.minutes > target.minutes) ||
    (now.hours === target.hours && now.minutes === target.minutes && now.seconds >= target.seconds);
}
