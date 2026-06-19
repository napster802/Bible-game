/* ============================================================
   Bible Challenge Arena — app.js
   Complete offline Android WebView quiz game logic
   ============================================================ */

const App = (function () {
  'use strict';

  // ─────────────────────────────────────────────────────────────
  // STATE
  // ─────────────────────────────────────────────────────────────
  let state = {
    mode: 'multi',
    difficulty: 'easy',
    timeLimit: 30,
    questions: [],
    currentQ: 0,
    players: [],
    currentPlayer: 0,
    paused: false,
    answered: false,
    timerInterval: null,
    timeLeft: 30,
    questionStartTime: 0,
    selectedAvatar: '😊',
    settings: {
      darkMode: true,
      sound: true,
      volume: 70,
      shuffle: true,
      showRefs: true,
      antiCheat: false,
      questionCount: 10
    }
  };

  // ─────────────────────────────────────────────────────────────
  // CONSTANTS
  // ─────────────────────────────────────────────────────────────
  const AVATARS = ['😊','🦁','🌟','👑','🕊️','🔥','⚡','🌊','🌺','🎯','🏆','📖','📜','🙏','🌈','⚔️'];
  const CIRCUMFERENCE = 113.1; // 2π × 18

  const ACHIEVEMENTS = [
    { id: 'first_win',    badge: '🏆', title: 'First Victory',   desc: 'Win your first game' },
    { id: 'perfect',      badge: '💯', title: 'Perfect Score',    desc: 'Answer all questions correctly' },
    { id: 'speed_demon',  badge: '⚡', title: 'Speed Demon',      desc: 'Answer 3 questions in under 3 seconds each' },
    { id: 'scholar',      badge: '📚', title: 'Bible Scholar',    desc: 'Complete Expert difficulty' },
    { id: 'veteran',      badge: '🎖️', title: 'Veteran',          desc: 'Play 10 games total' },
  ];

  // ─────────────────────────────────────────────────────────────
  // AUDIO
  // ─────────────────────────────────────────────────────────────
  let audioCtx = null;

  function getAudioCtx() {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    return audioCtx;
  }

  function playSound(type) {
    if (!state.settings.sound) return;
    try {
      const ctx = getAudioCtx();
      const vol = state.settings.volume / 100;
      const gain = ctx.createGain();
      gain.connect(ctx.destination);
      gain.gain.value = vol * 0.3;

      if (type === 'correct') {
        [523, 659, 784].forEach((freq, i) => {
          const osc = ctx.createOscillator();
          osc.connect(gain);
          osc.frequency.value = freq;
          osc.type = 'sine';
          osc.start(ctx.currentTime + i * 0.1);
          osc.stop(ctx.currentTime + i * 0.1 + 0.2);
        });
      } else if (type === 'wrong') {
        const osc = ctx.createOscillator();
        osc.connect(gain);
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(300, ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(100, ctx.currentTime + 0.4);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.4);
      } else if (type === 'tick') {
        const osc = ctx.createOscillator();
        osc.connect(gain);
        osc.type = 'sine';
        osc.frequency.value = 800;
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.05);
      } else if (type === 'fanfare') {
        [[523,0],[659,0.15],[784,0.3],[1047,0.45]].forEach(([freq, delay]) => {
          const osc = ctx.createOscillator();
          osc.connect(gain);
          osc.type = 'triangle';
          osc.frequency.value = freq;
          osc.start(ctx.currentTime + delay);
          osc.stop(ctx.currentTime + delay + 0.25);
        });
      }
    } catch (e) {
      // Audio unavailable — silently ignore
    }
  }

  // ─────────────────────────────────────────────────────────────
  // CONFETTI
  // ─────────────────────────────────────────────────────────────
  let confettiAnimId = null;
  let confettiParts = [];

  function startConfetti() {
    const canvas = document.getElementById('confetti-canvas');
    if (!canvas) return;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const ctx = canvas.getContext('2d');
    const colors = ['#f5d020','#e74c3c','#3498db','#27ae60','#8e44ad','#f39c12','#ffffff'];

    confettiParts = Array.from({ length: 150 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height - canvas.height,
      r: Math.random() * 8 + 4,
      d: Math.random() * 150,
      color: colors[Math.floor(Math.random() * colors.length)],
      tilt: Math.floor(Math.random() * 10) - 10,
      tiltAngle: 0,
      tiltAngleIncrement: Math.random() * 0.07 + 0.05,
      opacity: 1
    }));

    let angle = 0;
    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      angle += 0.01;
      confettiParts.forEach((p, i) => {
        p.tiltAngle += p.tiltAngleIncrement;
        p.y += (Math.cos(angle + p.d) + 2 + p.r / 10);
        p.x += Math.sin(angle);
        p.tilt = Math.sin(p.tiltAngle) * 15;
        if (p.y > canvas.height) {
          if (i % 3 === 0) { p.x = Math.random() * canvas.width; p.y = -20; }
          else { p.y = -20; }
        }
        ctx.save();
        ctx.globalAlpha = p.opacity;
        ctx.beginPath();
        ctx.lineWidth = p.r / 2;
        ctx.strokeStyle = p.color;
        ctx.moveTo(p.x + p.tilt + p.r / 3, p.y);
        ctx.lineTo(p.x + p.tilt, p.y + p.tilt + p.r / 5);
        ctx.stroke();
        ctx.restore();
      });
      confettiAnimId = requestAnimationFrame(draw);
    }
    draw();
    setTimeout(stopConfetti, 6000);
  }

  function stopConfetti() {
    if (confettiAnimId) {
      cancelAnimationFrame(confettiAnimId);
      confettiAnimId = null;
    }
    const canvas = document.getElementById('confetti-canvas');
    if (canvas) canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
  }

  // ─────────────────────────────────────────────────────────────
  // TOAST
  // ─────────────────────────────────────────────────────────────
  function showToast(msg, type = 'info', duration = 2500) {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = msg;
    container.appendChild(toast);
    // Trigger animation
    requestAnimationFrame(() => toast.classList.add('toast-visible'));
    setTimeout(() => {
      toast.classList.remove('toast-visible');
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }

  // ─────────────────────────────────────────────────────────────
  // SCREEN NAVIGATION
  // ─────────────────────────────────────────────────────────────
  function goTo(screenName) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const target = document.getElementById('screen-' + screenName);
    if (target) target.classList.add('active');
    // Call lifecycle hook if it exists
    const hookName = 'onEnter_' + screenName;
    if (typeof hooks[hookName] === 'function') {
      hooks[hookName]();
    }
  }

  // Lifecycle hooks object (populated below)
  const hooks = {};

  hooks['onEnter_player-setup'] = function () {
    renderAvatarPicker();
    renderPlayerList();
    updateStartBtn();
  };

  hooks['onEnter_history'] = function () {
    loadHistory();
  };

  hooks['onEnter_settings'] = function () {
    applySettingsToUI();
    applyGameOptionsLock();
  };

  hooks['onEnter_results'] = function () {
    renderResults();
  };

  hooks['onEnter_profile'] = function () {
    if (typeof Profile !== 'undefined') Profile.onEnterProfileScreen();
  };

  hooks['onEnter_join-entry'] = function () {
    if (typeof JoinGame !== 'undefined') JoinGame.onEnterJoinEntry();
  };

  hooks['onEnter_my-profile'] = function () {
    if (typeof Profile !== 'undefined') Profile.onEnterMyProfileScreen();
  };

  hooks['onEnter_shop'] = function () {
    if (typeof Shop !== 'undefined') Shop.onEnterShop();
  };

  hooks['onEnter_host-lobby'] = function () {
    if (typeof HostGame !== 'undefined') HostGame.onEnterHostLobby();
  };

  // ─────────────────────────────────────────────────────────────
  // AVATAR PICKER
  // ─────────────────────────────────────────────────────────────
  function renderAvatarPicker() {
    const row = document.getElementById('avatar-row');
    if (!row) return;
    row.innerHTML = '';
    AVATARS.forEach(emoji => {
      const btn = document.createElement('button');
      btn.className = 'avatar-btn' + (emoji === state.selectedAvatar ? ' selected' : '');
      btn.textContent = emoji;
      btn.onclick = () => {
        state.selectedAvatar = emoji;
        document.querySelectorAll('.avatar-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
      };
      row.appendChild(btn);
    });
  }

  // ─────────────────────────────────────────────────────────────
  // GAME SETUP
  // ─────────────────────────────────────────────────────────────
  function selectMode(mode) {
    state.mode = mode;
    state.players = [];
    if (mode === 'daily') {
      // Daily Challenge uses a fixed difficulty/timer so every player on a
      // given calendar day faces the same deterministic question set.
      state.difficulty = 'medium';
      state.timeLimit = 25;
      state.selectedAvatar = AVATARS[0];
      goTo('player-setup');
    } else {
      goTo('difficulty');
    }
  }

  // ─────────────────────────────────────────────────────────────
  // MULTIPLAYER ENTRY (gated behind Player Profile)
  // ─────────────────────────────────────────────────────────────
  function goHostGame() {
    Admin.requireAdmin(function () {
      if (typeof Profile !== 'undefined' && Profile.exists()) {
        HostGame.createRoom();
      } else {
        sessionStorage.setItem('bca_pending_action', 'host');
        goTo('profile');
      }
    });
  }

  function goJoinGame() {
    if (typeof Profile !== 'undefined' && Profile.exists()) {
      goTo('join-entry');
    } else {
      sessionStorage.setItem('bca_pending_action', 'join');
      goTo('profile');
    }
  }

  function goMyProfile() {
    if (typeof Profile !== 'undefined' && Profile.exists()) {
      goTo('my-profile');
    } else {
      sessionStorage.setItem('bca_pending_action', 'my-profile');
      goTo('profile');
    }
  }

  function goShop() {
    if (typeof Profile !== 'undefined' && Profile.exists()) {
      goTo('shop');
    } else {
      sessionStorage.setItem('bca_pending_action', 'shop');
      goTo('profile');
    }
  }

  function profileSaveContinue() {
    const nameInput = document.getElementById('profile-name-input');
    const name = nameInput ? nameInput.value.trim() : '';
    if (!name) {
      showToast('Please enter your name', 'error');
      return;
    }
    const saveBtn = document.getElementById('profile-save-btn');
    const pending = sessionStorage.getItem('bca_pending_action');
    sessionStorage.removeItem('bca_pending_action');
    if (saveBtn) saveBtn.disabled = true;
    Profile.saveFromForm(pending ? 'skip' : 'home')
      .then(function () {
        if (saveBtn) saveBtn.disabled = false;
        if (pending === 'host') HostGame.createRoom();
        else if (pending === 'join') goTo('join-entry');
        else if (pending === 'my-profile') goTo('my-profile');
        else if (pending === 'shop') goTo('shop');
      })
      .catch(function () {
        if (saveBtn) saveBtn.disabled = false;
      });
  }

  function selectDifficulty(diff) {
    state.difficulty = diff;
    const timeLimits = { easy: 30, medium: 25, hard: 20, expert: 15 };
    state.timeLimit = state.mode === 'speed' ? 10 : (timeLimits[diff] || 30);
    state.players = [];
    state.selectedAvatar = AVATARS[0];
    goTo('player-setup');
  }

  function backFromPlayerSetup() {
    goTo(state.mode === 'daily' ? 'mode' : 'difficulty');
  }

  function addPlayer() {
    const input = document.getElementById('player-name-input');
    if (!input) return;
    const name = input.value.trim();

    if (!name) {
      showToast('Please enter a player name.', 'warn');
      input.focus();
      return;
    }
    if (state.players.some(p => p.name.toLowerCase() === name.toLowerCase())) {
      showToast('That name is already taken.', 'warn');
      input.focus();
      return;
    }
    if (state.players.length >= 8) {
      showToast('Maximum 8 players allowed.', 'warn');
      return;
    }

    state.players.push({
      name: name,
      avatar: state.selectedAvatar,
      score: 0,
      correct: 0,
      totalTime: 0,
      answers: []
    });

    input.value = '';
    // Rotate to a next unused avatar
    const used = state.players.map(p => p.avatar);
    const next = AVATARS.find(a => !used.includes(a)) || AVATARS[0];
    state.selectedAvatar = next;
    renderAvatarPicker();
    renderPlayerList();
    updateStartBtn();
    input.focus();
  }

  function renderPlayerList() {
    const list = document.getElementById('player-list');
    if (!list) return;
    if (state.players.length === 0) {
      list.innerHTML = '<p class="empty-msg" style="text-align:center;opacity:0.5;">No players yet</p>';
    } else {
      list.innerHTML = state.players.map((p, i) => `
        <div class="player-item">
          <span class="player-avatar">${p.avatar}</span>
          <span class="player-name">${escHtml(p.name)}</span>
          <button class="btn-remove" onclick="App.removePlayer(${i})">✕</button>
        </div>
      `).join('');
    }
    updateStartBtn();
  }

  function removePlayer(idx) {
    state.players.splice(idx, 1);
    renderPlayerList();
  }

  function updateStartBtn() {
    const btn = document.getElementById('start-btn');
    const hint = document.getElementById('player-hint');
    if (!btn) return;
    const count = state.players.length;
    btn.disabled = count < 1;
    if (hint) {
      if (count === 0) {
        hint.textContent = 'Add at least 1 player to start';
      } else if (state.mode === 'multi' && count < 2) {
        hint.textContent = 'Add at least 2 players for Pass & Play mode (or start solo)';
      } else {
        hint.textContent = `${count} player${count > 1 ? 's' : ''} ready — let's go!`;
      }
    }
  }

  // ─────────────────────────────────────────────────────────────
  // GAME START
  // ─────────────────────────────────────────────────────────────
  function startGame() {
    if (state.players.length < 1) {
      showToast('Add at least 1 player to start.', 'warn');
      return;
    }

    // Load and optionally shuffle question pool
    let pool = (QUESTION_DB[state.difficulty] || []).slice();
    let count;
    if (state.mode === 'daily') {
      // Same date-seeded shuffle for everyone, so all players face an
      // identical question set on a given calendar day.
      seededShuffle(pool, todaySeed());
      count = Math.min(10, pool.length);
    } else {
      if (state.settings.shuffle) fisherYates(pool);
      count = Math.min(state.settings.questionCount, pool.length);
    }
    state.questions = pool.slice(0, count);

    if (state.questions.length === 0) {
      showToast('No questions available for this difficulty.', 'error');
      return;
    }

    // Reset players
    state.players.forEach(p => {
      p.score = 0;
      p.correct = 0;
      p.totalTime = 0;
      p.answers = [];
    });

    state.currentQ = 0;
    state.currentPlayer = 0;
    state.paused = false;
    state.answered = false;

    loadQuestion();
  }

  function fisherYates(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
  }

  function todaySeed() {
    const d = new Date();
    const dateStr = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
    let hash = 0;
    for (let i = 0; i < dateStr.length; i++) {
      hash = (hash << 5) - hash + dateStr.charCodeAt(i);
      hash |= 0;
    }
    return hash >>> 0;
  }

  function seededShuffle(arr, seed) {
    let s = seed || 1;
    const rand = function () {
      s |= 0; s = (s + 0x6D2B79F5) | 0;
      let t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
  }

  // ─────────────────────────────────────────────────────────────
  // QUESTION FLOW
  // ─────────────────────────────────────────────────────────────
  function loadQuestion() {
    if (state.currentQ >= state.questions.length) {
      endGame();
      return;
    }

    const isMulti = state.players.length > 1;

    if (isMulti) {
      showPassScreen();
    } else {
      // Single player — go straight to question
      goTo('question');
      renderQuestion();
    }
  }

  function showPassScreen() {
    const player = state.players[state.currentPlayer];
    const nameEl = document.getElementById('pass-player-name');
    const name2El = document.getElementById('pass-player-name2');
    const avatarEl = document.getElementById('pass-avatar');
    if (nameEl)  nameEl.textContent  = player.name;
    if (name2El) name2El.textContent = player.name;
    if (avatarEl) avatarEl.textContent = player.avatar;
    goTo('pass');
  }

  function beginPlayerTurn() {
    goTo('question');
    renderQuestion();
  }

  function renderQuestion() {
    const q = state.questions[state.currentQ];
    const total = state.questions.length;
    const player = state.players[state.currentPlayer];

    // Header info
    setText('q-number', `Q ${state.currentQ + 1}/${total}`);
    setText('q-category', q.category || '');
    setText('q-text', q.question);

    // Choice buttons
    for (let i = 0; i < 4; i++) {
      const txtEl = document.getElementById('c' + i + '-txt');
      const btn   = document.getElementById('c' + i);
      if (txtEl) txtEl.textContent = q.choices[i] || '';
      if (btn) {
        btn.className = btn.className.replace(/\b(correct|wrong|reveal-correct|disabled)\b/g, '').trim();
        btn.disabled = false;
      }
    }

    // Player turn badge (multi-player)
    const badge = document.getElementById('player-turn-badge');
    if (badge) {
      if (state.players.length > 1) {
        badge.style.display = 'flex';
        setText('turn-avatar', player.avatar);
        setText('turn-name', player.name);
      } else {
        badge.style.display = 'none';
      }
    }

    // Progress bar
    const fill = document.getElementById('q-progress-fill');
    if (fill) fill.style.width = (state.currentQ / total * 100) + '%';

    // Score display
    setText('pts-val', player.score);

    // Reset state
    state.answered = false;
    state.timeLeft = state.timeLimit;
    state.questionStartTime = Date.now();

    startTimer();
  }

  // ─────────────────────────────────────────────────────────────
  // TIMER
  // ─────────────────────────────────────────────────────────────
  function startTimer() {
    clearInterval(state.timerInterval);
    updateTimerDisplay();

    state.timerInterval = setInterval(() => {
      if (state.paused) return;
      state.timeLeft--;
      updateTimerDisplay();

      if (state.timeLeft <= 5 && state.timeLeft > 0) {
        playSound('tick');
      }

      if (state.timeLeft <= 0) {
        clearInterval(state.timerInterval);
        autoSubmit();
      }
    }, 1000);
  }

  function updateTimerDisplay() {
    const numEl = document.getElementById('timer-num');
    const arc   = document.getElementById('timer-arc');
    if (numEl) numEl.textContent = Math.max(0, state.timeLeft);

    if (arc) {
      const ratio  = state.timeLeft / state.timeLimit;
      const offset = (1 - ratio) * CIRCUMFERENCE;
      arc.style.strokeDashoffset = offset;

      arc.classList.remove('warning', 'danger');
      if (state.timeLeft <= 5) {
        arc.classList.add('danger');
      } else if (state.timeLeft <= Math.floor(state.timeLimit / 3)) {
        arc.classList.add('warning');
      }
    }
  }

  function autoSubmit() {
    if (!state.answered) {
      handleAnswer(-1, state.timeLimit);
    }
  }

  // ─────────────────────────────────────────────────────────────
  // ANSWERING
  // ─────────────────────────────────────────────────────────────
  function answer(idx) {
    if (state.answered || state.paused) return;
    if (state.settings.antiCheat && state.answered) return;
    state.answered = true;
    clearInterval(state.timerInterval);
    const timeElapsed = (Date.now() - state.questionStartTime) / 1000;
    handleAnswer(idx, timeElapsed);
  }

  function handleAnswer(idx, timeElapsed) {
    const q = state.questions[state.currentQ];
    const player = state.players[state.currentPlayer];

    const isCorrect = idx >= 0 && q.choices[idx] === q.answer;
    const te = typeof timeElapsed === 'number' ? timeElapsed : state.timeLimit;

    // Calculate points
    let points = 0;
    if (isCorrect) {
      const ratio = Math.max(0, 1 - te / state.timeLimit);
      points = Math.round(500 + 500 * ratio);
    }

    // Update player stats
    player.score += points;
    if (isCorrect) player.correct++;
    player.totalTime += te;
    player.answers.push({
      question: q.question,
      chosen: idx >= 0 ? q.choices[idx] : null,
      correct: q.answer,
      isCorrect,
      points,
      time: te
    });

    // Visual feedback on buttons
    for (let i = 0; i < 4; i++) {
      const btn = document.getElementById('c' + i);
      if (!btn) continue;
      btn.disabled = true;
      if (q.choices[i] === q.answer) {
        btn.classList.add('reveal-correct');
      } else if (i === idx) {
        btn.classList.add('wrong');
      } else {
        btn.classList.add('disabled');
      }
    }

    // Sound
    playSound(isCorrect ? 'correct' : 'wrong');

    // Show feedback after short delay so player sees the button highlight
    setTimeout(() => showFeedback(isCorrect, points), 1200);
  }

  // ─────────────────────────────────────────────────────────────
  // FEEDBACK SCREEN
  // ─────────────────────────────────────────────────────────────
  function showFeedback(isCorrect, points) {
    const q = state.questions[state.currentQ];
    const iconEl    = document.getElementById('fb-icon');
    const verdictEl = document.getElementById('fb-verdict');
    const ptsEl     = document.getElementById('fb-pts');
    const answerEl  = document.getElementById('fb-answer');
    const refEl     = document.getElementById('fb-reference');

    if (iconEl) {
      iconEl.textContent = isCorrect ? '✓' : '✗';
      iconEl.className = 'feedback-icon ' + (isCorrect ? 'correct' : 'wrong');
    }
    if (verdictEl) verdictEl.textContent = isCorrect ? 'Correct!' : 'Incorrect!';
    if (ptsEl) ptsEl.textContent = isCorrect ? `+${points} pts` : '0 pts';
    if (answerEl) answerEl.textContent = q.answer;
    if (refEl) {
      if (state.settings.showRefs && q.reference) {
        refEl.textContent = q.reference;
        refEl.style.display = '';
      } else {
        refEl.textContent = '';
        refEl.style.display = 'none';
      }
    }

    // Determine which action button to show
    const nextPlayerDiv  = document.getElementById('fb-next-player');
    const leaderboardDiv = document.getElementById('fb-leaderboard');

    const isMulti = state.players.length > 1;
    const lastPlayerForThisQ = state.currentPlayer >= state.players.length - 1;

    if (nextPlayerDiv)  nextPlayerDiv.style.display  = 'none';
    if (leaderboardDiv) leaderboardDiv.style.display = 'none';

    if (isMulti && !lastPlayerForThisQ) {
      // More players need to answer this question
      if (nextPlayerDiv) nextPlayerDiv.style.display = 'block';
    } else {
      // All players answered (or single player) — show leaderboard
      if (leaderboardDiv) leaderboardDiv.style.display = 'block';
    }

    goTo('feedback');
  }

  // ─────────────────────────────────────────────────────────────
  // PASS-AND-PLAY FLOW
  // ─────────────────────────────────────────────────────────────
  function nextPlayerOrLeaderboard() {
    state.currentPlayer++;
    if (state.currentPlayer < state.players.length) {
      // More players to answer the same question
      showPassScreen();
    } else {
      // All players answered — show leaderboard
      showLeaderboard();
    }
  }

  // ─────────────────────────────────────────────────────────────
  // LEADERBOARD
  // ─────────────────────────────────────────────────────────────
  function showLeaderboard() {
    const sorted = state.players.slice().sort((a, b) => b.score - a.score);
    const list = document.getElementById('lb-list');
    const sub  = document.getElementById('lb-sub');
    const nextBtn = document.getElementById('lb-next-btn');
    const endBtn  = document.getElementById('lb-end-btn');

    if (sub) sub.textContent = `After Q${state.currentQ + 1}`;

    if (list) {
      list.innerHTML = sorted.map((p, rank) => {
        const rankClass = rank === 0 ? 'rank-1' : rank === 1 ? 'rank-2' : rank === 2 ? 'rank-3' : '';
        const medal = rank === 0 ? '🥇' : rank === 1 ? '🥈' : rank === 2 ? '🥉' : `${rank + 1}.`;
        const acc = state.currentQ >= 0
          ? Math.round(p.correct / (state.currentQ + 1) * 100)
          : 0;
        return `
          <div class="lb-item ${rankClass}">
            <span class="lb-rank">${medal}</span>
            <span class="lb-avatar">${p.avatar}</span>
            <span class="lb-name">${escHtml(p.name)}</span>
            <span class="lb-score">${p.score}</span>
            <span class="lb-acc">${acc}%</span>
          </div>
        `;
      }).join('');
    }

    const isLastQuestion = state.currentQ + 1 >= state.questions.length;
    if (nextBtn) nextBtn.style.display = isLastQuestion ? 'none' : '';
    if (endBtn)  endBtn.style.display  = isLastQuestion ? '' : 'none';

    goTo('leaderboard');
  }

  function nextQuestion() {
    state.currentQ++;
    state.currentPlayer = 0;
    loadQuestion();
  }

  // ─────────────────────────────────────────────────────────────
  // END GAME
  // ─────────────────────────────────────────────────────────────
  function endGame() {
    clearInterval(state.timerInterval);
    hideAllOverlays();
    saveHistory();
    checkAchievements();
    goTo('results');
  }

  // ─────────────────────────────────────────────────────────────
  // RESULTS SCREEN
  // ─────────────────────────────────────────────────────────────
  function renderResults() {
    if (!state.players || state.players.length === 0) return;
    const sorted = state.players.slice().sort((a, b) => b.score - a.score);
    const qCount = state.questions.length;

    // Subtitle
    const subEl = document.getElementById('results-sub');
    if (subEl) {
      subEl.textContent = `${capitalize(state.difficulty)} · ${qCount} Questions · ${state.mode} mode`;
    }

    // Podium (top 3)
    const podium = document.getElementById('podium');
    if (podium) {
      const podiumPlayers = sorted.slice(0, 3);
      // Reorder for visual: 2nd | 1st | 3rd
      const order = podiumPlayers.length === 1
        ? [podiumPlayers[0]]
        : podiumPlayers.length === 2
          ? [podiumPlayers[1], podiumPlayers[0]]
          : [podiumPlayers[1], podiumPlayers[0], podiumPlayers[2]];

      const heights = ['60px', '90px', '45px'];
      const medals  = ['🥈', '🥇', '🥉'];
      const positions = podiumPlayers.length === 1
        ? [['🥇'], ['90px']]
        : null;

      podium.innerHTML = order.map((p, vi) => {
        const realIdx = sorted.indexOf(p);
        const podH    = podiumPlayers.length === 1 ? '90px'  : heights[vi];
        const medal   = podiumPlayers.length === 1 ? '🥇'    : medals[vi];
        const acc     = qCount > 0 ? Math.round(p.correct / qCount * 100) : 0;
        return `
          <div class="podium-slot rank-${realIdx + 1}">
            <div class="podium-avatar">${p.avatar}</div>
            <div class="podium-name">${escHtml(p.name)}</div>
            <div class="podium-score">${p.score}</div>
            <div class="podium-base" style="height:${podH}">${medal}</div>
          </div>
        `;
      }).join('');
    }

    // Results table
    const tbody = document.getElementById('results-tbody');
    if (tbody) {
      tbody.innerHTML = sorted.map((p, i) => {
        const acc = qCount > 0 ? Math.round(p.correct / qCount * 100) : 0;
        const avgTime = p.answers.length > 0
          ? (p.totalTime / p.answers.length).toFixed(1) + 's'
          : '—';
        return `
          <tr class="${i === 0 ? 'winner-row' : ''}">
            <td>${i + 1}</td>
            <td>${p.avatar} ${escHtml(p.name)}</td>
            <td><strong>${p.score}</strong></td>
            <td>${p.correct}/${qCount}</td>
            <td>${acc}%</td>
            <td>${avgTime}</td>
          </tr>
        `;
      }).join('');
    }

    // Confetti for winner (if score > 0)
    if (sorted.length > 0 && sorted[0].score > 0) {
      playSound('fanfare');
      setTimeout(startConfetti, 300);
    }
  }

  function restartGame() {
    // Keep same settings, go back to player setup to re-confirm
    state.players.forEach(p => {
      p.score = 0;
      p.correct = 0;
      p.totalTime = 0;
      p.answers = [];
    });
    state.currentQ = 0;
    state.currentPlayer = 0;
    goTo('player-setup');
  }

  // ─────────────────────────────────────────────────────────────
  // PAUSE / ADMIN
  // ─────────────────────────────────────────────────────────────
  function togglePause() {
    if (state.paused) {
      resumeGame();
    } else {
      state.paused = true;
      clearInterval(state.timerInterval);
      const pauseBtn = document.getElementById('pause-btn');
      if (pauseBtn) pauseBtn.textContent = '▶';
      document.getElementById('overlay-pause').style.display = 'flex';
    }
  }

  function resumeGame() {
    state.paused = false;
    document.getElementById('overlay-pause').style.display = 'none';
    const pauseBtn = document.getElementById('pause-btn');
    if (pauseBtn) pauseBtn.textContent = '⏸';
    // Restart timer from current timeLeft
    state.questionStartTime = Date.now() - ((state.timeLimit - state.timeLeft) * 1000);
    startTimer();
  }

  function skipQuestion() {
    clearInterval(state.timerInterval);
    state.answered = true;

    // Force all remaining players for this question to get a 0-point answer
    for (let pi = state.currentPlayer; pi < state.players.length; pi++) {
      const player = state.players[pi];
      const q = state.questions[state.currentQ];
      player.answers.push({
        question: q.question,
        chosen: null,
        correct: q.answer,
        isCorrect: false,
        points: 0,
        time: state.timeLimit
      });
      player.totalTime += state.timeLimit;
    }

    hideAllOverlays();
    showLeaderboard();
  }

  function confirmEndGame() {
    document.getElementById('overlay-confirm').style.display = 'flex';
  }

  function closeConfirm() {
    document.getElementById('overlay-confirm').style.display = 'none';
  }

  function closeAchievement() {
    document.getElementById('overlay-achievement').style.display = 'none';
  }

  function hideAllOverlays() {
    ['overlay-pause', 'overlay-confirm', 'overlay-achievement'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.style.display = 'none';
    });
    const pauseBtn = document.getElementById('pause-btn');
    if (pauseBtn) pauseBtn.textContent = '⏸';
    state.paused = false;
  }

  // ─────────────────────────────────────────────────────────────
  // HISTORY
  // ─────────────────────────────────────────────────────────────
  function saveHistory() {
    if (state.questions.length === 0 || state.players.length === 0) return;
    const sorted = state.players.slice().sort((a, b) => b.score - a.score);
    const record = {
      date: new Date().toISOString(),
      difficulty: state.difficulty,
      mode: state.mode,
      questionCount: state.questions.length,
      players: state.players.map(p => ({
        name: p.name,
        avatar: p.avatar,
        score: p.score,
        correct: p.correct,
        accuracy: state.questions.length > 0
          ? Math.round(p.correct / state.questions.length * 100)
          : 0
      })),
      champion: sorted[0]
        ? { name: sorted[0].name, avatar: sorted[0].avatar, score: sorted[0].score }
        : null
    };
    const hist = JSON.parse(localStorage.getItem('bca_history') || '[]');
    hist.unshift(record);
    if (hist.length > 50) hist.splice(50);
    localStorage.setItem('bca_history', JSON.stringify(hist));
  }

  let historyFilter = 'all';

  function loadHistory() {
    const hist = JSON.parse(localStorage.getItem('bca_history') || '[]');
    renderHistoryCards(hist, historyFilter);
  }

  function renderHistoryCards(hist, filter) {
    const list = document.getElementById('history-list');
    if (!list) return;

    const filtered = filter === 'all' ? hist : hist.filter(r => r.difficulty === filter);

    if (filtered.length === 0) {
      list.innerHTML = '<p class="empty-msg">No games yet. Start playing!</p>';
      return;
    }

    list.innerHTML = filtered.map(r => {
      const date = new Date(r.date);
      const dateStr = date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const champion = r.champion;
      return `
        <div class="history-card">
          <div class="hc-top">
            <span class="hc-diff hc-diff-${r.difficulty}">${capitalize(r.difficulty)}</span>
            <span class="hc-mode">${modeLabel(r.mode)}</span>
            <span class="hc-date">${dateStr}</span>
          </div>
          ${champion ? `
          <div class="hc-champion">
            <span>${avatarHtml(champion.avatar)}</span>
            <strong>${escHtml(champion.name)}</strong>
            <span class="hc-score">${champion.score} pts</span>
          </div>` : ''}
          <div class="hc-players">
            ${(r.players || []).map(p => `
              <span class="hc-player">
                ${avatarHtml(p.avatar)} ${escHtml(p.name)} — ${p.score} (${p.accuracy}%)
              </span>
            `).join('')}
          </div>
          <div class="hc-meta">${r.questionCount} questions</div>
        </div>
      `;
    }).join('');
  }

  function filterHistory(diff, btn) {
    historyFilter = diff;
    // Update active class on filter buttons
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
    const hist = JSON.parse(localStorage.getItem('bca_history') || '[]');
    renderHistoryCards(hist, diff);
  }

  function clearHistory() {
    Admin.requireAdmin(function () {
      if (!confirm('Clear all game history? This cannot be undone.')) return;
      localStorage.removeItem('bca_history');
      loadHistory();
      showToast('History cleared.', 'info');
    });
  }

  // ─────────────────────────────────────────────────────────────
  // SETTINGS
  // ─────────────────────────────────────────────────────────────
  function loadSettings() {
    const saved = localStorage.getItem('bca_settings');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        state.settings = Object.assign(state.settings, parsed);
      } catch (e) { /* ignore */ }
    }
  }

  function saveSettings() {
    localStorage.setItem('bca_settings', JSON.stringify(state.settings));
  }

  function applySettings() {
    const html = document.documentElement;
    html.setAttribute('data-theme', state.settings.darkMode ? 'dark' : 'light');
  }

  function applySettingsToUI() {
    const darkToggle    = document.getElementById('toggle-dark');
    const soundToggle   = document.getElementById('toggle-sound');
    const volSlider     = document.getElementById('volume-slider');
    const shuffleToggle = document.getElementById('toggle-shuffle');
    const refsToggle    = document.getElementById('toggle-refs');
    const antiToggle    = document.getElementById('toggle-anticheat');
    const qCount        = document.getElementById('q-count-select');

    if (darkToggle)    darkToggle.checked    = state.settings.darkMode;
    if (soundToggle)   soundToggle.checked   = state.settings.sound;
    if (volSlider)     volSlider.value        = state.settings.volume;
    if (shuffleToggle) shuffleToggle.checked  = state.settings.shuffle;
    if (refsToggle)    refsToggle.checked     = state.settings.showRefs;
    if (antiToggle)    antiToggle.checked     = state.settings.antiCheat;
    if (qCount) {
      // Select matching option
      const opts = qCount.options;
      for (let i = 0; i < opts.length; i++) {
        if (parseInt(opts[i].value) === state.settings.questionCount) {
          qCount.selectedIndex = i;
          break;
        }
      }
    }
  }

  function setDarkMode(isDark) {
    state.settings.darkMode = isDark;
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
    saveSettings();
  }

  function setSoundEnabled(on) {
    state.settings.sound = on;
    saveSettings();
  }

  function setVolume(val) {
    state.settings.volume = parseInt(val, 10);
    saveSettings();
  }

  function setSetting(key, val) {
    state.settings[key] = val;
    saveSettings();
  }

  function applyGameOptionsLock() {
    const lockRow = document.getElementById('game-options-lock-row');
    const fields = document.getElementById('game-options-fields');
    const unlocked = typeof Admin !== 'undefined' && Admin.isAuthenticated();
    if (lockRow) lockRow.style.display = unlocked ? 'none' : 'flex';
    if (fields) fields.style.display = unlocked ? '' : 'none';
  }

  function unlockGameOptions() {
    Admin.requireAdmin(function () {
      applyGameOptionsLock();
      showToast('Game Options unlocked.', 'success');
    });
  }

  // ─────────────────────────────────────────────────────────────
  // ACHIEVEMENTS
  // ─────────────────────────────────────────────────────────────
  function checkAchievements() {
    const earned = JSON.parse(localStorage.getItem('bca_achievements') || '[]');
    const hist   = JSON.parse(localStorage.getItem('bca_history') || '[]');
    const player = state.players.slice().sort((a, b) => b.score - a.score)[0];
    if (!player) return;

    const newlyEarned = [];

    ACHIEVEMENTS.forEach(ach => {
      if (earned.includes(ach.id)) return; // already unlocked

      let unlocked = false;
      if (ach.id === 'first_win') {
        unlocked = state.players.length >= 1 && player.score > 0;
      } else if (ach.id === 'perfect') {
        unlocked = player.correct === state.questions.length && state.questions.length > 0;
      } else if (ach.id === 'speed_demon') {
        const fastAnswers = player.answers.filter(a => a.isCorrect && a.time < 3);
        unlocked = fastAnswers.length >= 3;
      } else if (ach.id === 'scholar') {
        unlocked = state.difficulty === 'expert';
      } else if (ach.id === 'veteran') {
        unlocked = hist.length >= 10;
      }

      if (unlocked) {
        newlyEarned.push(ach);
      }
    });

    if (newlyEarned.length > 0) {
      // Save all new achievements
      newlyEarned.forEach(a => earned.push(a.id));
      localStorage.setItem('bca_achievements', JSON.stringify(earned));
      // Show the first one (chain the rest with delay)
      showAchievementOverlay(newlyEarned, 0);
    }
  }

  function showAchievementOverlay(list, idx) {
    if (idx >= list.length) return;
    const ach = list[idx];
    const overlay = document.getElementById('overlay-achievement');
    const badgeEl = document.getElementById('ach-badge');
    const titleEl = document.getElementById('ach-title');
    const descEl  = document.getElementById('ach-desc');
    if (badgeEl) badgeEl.textContent = ach.badge;
    if (titleEl) titleEl.textContent = ach.title;
    if (descEl)  descEl.textContent  = ach.desc;
    if (overlay) overlay.style.display = 'flex';

    // Override close button to chain next achievement
    const closeBtn = overlay.querySelector('button');
    if (closeBtn) {
      closeBtn.onclick = () => {
        overlay.style.display = 'none';
        showAchievementOverlay(list, idx + 1);
      };
    }
  }

  // ─────────────────────────────────────────────────────────────
  // EXPORT / PRINT
  // ─────────────────────────────────────────────────────────────
  function exportCSV() {
    const sorted = state.players.slice().sort((a, b) => b.score - a.score);
    const qCount = state.questions.length;
    const lines = [
      ['Rank','Player','Score','Correct','Accuracy','Avg Time (s)','Difficulty','Mode'],
    ];
    sorted.forEach((p, i) => {
      const acc = qCount > 0 ? Math.round(p.correct / qCount * 100) : 0;
      const avgTime = p.answers.length > 0
        ? (p.totalTime / p.answers.length).toFixed(2)
        : '0';
      lines.push([
        i + 1,
        p.name,
        p.score,
        `${p.correct}/${qCount}`,
        `${acc}%`,
        avgTime,
        state.difficulty,
        state.mode
      ]);
    });

    const csv = lines.map(row =>
      row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
    ).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = 'bible-challenge-results.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('CSV exported!', 'success');
  }

  function printResults() {
    window.print();
  }

  // ─────────────────────────────────────────────────────────────
  // UTILITIES
  // ─────────────────────────────────────────────────────────────
  function setText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  }

  // Multiplayer history records may store a photo avatar as a base64 data
  // URI (see Profile photo uploads) instead of an emoji - render those as
  // an <img>, same as the in-game leaderboard/podium do.
  function avatarHtml(avatar) {
    if (avatar && avatar.startsWith('data:')) {
      return `<img src="${avatar}" style="width:1.6rem;height:1.6rem;border-radius:50%;object-fit:cover;vertical-align:middle;">`;
    }
    return avatar || '';
  }

  function escHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  function modeLabel(mode) {
    const labels = {
      single: 'Solo',
      multi: 'Pass & Play',
      tournament: 'Tournament',
      sabbath: 'Sabbath School',
      speed: 'Speed Round',
      daily: 'Daily Challenge'
    };
    return labels[mode] || mode;
  }

  // ─────────────────────────────────────────────────────────────
  // INIT
  // ─────────────────────────────────────────────────────────────
  function init() {
    loadSettings();
    applySettings();
    if (typeof Profile !== 'undefined') Profile.init();
    if (typeof CustomQuestions !== 'undefined') CustomQuestions.load();

    const nameInput = document.getElementById('player-name-input');
    if (nameInput) {
      nameInput.addEventListener('keydown', e => {
        if (e.key === 'Enter') addPlayer();
      });
    }

    // Ensure home screen is active on load
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const home = document.getElementById('screen-home');
    if (home) home.classList.add('active');
  }

  document.addEventListener('DOMContentLoaded', init);

  // ─────────────────────────────────────────────────────────────
  // PUBLIC API
  // ─────────────────────────────────────────────────────────────
  return {
    // Navigation
    goTo,
    // Mode / Difficulty / Setup
    selectMode,
    goHostGame,
    goJoinGame,
    goMyProfile,
    goShop,
    profileSaveContinue,
    selectDifficulty,
    backFromPlayerSetup,
    addPlayer,
    removePlayer,
    renderPlayerList,
    updateStartBtn,
    // Game flow
    startGame,
    beginPlayerTurn,
    answer,
    nextPlayerOrLeaderboard,
    showLeaderboard,
    nextQuestion,
    endGame,
    restartGame,
    // Pause / admin
    togglePause,
    resumeGame,
    skipQuestion,
    confirmEndGame,
    closeConfirm,
    closeAchievement,
    // History
    loadHistory,
    filterHistory,
    clearHistory,
    // Settings
    setDarkMode,
    setSoundEnabled,
    setVolume,
    setSetting,
    unlockGameOptions,
    // Export
    exportCSV,
    printResults,
    // Toast (public for testing)
    showToast,
    playSound,
    startConfetti
  };
})();
