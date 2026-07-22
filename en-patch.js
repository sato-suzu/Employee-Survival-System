// ==========================================
// 🌐 English Language Auto-Patch (JS + HTML)
// ==========================================
(function applyEnglishPatch() {
  // ブラウザ言語が日本語の場合はパッチを適用しない（自動判別）
  const userLang = navigator.language || navigator.userLanguage;
  if (userLang.startsWith('ja')) return;

  console.log("[i18n] Non-Japanese environment detected. Applying English Patch...");

  // ------------------------------------------
  // 1. ACHIEVEMENTS（実績）の上書き
  // ------------------------------------------
  if (typeof ACHIEVEMENTS !== 'undefined') {
    Object.assign(ACHIEVEMENTS, {
      FIRST_STEP: { title: "【Obsession with 5 PM】", desc: "Started the Clock-Out Survival Routine for the first time." },
      SURVIVED: { title: "【The Perfect Escape】", desc: "Successfully vanished at clock-out time without catching the manager's eye." },
      FORCE_OUT: { title: "【No-Overtime Terrorist】", desc: "Slammed the laptop shut and fled before target time." },
      CAFFEINE_ADDICT: { title: "【Legal High Status】", desc: "Downed 3+ energy drinks in a single work session." },
      OSHI_SAVIOR: { title: "【Power of Fandom】", desc: "Recovered from critical mental state (<=20) purely by staring at your favorite idol." },
      SANITY_ZERO: { title: "【Beyond PTO】", desc: "Complete mental collapse. Your consciousness automatically took Paid Time Off." },
      SOCIAL_DEATH: { title: "【Twilight of Dignity】", desc: "Failed the restroom rush countdown and suffered complete social demise." },
      CLOSE_CALL: { title: "【Cold Sweat: 20cm】", desc: "The manager approached within extreme lethal proximity (<=0.2m)." },
      ALASKA: { title: "【Alaskan Traveler】", desc: "Office AC turned the room into a freezer; nearly froze to death." },
      SLACK_BOMB: { title: "【Emoji Spammer】", desc: "Bombarded by Slack notifications; mental sanity reduced by red badges." },
      VPN_APOCALYPSE: { title: "【The Great Excuse】", desc: "Company VPN died; legally exempted from performing any work." },
      OVERDOSE: { title: "【Heart-Rate Turbo】", desc: "Overdosed on caffeine in seconds and almost stopped the space-time continuum." },
      GOD_TYPIST: { title: "【Master of Aggressive Typing】", desc: "Overwhelmed everyone around with furious, meaningless keystrokes." },
      LEGEND_SLACKER: { title: "【Ultimate Passive Income】", desc: "Reached clock-out time while accomplishing absolutely zero actual work." }
    });
  }

  // ------------------------------------------
  // 2. FAKE ACTIONS（偽装アクション）の上書き
  // ------------------------------------------
  if (typeof fakeActions !== 'undefined') {
    fakeActions.length = 0;
    fakeActions.push(
      "TYPING AGGRESSIVELY (Smashing mechanical keyboard to sound highly productive)",
      "INFINITE OUTLOOK SCROLL (Endlessly scrolling through inbox to look swamped)",
      "INTENSE CHIN HOLD (Posing as a senior dev stressed by a non-existent fatal bug)",
      "PRODUCING PROFICIENT SIGH (Audibly sighing so peers think you carry the team)",
      "BROWSING STACK OVERFLOW (Radiating 'hardworking engineer' vibes to the office)",
      "ANALYZING BOSS'S SIGHS (Acoustically monitoring manager's mood. Threat Level: MEDIUM)",
      "DEEP THINKING DINNER (Neural network currently computing dinner options)",
      "RANDOM MOUSE CIRCLES (Moving cursor in circles so Slack stays green)",
      "EXCEL CELL COLORING (Coloring random cells yellow then undoing it to fake analysis)",
      "GIT STATUS LOOP (Running 'git status' every 3 seconds to appear deeply focused)",
      "CHROME DEVTOOLS STARE (Frowning intensely at red console errors to look heroic)",
      "ADJUSTING GLASSES (Pushing glasses up to boost intellectual stack by 25%)",
      "NECK STRETCHING (Cracking neck to project 'hardcore warrior battling code' aura)",
      "DESK CLEANING (Wiping keycaps with wet wipes to simulate codebase refactoring)",
      "PEN CLICKING SPEEDRUN (Clicking pen silently to boost serotonin levels)",
      "STARING AT CEILING (Staring upward pretending to architect a complex system)",
      "CROSSING ARMS STERNLY (Frowning at power strip on floor to intimidate bugs)"
    );
  }

  // ------------------------------------------
  // 3. RANDOM EVENTS（通常イベント）の上書き
  // ------------------------------------------
  if (typeof randomEvents !== 'undefined') {
    randomEvents.length = 0;
    randomEvents.push(
      { text: "📧 CC HELL: Opened an email to find your name CC'd on an unassigned catastrophe.", effect: (s) => { modifyMental(-12); }, type: 'warn' },
      { text: "🍜 EVENING HOPE: Colleague declared 'I am leaving at 5 PM sharp for ramen.' Desire to flee maxed out.", effect: (s) => { modifyMental(8); }, type: 'info' },
      { text: "📝 MEETING MINUTES: 'Can someone take notes?' echoed at meeting end. Awkward silence ensued.", effect: (s) => { modifyMental(-18); }, type: 'error' },
      { text: "🎧 NOISE CANCEL: Equipped ANC headphones to block small talk. Disconnected from reality.", effect: (s) => { modifyMental(12); }, type: 'info' },
      { text: "🕵️ GAZE DETECTED: Felt manager glance from behind. Immediately Alt-Tabbed to Excel.", effect: (s) => { s.bossDistance = Math.max(CONFIG.BOSS.MIN_DISTANCE, s.bossDistance - 0.8); modifyMental(-10); }, type: 'warn' },
      { text: "💬 WRONG CHANNEL: Realized you sent a rant intended for a peer straight to the team lead.", effect: (s) => { modifyMental(-25); }, type: 'error' },
      { text: "🛗 ELEVATOR LAG: Stood at elevator ready to sprint, but it entered local floor stopping mode.", effect: (s) => { modifyMental(-7); }, type: 'warn' },
      { text: "👑 FREEDOM ATMOSPHERE: Neighboring team started packing up. Freedom energy fills the floor.", effect: (s) => { modifyMental(20); }, type: 'info' },
      { text: "📊 EXCEL COLLAPSE: Merged cells broke after 3 hours of work. Cause: Unknown.", effect: (s) => { modifyMental(-22); }, type: 'error' },
      { text: "☕ MACHINE FAILURE: Breakroom coffee maker went silent. Primary healing item unavailable.", effect: (s) => { modifyMental(-10); }, type: 'warn' },
      { text: "🧘 ZEN MODE: Perfected the art of pretending to work. You feel nothing now.", effect: (s) => { modifyMental(5); }, type: 'info' },
      { text: "📅 CALENDAR TERROR: Checked calendar to find an 8:00 AM meeting tomorrow. Despair.", effect: (s) => { modifyMental(-15); }, type: 'warn' },
      { text: "🦸 HERO APPEARS: Talented teammate said 'I can take over that task.' Witnessed a miracle.", effect: (s) => { modifyMental(25); }, type: 'info' },
      { text: "🔥 PROD INCIDENT: Major outage alarm sounded right before clock-out. World is ending.", effect: (s) => { modifyMental(-35); s.bossDistance = Math.max(CONFIG.BOSS.MIN_DISTANCE, s.bossDistance - 1.0); }, type: 'error' },
      { text: "👔 MANAGER'S MUTTER: Heard manager mutter: 'Ah, I guess I'm staying late today...'", effect: (s) => { s.bossDistance = Math.max(CONFIG.BOSS.MIN_DISTANCE, s.bossDistance - 1.2); modifyMental(-15); }, type: 'error' },
      { text: "🎮 GAMING BUFF: Remembered game patch finishes downloading tonight. Will to live restored.", effect: (s) => { modifyMental(15); }, type: 'info' },
      { text: "⚠️ @HERE MENTION: Slack @here popped up: 'Anyone available right now?' Hiding in stealth mode.", effect: (s) => { modifyMental(-15); }, type: 'warn' },
      { text: "🚨 LOCAL BUILD FAIL: Dev environment threw a mysterious crash. Stomach churned.", effect: (s) => { modifyMental(-20); }, type: 'error' },
      { text: "📞 DESK PHONE RINGS: Desk phone nearby is ringing continuously. Praying somebody picks up.", effect: (s) => { modifyMental(-10); }, type: 'warn' },
      { text: "🍡 WEIRD SNACKS: Colleague handed out mysterious souvenir snacks. Chewing to buy time.", effect: (s) => { modifyMental(10); }, type: 'info' },
      { text: "👣 AUDITORY HALLUCINATION: Thought you heard manager's footsteps in hallway. False alarm.", effect: (s) => { modifyMental(-5); }, type: 'warn' },
      { text: "💬 PEER DASH: Senior dev next to you sighed deeply, declared 'Have a good evening', and vanished.", effect: (s) => { modifyMental(-25); }, type: 'error' },
      { text: "☕️ SERENE SILENCE: The entire floor fell completely quiet. Perfect eye of the storm.", effect: (s) => { modifyMental(5); }, type: 'info' },
      { text: "👹 DEVIL'S WHISPER: Manager started phrase with 'Oh by the way...'. ALERT LEVEL MAX!", effect: (s) => { s.bossDistance = Math.max(CONFIG.BOSS.MIN_DISTANCE, s.bossDistance - 1.5); }, type: 'error' },
      { text: "💻 WINDOWS UPDATE: 'Updating... 1% Completed'. Forced reboot panic sets in!", effect: (s) => { modifyMental(-15); }, type: 'error' },
      { text: "👥 CHATTER TRAP: Team nearby discussing weekend plans. Deployed heavy sigh to prevent conversation.", effect: (s) => { modifyMental(-8); }, type: 'warn' },
      { text: "👀 SENSING EYES: Senior dev looking toward your screen. Closed reddit tab instantaneously.", effect: (s) => { modifyMental(-12); }, type: 'warn' },
      { text: "🍫 SECRET STASH: Found 3-month expired chocolate at bottom of drawer. Consumed for survival!", effect: (s) => { modifyMental(15); }, type: 'info' },
      { text: "👻 SHADOW BEHIND: Horror! Realized manager was standing right behind you talking to a peer!", effect: (s) => { s.bossDistance = CONFIG.BOSS.WARP_DISTANCE; modifyMental(-30); }, type: 'error' },
      { text: "⏳ MEETING EXTENSION: 'One last quick thing...' marks the real start of the meeting.", effect: (s) => { modifyMental(-18); }, type: 'error' },
      { text: "💥 MAIL CHAOS: 'Please stop Reply-All' sent via Reply-All to 5,000 employees. Inbox crashed.", effect: (s) => { modifyMental(-15); }, type: 'error' },
      { text: "⚠️ PRINTER JAM: Paper jam error right before your print job finished. Stress rising.", effect: (s) => { modifyMental(-10); }, type: 'warn' },
      { text: "🥱 MORNING RITUAL: Morning standup with zero updates. Pure corporate motivational talk.", effect: (s) => { modifyMental(-12); }, type: 'warn' },
      { text: "👁‍ DIRECTOR PATROL: Director pacing floor with arms behind back. Distance closing fast!", effect: (s) => { s.bossDistance = Math.max(CONFIG.BOSS.MIN_DISTANCE, s.bossDistance - 2.0); modifyMental(-10); }, type: 'error' },
      { text: "🔊 LOUD CALL: Neighbor started headset-less call at max volume: 'YES! REGARDING OUR Q3 ROADMAP!'", effect: (s) => { modifyMental(-14); }, type: 'warn' },
      { text: "🥶 FREEZING AC: Office AC set to Arctic levels (65°F/18°C). Fingers freezing up.", effect: (s) => { modifyMental(-8); unlockAchievement('ALASKA'); }, type: 'warn' },
      { text: "☠️ VPN DOWN: 'Connection lost to VPN'. Work completely halted legally.", effect: (s) => { modifyMental(-25); unlockAchievement('VPN_APOCALYPSE'); }, type: 'error' },
      { text: "🖨 SPOOLING FOREVER: Print job stuck in 'Spooling'. Feeling pressure from person behind.", effect: (s) => { modifyMental(-9); }, type: 'warn' },
      { text: "💣 SLACK STAMPEDE: Emoji reaction war broken out in general channel. Red badge count exploding.", effect: (s) => { modifyMental(-7); unlockAchievement('SLACK_BOMB'); }, type: 'info' },
      { text: "🔧 SCOPE CREEP: 'Hey, let's scrap that feature and integrate this API instead before 5 PM.'", effect: (s) => { modifyMental(-28); }, type: 'error' },
      { text: "🤫 BREAKROOM RUMOR: Overheard 'Bonus pool might get adjusted down this quarter' near water cooler.", effect: (s) => { modifyMental(-15); }, type: 'warn' },
      { text: "🔋 MOUSE BATTERY DEAD: Wireless mouse completely unresponsive. Commencing drawer excavation.", effect: (s) => { modifyMental(-9); }, type: 'warn' },
      { text: "📅 PASSWORD EXPIRED: 'Your password expired. Must not match last 3 passwords.' Pain.", effect: (s) => { modifyMental(-14); }, type: 'error' }
    );
  }

  // ------------------------------------------
  // 4. TOILET OBSTACLES（トイレ邪魔イベント）の上書き
  // ------------------------------------------
  if (typeof TOILET_OBSTACLE_EVENTS !== 'undefined') {
    TOILET_OBSTACLE_EVENTS.length = 0;
    TOILET_OBSTACLE_EVENTS.push(
      { text: "🚧 RESTROOM BLOCKED: Manager chatting with colleague right outside the door. Retreated quietly...", effect: (s) => { modifyMental(-12); s.bossDistance = Math.max(CONFIG.BOSS.MIN_DISTANCE, s.bossDistance - 0.6); } },
      { text: "🚧 RESTROOM BLOCKED: Plumber declared 'Out of Order for emergency maintenance!'. Despair.", effect: (s) => { modifyMental(-15); } },
      { text: "🚧 RESTROOM BLOCKED: Reached stall only to find an empty cardboard roll. Silent retreat.", effect: (s) => { modifyMental(-12); } },
      { text: "🚧 RESTROOM BLOCKED: 'Cleaning in Progress' sign standing like an impenetrable wall.", effect: (s) => { modifyMental(-10); } },
      { text: "🚧 RESTROOM BLOCKED: 5 people waiting in line right after lunch! Queue moving at 0 mph.", effect: (s) => { modifyMental(-18); s.bossDistance = Math.max(CONFIG.BOSS.MIN_DISTANCE, s.bossDistance - 0.8); } },
      { text: "🚧 RESTROOM BLOCKED: Realized keycard was left at desk. Locked out of office floor.", effect: (s) => { modifyMental(-10); } },
      { text: "🚧 RESTROOM BLOCKED: Stall door lock stuck tight. Fled in panic fearing permanent trap.", effect: (s) => { modifyMental(-15); } }
    );
  }

  // ------------------------------------------
  // 5. HTML DOM TEXT OVERWRITE (画面の英語化)
  // ------------------------------------------
  document.addEventListener('DOMContentLoaded', () => {
    document.title = "System Operation Monitor (Audit Log)";

    const setText = (selector, text) => {
      const el = document.querySelector(selector);
      if (el) el.innerText = text;
    };

    setText('h1', 'EMPLOYEE SURVIVAL SYSTEM v1.0.6');

    const statusBox = document.querySelector('.status-box');
    if (statusBox) {
      statusBox.innerHTML = statusBox.innerHTML
        .replace('ステータス:', 'STATUS:')
        .replace('メンタル:', 'MENTAL:')
        .replace('上司の距離:', 'BOSS DISTANCE:');
    }

    setText('label[for="input-target-time"]', 'Target Clock-Out Time:');

    const lifehackTitle = document.querySelector('div[style*="MENTAL LIFEHACKS"]');
    if (lifehackTitle) lifehackTitle.innerText = "MENTAL LIFEHACKS:";

    setText('#btn-toilet', 'Restroom Refuge');
    setText('#btn-cafe', 'Energy Drink');
    setText('#btn-oshi', 'Stare at Favorite');

    const audioLabel = document.querySelector('span[style*="オーディオ出力設定"]');
    if (audioLabel) audioLabel.innerText = "Audio Output:";

    const btnMute = document.querySelector('#btn-mute');
    if (btnMute && btnMute.innerText.includes('ON')) {
      btnMute.innerText = "🔊 Sound: ON";
    }

    const initLog = document.querySelector('#log-area div');
    if (initLog && initLog.innerText.includes('待機中')) {
      initLog.innerText = "[SYSTEM] Ready... Please initiate the program.";
    }

    setText('.achievement-title span', 'UNLOCKED ACHIEVEMENTS:');
    const emptyAchieve = document.querySelector('#achievement-list span');
    if (emptyAchieve && emptyAchieve.innerText.includes('未解除')) {
      emptyAchieve.innerText = "(None Unlocked)";
    }

    setText('#btn-start', 'Initiate Routine');
    setText('#btn-escape', 'Emergency Dash');
  });
})();
