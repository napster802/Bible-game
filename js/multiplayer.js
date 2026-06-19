/* ============================================================
   Bible Challenge Arena - Multiplayer Sync Engine
   Shared by Host and Join flows. Polls api/room_state.php and
   drives the shared question / feedback / leaderboard / results
   screens so every device on the LAN sees the same thing at the
   same time. Only the host can advance the game; players can only
   submit one locked answer per question.
   ============================================================ */
const Multiplayer = (function () {
  const API = 'api/';
  const POLL_MS = 1500;

  let roomCode = null;
  let deviceId = null;
  let isHost = false;
  let pollTimer = null;
  let localTickTimer = null;

  let lastStatus = null;
  let lastQIdx = -1;
  let answeredThisQuestion = false;
  let lastEventId = 0;
  let lastData = null;

  let sync = { serverElapsedMs: 0, clientTimeAtSync: 0, timeLimitSec: 30 };
  let currentDifficulty = 'easy';
  let currentQuizMode = 'difficulty';
  let currentBook = null;
  let currentCategory = null;
  let currentTestament = 'all';
  let currentDbIndex = 0;
  let currentTimeTaken = 0;

  const POWERUP_COSTS = { fifty: 800, double: 1500, freeze: 1000, steal: 2000 };
  const POWERUP_LABELS = { fifty: '50/50', double: '2x Points', freeze: 'Freeze', steal: 'Steal' };

  function api(path, body) {
    const opts = body
      ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
      : { method: 'GET' };
    return fetch(API + path, opts).then(r => r.json());
  }

  function start(code, host) {
    roomCode = code;
    deviceId = Profile.getDeviceId();
    isHost = !!host;
    lastStatus = null;
    lastQIdx = -1;
    answeredThisQuestion = false;
    lastEventId = 0;
    lastData = null;
    stop();
    const fab = document.getElementById('social-fab');
    if (fab) fab.style.display = 'flex';
    const begin = () => {
      poll();
      pollTimer = setInterval(poll, POLL_MS);
    };
    // Admin-uploaded CSV questions must be merged into the book pool before
    // any question lookup, so every device resolves the same db_index to
    // the same question (see js/custom_questions.js).
    if (typeof CustomQuestions !== 'undefined') CustomQuestions.ready().then(begin);
    else begin();
  }

  function stop() {
    if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
    if (localTickTimer) { clearInterval(localTickTimer); localTickTimer = null; }
    const fab = document.getElementById('social-fab');
    if (fab) fab.style.display = 'none';
    const panel = document.getElementById('social-panel');
    if (panel) panel.style.display = 'none';
  }

  function poll() {
    if (!roomCode || !deviceId) return;
    api(`room_state.php?code=${roomCode}&device_id=${deviceId}&since_event_id=${lastEventId}`)
      .then(handleState)
      .catch(err => {
        console.error('Room sync failed:', err);
        App.showToast('Connection lost. Retrying…', 'error', 1500);
      });
  }

  function handleState(data) {
    if (!data || !data.success) {
      App.showToast(data && data.error ? data.error : 'Room error', 'error');
      stop();
      App.goTo('home');
      return;
    }

    lastData = data;
    processEvents(data.events);
    isHost = data.is_host;
    if (data.my_wallet !== null && data.my_wallet !== undefined && typeof Profile !== 'undefined' && Profile.setWalletCache) {
      Profile.setWalletCache(data.my_wallet);
    }
    currentDifficulty = data.room.difficulty;
    currentQuizMode = data.room.quiz_mode || 'difficulty';
    currentBook = data.room.book || null;
    currentCategory = data.room.category || null;
    currentTestament = data.room.testament || 'all';
    const status = data.room.status;
    const qIdx = data.room.current_q_idx;

    if (status === 'lobby') {
      renderLobby(data);
    } else if (status === 'playing') {
      if (lastStatus !== 'playing' || lastQIdx !== qIdx) {
        answeredThisQuestion = !!data.my_answer;
        enterQuestion(data);
      }
      updatePlayingTick(data);
    } else if (status === 'answer_reveal') {
      if (lastStatus !== 'answer_reveal' || lastQIdx !== qIdx) {
        enterReveal(data);
      }
      updateWaitingCount(data);
    } else if (status === 'leaderboard') {
      if (lastStatus !== 'leaderboard' || lastQIdx !== qIdx) {
        enterLeaderboard(data);
      }
    } else if (status === 'finished') {
      if (lastStatus !== 'finished') {
        enterResults(data);
      }
    }

    lastStatus = status;
    lastQIdx = qIdx;
  }

  // ---------------- LOBBY ----------------
  function renderLobby(data) {
    const codeEls = [document.getElementById('host-room-code'), document.getElementById('join-wait-code')];
    codeEls.forEach(el => { if (el) el.textContent = roomCode; });

    const countEl = document.getElementById('host-player-count');
    if (countEl) countEl.textContent = `${data.player_count}/20`;

    renderPlayerList('host-player-list', data.players, true);
    renderPlayerList('join-wait-player-list', data.players, false);
  }

  function renderPlayerList(containerId, players, allowRemove) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';
    players.forEach(p => {
      const row = document.createElement('div');
      row.className = 'player-item';
      const avatarHtml = (p.avatar && p.avatar.startsWith('data:'))
        ? `<img src="${p.avatar}" style="width:1.8rem;height:1.8rem;border-radius:50%;object-fit:cover;">`
        : `<span class="player-avatar-badge">${p.avatar}</span>`;
      row.innerHTML = `
        ${avatarHtml}
        <span class="player-item-name">${escapeHtml(p.name)}${p.is_host ? ' 👑' : ''}</span>
      `;
      if (allowRemove && !p.is_host) {
        const btn = document.createElement('button');
        btn.className = 'player-remove';
        btn.textContent = '✕';
        btn.onclick = () => HostGame.removePlayer(p.device_id);
        row.appendChild(btn);
      }
      container.appendChild(row);
    });
  }

  // ---------------- QUESTION ----------------
  function enterQuestion(data) {
    App.goTo('question');
    const q = lookupQuestion(data.current_question);
    currentDbIndex = data.current_question.db_index;

    // Only the host's browser tracks "already asked" - it's the one whose
    // pool selections drive future games (see js/question_tracker.js).
    if (isHost && typeof QuestionTracker !== 'undefined') {
      const poolKey = QuestionTracker.poolKey({
        mode: currentQuizMode,
        testament: currentTestament,
        book: currentBook,
        category: currentCategory,
        difficulty: currentDifficulty
      });
      QuestionTracker.markAsked(poolKey, [q.question]);
    }
    sync = {
      serverElapsedMs: data.room.time_elapsed_ms,
      clientTimeAtSync: Date.now(),
      timeLimitSec: data.room.time_limit
    };

    document.getElementById('q-number').textContent = `Q ${data.current_question.q_idx + 1}/${data.room.question_count}`;
    document.getElementById('q-category').textContent = q.category || '';

    document.getElementById('q-progress-fill').style.width =
      `${(data.current_question.q_idx / data.room.question_count) * 100}%`;

    const badge = document.getElementById('player-turn-badge');
    if (badge) badge.style.display = 'none';

    // The host never plays - they only watch contestants answer.
    const adminBar = document.getElementById('admin-bar');
    if (adminBar) adminBar.style.display = 'none';

    const qBox = document.querySelector('#screen-question .q-box');
    const ptsBar = document.querySelector('#screen-question .pts-bar');
    const choicesGrid = document.getElementById('choices-grid');
    const hostMonitor = document.getElementById('host-monitor');
    const powerupBar = document.getElementById('powerup-bar');

    if (qBox) qBox.style.display = '';
    if (choicesGrid) choicesGrid.style.display = '';

    document.getElementById('q-text').textContent = q.question;
    q.choices.forEach((c, i) => { document.getElementById(`c${i}-txt`).textContent = c; });

    if (isHost) {
      if (ptsBar) ptsBar.style.display = 'none';
      if (hostMonitor) hostMonitor.style.display = 'flex';
      if (choicesGrid) choicesGrid.classList.add('host-view');
      if (powerupBar) powerupBar.style.display = 'none';

      for (let i = 0; i < 4; i++) {
        const btn = document.getElementById(`c${i}`);
        btn.className = `choice choice-${'abcd'[i]}`;
        btn.disabled = true;
        btn.onclick = null;
      }

      renderHostMonitor(data);
    } else {
      if (ptsBar) ptsBar.style.display = '';
      if (hostMonitor) hostMonitor.style.display = 'none';
      if (choicesGrid) choicesGrid.classList.remove('host-view');

      for (let i = 0; i < 4; i++) {
        const btn = document.getElementById(`c${i}`);
        btn.className = `choice choice-${'abcd'[i]}`;
        btn.disabled = false;
        btn.onclick = () => submitAnswer(i, q);
      }

      const myPlayer = data.players.find(p => p.device_id === deviceId);
      document.getElementById('pts-val').textContent = myPlayer ? myPlayer.score : 0;

      if (data.my_answer) {
        answeredThisQuestion = true;
        lockChoices(data.my_answer.choice_idx, q);
      }

      renderPowerupBar(data);
      applyFreezeState(data);
    }

    setMpStatusBadge(data);
    startLocalTicker();
  }

  function setMpStatusBadge(data) {
    const badge = document.getElementById('mp-status-badge');
    if (!badge) return;
    badge.style.display = 'flex';
    if (isHost) {
      badge.textContent = `👥 ${data.answered_count}/${data.contestant_count} answered`;
    } else {
      badge.textContent = answeredThisQuestion ? '✓ Answer locked' : '⏳ Answer now!';
    }
  }

  function renderHostMonitor(data) {
    const list = document.getElementById('host-monitor-list');
    if (!list) return;
    const contestants = data.players.filter(p => !p.is_host);
    list.innerHTML = contestants.map(p => {
      let statusClass = '';
      let statusText = 'Waiting…';
      if (p.has_answered) {
        statusClass = 'answered';
        statusText = '✓ Answered';
        if (p.is_correct === true) { statusClass += ' correct'; statusText = '✓ Correct'; }
        else if (p.is_correct === false) { statusClass += ' wrong'; statusText = '✗ Wrong'; }
      }
      const avatarHtml = (p.avatar && p.avatar.startsWith('data:'))
        ? `<img src="${p.avatar}" style="width:1.8rem;height:1.8rem;border-radius:50%;object-fit:cover;">`
        : `<span class="player-avatar-badge">${p.avatar}</span>`;
      return `
        <div class="host-monitor-item ${statusClass}">
          ${avatarHtml}
          <span class="host-monitor-name">${escapeHtml(p.name)}</span>
          <span class="host-monitor-status">${statusText}</span>
        </div>
      `;
    }).join('');

    const revealBtn = document.getElementById('host-reveal-btn');
    if (revealBtn) revealBtn.style.display = (data.room.status === 'playing') ? '' : 'none';
  }

  function lookupQuestion(qInfo) {
    if (currentQuizMode === 'book' && currentBook && currentCategory && typeof BookQuestions !== 'undefined') {
      return BookQuestions.getPool(currentBook, currentCategory, currentDifficulty, currentTestament)[qInfo.db_index];
    }
    return QUESTION_DB[currentDifficulty][qInfo.db_index];
  }

  function startLocalTicker() {
    if (localTickTimer) clearInterval(localTickTimer);
    tick();
    localTickTimer = setInterval(tick, 200);
  }

  function tick() {
    const elapsedMs = sync.serverElapsedMs + (Date.now() - sync.clientTimeAtSync);
    const timeLeft = Math.max(0, sync.timeLimitSec - elapsedMs / 1000);
    const circumference = 113.1;
    const ratio = Math.min(1, elapsedMs / (sync.timeLimitSec * 1000));
    const arc = document.getElementById('timer-arc');
    const numEl = document.getElementById('timer-num');
    if (arc) {
      arc.style.strokeDashoffset = (ratio * circumference).toFixed(1);
      arc.classList.remove('warning', 'danger');
      if (timeLeft <= 5) arc.classList.add('danger');
      else if (timeLeft <= sync.timeLimitSec / 3) arc.classList.add('warning');
    }
    if (numEl) numEl.textContent = Math.ceil(timeLeft);
    if (timeLeft <= 0 && localTickTimer) {
      clearInterval(localTickTimer);
      localTickTimer = null;
    }
  }

  function updatePlayingTick(data) {
    sync.serverElapsedMs = data.room.time_elapsed_ms;
    sync.clientTimeAtSync = Date.now();
    setMpStatusBadge(data);
    if (isHost) {
      renderHostMonitor(data);
    } else {
      renderPowerupBar(data);
      applyFreezeState(data);
    }
  }

  // ---------------- POWER-UPS ----------------
  function renderPowerupBar(data) {
    const bar = document.getElementById('powerup-bar');
    if (!bar || isHost) return;
    bar.style.display = 'flex';

    const used = data.my_used_powerups || [];
    const wallet = typeof data.my_wallet === 'number' ? data.my_wallet : 0;
    const answered = !!data.my_answer || answeredThisQuestion;
    const frozen = data.my_frozen_until > data.server_time;
    const contestants = data.players.filter(p => !p.is_host);
    const leader = contestants.slice().sort((a, b) => b.score - a.score)[0];
    const iAmLeader = leader && leader.device_id === deviceId;

    const walletVal = document.getElementById('pu-wallet-val');
    if (walletVal) walletVal.textContent = wallet.toLocaleString();

    Object.keys(POWERUP_COSTS).forEach(type => {
      const btn = document.getElementById(`pu-${type}`);
      if (!btn) return;
      const cost = POWERUP_COSTS[type];
      let disabled = used.includes(type) || wallet < cost || frozen;
      if (type === 'fifty' || type === 'double') disabled = disabled || answered;
      if (type === 'steal') disabled = disabled || iAmLeader;
      btn.disabled = disabled;
      btn.classList.toggle('used', used.includes(type));
      btn.title = used.includes(type)
        ? `${POWERUP_LABELS[type]} already used this game`
        : (type === 'steal' && iAmLeader ? 'You are already the leader' : `${POWERUP_LABELS[type]} - ${cost.toLocaleString()} pts`);
    });
  }

  function usePowerup(type, targetId) {
    if (!roomCode || !deviceId) return;
    api('use_powerup.php', {
      room_code: roomCode,
      device_id: deviceId,
      powerup: type,
      target_device_id: targetId || ''
    }).then(res => {
      if (!res.success) {
        App.showToast(res.error || 'Could not use power-up', 'error');
        return;
      }
      if (typeof Profile !== 'undefined' && Profile.setWalletCache) Profile.setWalletCache(res.wallet);
      if (type === 'fifty') {
        applyFiftyFifty();
        App.showToast('🎯 Two wrong answers eliminated!', 'success');
      } else if (type === 'double') {
        App.showToast('⚡ Double Points armed for this question!', 'success');
      } else if (type === 'freeze') {
        App.showToast('❄️ Target frozen for 5 seconds!', 'success');
      } else if (type === 'steal') {
        App.showToast(`🦹 You stole ${res.steal_amount.toLocaleString()} points!`, 'success');
      }
      poll();
    });
  }

  function applyFiftyFifty() {
    if (!lastData || !lastData.current_question) return;
    const q = lookupQuestion(lastData.current_question);
    const correctIdx = q.choices.indexOf(q.answer);
    const wrongIndices = [0, 1, 2, 3].filter(i => i !== correctIdx);
    wrongIndices.sort(() => Math.random() - 0.5);
    wrongIndices.slice(0, 2).forEach(i => {
      const btn = document.getElementById(`c${i}`);
      if (btn) {
        btn.disabled = true;
        btn.classList.add('eliminated');
        btn.onclick = null;
      }
    });
  }

  function openFreezeTargetPicker() {
    if (!lastData) return;
    const list = document.getElementById('freeze-target-list');
    if (!list) return;
    const targets = lastData.players.filter(p => !p.is_host && p.device_id !== deviceId);
    if (targets.length === 0) {
      App.showToast('No other players to freeze', 'warn');
      return;
    }
    list.innerHTML = targets.map(p => {
      const avatarHtml = (p.avatar && p.avatar.startsWith('data:'))
        ? `<img src="${p.avatar}" style="width:1.8rem;height:1.8rem;border-radius:50%;object-fit:cover;">`
        : `<span class="player-avatar-badge">${p.avatar}</span>`;
      return `<button class="freeze-target-btn" data-id="${p.device_id}">${avatarHtml}<span>${escapeHtml(p.name)}</span></button>`;
    }).join('');
    list.querySelectorAll('.freeze-target-btn').forEach(btn => {
      btn.onclick = () => {
        const targetId = btn.getAttribute('data-id');
        closeFreezeTargetPicker();
        usePowerup('freeze', targetId);
      };
    });
    document.getElementById('overlay-freeze-target').style.display = 'flex';
  }

  function closeFreezeTargetPicker() {
    const overlay = document.getElementById('overlay-freeze-target');
    if (overlay) overlay.style.display = 'none';
  }

  function applyFreezeState(data) {
    const banner = document.getElementById('freeze-banner');
    if (!banner) return;
    const frozen = data.my_frozen_until > data.server_time;
    if (frozen) {
      const secsLeft = Math.max(0, Math.ceil((data.my_frozen_until - data.server_time) / 1000));
      banner.style.display = 'block';
      const countdown = document.getElementById('freeze-countdown');
      if (countdown) countdown.textContent = secsLeft;
      if (!answeredThisQuestion) {
        for (let i = 0; i < 4; i++) {
          const btn = document.getElementById(`c${i}`);
          if (btn) btn.disabled = true;
        }
      }
    } else {
      banner.style.display = 'none';
      if (!answeredThisQuestion) {
        for (let i = 0; i < 4; i++) {
          const btn = document.getElementById(`c${i}`);
          if (btn && !btn.classList.contains('eliminated')) btn.disabled = false;
        }
      }
    }
  }

  // ---------------- DISTRIBUTION CHART ----------------
  function renderDistribution(containerId, reveal) {
    const container = document.getElementById(containerId);
    if (!container) return;
    if (!reveal || !reveal.distribution) {
      container.style.display = 'none';
      return;
    }
    container.style.display = 'block';
    const letters = ['a', 'b', 'c', 'd'];
    const total = reveal.distribution.reduce((s, n) => s + n, 0) || 1;
    container.innerHTML = reveal.distribution.map((count, i) => {
      const pct = Math.round((count / total) * 100);
      return `
        <div class="dist-row">
          <span class="dist-letter dist-${letters[i]}">${letters[i].toUpperCase()}</span>
          <div class="dist-bar-track"><div class="dist-bar-fill dist-${letters[i]}" style="width:${pct}%"></div></div>
          <span class="dist-pct">${pct}% (${count})</span>
        </div>
      `;
    }).join('');
  }

  // ---------------- SOCIAL: REACTIONS & QUICK-CHAT ----------------
  function toggleSocialPanel() {
    const panel = document.getElementById('social-panel');
    if (!panel) return;
    panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
  }

  function sendReaction(emoji) {
    if (!roomCode || !deviceId) return;
    api('send_event.php', { room_code: roomCode, device_id: deviceId, type: 'reaction', payload: emoji });
  }

  function sendChat(key) {
    if (!roomCode || !deviceId) return;
    api('send_event.php', { room_code: roomCode, device_id: deviceId, type: 'chat', payload: key });
  }

  function processEvents(events) {
    if (!events || !events.length) return;
    events.forEach(e => {
      if (e.id > lastEventId) lastEventId = e.id;
      if (e.type === 'reaction') spawnReaction(e);
      else if (e.type === 'chat') spawnChatBubble(e);
      else if (e.type === 'steal') spawnStealAnnouncement(e);
    });
  }

  function spawnReaction(e) {
    const layer = document.getElementById('reaction-layer');
    if (!layer) return;
    const el = document.createElement('div');
    el.className = 'reaction-emoji';
    el.textContent = e.payload;
    el.style.left = `${10 + Math.random() * 80}%`;
    layer.appendChild(el);
    setTimeout(() => el.remove(), 2200);
  }

  function spawnChatBubble(e) {
    const feed = document.getElementById('chat-feed');
    if (!feed) return;
    const avatarHtml = (e.avatar && e.avatar.startsWith('data:'))
      ? `<img src="${e.avatar}" style="width:1.4rem;height:1.4rem;border-radius:50%;object-fit:cover;">`
      : `<span>${e.avatar}</span>`;
    const el = document.createElement('div');
    el.className = 'chat-bubble';
    el.innerHTML = `${avatarHtml}<strong>${escapeHtml(e.name)}:</strong> <span>${escapeHtml(e.payload)}</span>`;
    feed.appendChild(el);
    setTimeout(() => el.remove(), 4000);
  }

  function spawnStealAnnouncement(e) {
    try {
      const payload = JSON.parse(e.payload);
      App.showToast(`🦹 ${payload.thief} stole ${payload.amount.toLocaleString()} pts from ${payload.victim}!`, 'success', 3500);
    } catch (err) { /* malformed payload - ignore */ }
  }

  function submitAnswer(choiceIdx, question) {
    if (answeredThisQuestion) return;
    answeredThisQuestion = true;
    const elapsedMs = sync.serverElapsedMs + (Date.now() - sync.clientTimeAtSync);
    currentTimeTaken = Math.min(sync.timeLimitSec, elapsedMs / 1000);
    const isCorrect = question.choices[choiceIdx] === question.answer;

    lockChoices(choiceIdx, question);

    api('submit_answer.php', {
      room_code: roomCode,
      device_id: deviceId,
      q_idx: lastQIdx,
      choice_idx: choiceIdx,
      is_correct: isCorrect,
      time_taken: currentTimeTaken
    }).then(res => {
      if (res.success) {
        playLocalFeedbackSound(isCorrect);
        showWaitingFeedback(isCorrect, res.points, question, res.streak, res.doubled);
      }
    });
  }

  function lockChoices(selectedIdx, question) {
    for (let i = 0; i < 4; i++) {
      const btn = document.getElementById(`c${i}`);
      btn.disabled = true;
      if (i === selectedIdx) btn.classList.add(question.choices[i] === question.answer ? 'correct' : 'wrong');
    }
  }

  function playLocalFeedbackSound(isCorrect) {
    if (typeof App !== 'undefined' && App.playSound) App.playSound(isCorrect ? 'correct' : 'wrong');
  }

  function showWaitingFeedback(isCorrect, points, question, streak, doubled) {
    App.goTo('feedback');
    document.getElementById('fb-icon').className = 'feedback-icon ' + (isCorrect ? 'correct' : 'wrong');
    document.getElementById('fb-icon').textContent = isCorrect ? '✓' : '✗';
    document.getElementById('fb-verdict').textContent = isCorrect ? 'Correct!' : 'Incorrect!';
    document.getElementById('fb-pts').textContent = isCorrect ? `+${points}` : '0 pts';
    document.getElementById('fb-answer').textContent = question.answer;
    document.getElementById('fb-reference').textContent = question.reference || '';

    const streakBadge = document.getElementById('fb-streak-badge');
    if (streakBadge) {
      if (isCorrect && streak >= 2) {
        streakBadge.style.display = 'block';
        streakBadge.textContent = doubled ? `🔥 ${streak} in a row! ⚡ Doubled!` : `🔥 ${streak} in a row!`;
      } else if (isCorrect && doubled) {
        streakBadge.style.display = 'block';
        streakBadge.textContent = '⚡ Doubled!';
      } else {
        streakBadge.style.display = 'none';
      }
    }

    const dist = document.getElementById('fb-distribution');
    if (dist) dist.style.display = 'none';

    document.getElementById('fb-next-player').style.display = 'none';
    document.getElementById('fb-leaderboard').style.display = 'none';

    let waitDiv = document.getElementById('fb-mp-waiting');
    if (!waitDiv) {
      waitDiv = document.createElement('div');
      waitDiv.id = 'fb-mp-waiting';
      document.querySelector('.fb-actions').appendChild(waitDiv);
    }
    waitDiv.style.display = 'block';
    waitDiv.innerHTML = `<p>Waiting for other players…</p>`;
  }

  // ---------------- ANSWER REVEAL ----------------
  function enterReveal(data) {
    const q = lookupQuestion(data.current_question);
    if (isHost) {
      // Host stays on the question screen, sees the correct answer highlighted
      // alongside the live monitor of everyone's final answers.
      const correctIdx = q.choices.indexOf(q.answer);
      for (let i = 0; i < 4; i++) {
        const btn = document.getElementById(`c${i}`);
        if (i === correctIdx) btn.classList.add('reveal-correct');
      }
      renderHostMonitor(data);
      return;
    }
    // If I never answered (timeout), still show feedback with 0 points
    if (!document.getElementById('screen-feedback').classList.contains('active')) {
      App.goTo('feedback');
      document.getElementById('fb-icon').className = 'feedback-icon wrong';
      document.getElementById('fb-icon').textContent = '✗';
      document.getElementById('fb-verdict').textContent = 'Time\'s Up!';
      document.getElementById('fb-pts').textContent = '0 pts';
      document.getElementById('fb-answer').textContent = q.answer;
      document.getElementById('fb-reference').textContent = q.reference || '';
      document.getElementById('fb-next-player').style.display = 'none';
      document.getElementById('fb-leaderboard').style.display = 'none';
    }
    updateWaitingCount(data);
  }

  function updateWaitingCount(data) {
    const waitDiv = document.getElementById('fb-mp-waiting');
    if (waitDiv && data.answer_reveal) {
      waitDiv.innerHTML = `<p>${data.answer_reveal.total_answers}/${data.contestant_count} answered • moving to rankings…</p>`;
    }
    renderDistribution('fb-distribution', data.answer_reveal);
    renderDistribution('host-distribution', data.answer_reveal);
  }

  // ---------------- LEADERBOARD ----------------
  function enterLeaderboard(data) {
    App.goTo('leaderboard');
    document.getElementById('lb-sub').textContent = `After Q${data.current_question ? data.current_question.q_idx + 1 : ''}`;

    const list = document.getElementById('lb-list');
    list.innerHTML = '';
    const contestants = data.players.filter(p => !p.is_host);
    contestants.forEach((p, i) => {
      const rank = i + 1;
      const item = document.createElement('div');
      item.className = `lb-item${rank <= 3 ? ' rank-' + rank : ''}`;
      const avatarHtml = (p.avatar && p.avatar.startsWith('data:'))
        ? `<img src="${p.avatar}" style="width:1.8rem;height:1.8rem;border-radius:50%;object-fit:cover;">`
        : `<span class="lb-avatar">${p.avatar}</span>`;
      const streakBadge = p.streak >= 2 ? `<span class="lb-streak">🔥${p.streak}</span>` : '';
      item.innerHTML = `
        <span class="lb-rank">${rank}</span>
        ${avatarHtml}
        <span class="lb-name">${escapeHtml(p.name)}</span>
        ${streakBadge}
        <span class="lb-score">${p.score}</span>
      `;
      list.appendChild(item);
    });

    document.getElementById('lb-next-btn').style.display = 'none';
    document.getElementById('lb-end-btn').style.display = 'none';

    let mpControls = document.getElementById('lb-mp-controls');
    if (!mpControls) {
      mpControls = document.createElement('div');
      mpControls.id = 'lb-mp-controls';
      document.querySelector('.lb-footer').appendChild(mpControls);
    }
    const isLast = data.current_question && (data.current_question.q_idx + 1) >= data.room.question_count;
    if (isHost) {
      mpControls.innerHTML = `<button class="btn btn-primary btn-xl" onclick="HostGame.nextQuestion()">${isLast ? '🏁 Finish Game' : 'Next Question →'}</button>`;
    } else {
      mpControls.innerHTML = `<p class="hint-text">Waiting for host to continue…</p>`;
    }
  }

  // ---------------- RESULTS ----------------
  function enterResults(data) {
    stop();
    const contestants = data.players.filter(p => !p.is_host);
    const sorted = contestants.slice().sort((a, b) => b.score - a.score);

    // Save history first so a rendering bug can never cost the match record.
    try {
      saveMatchHistory(sorted, data.room);
    } catch (e) {
      console.error('Failed to save match history:', e);
    }

    App.goTo('results');
    try {
      const bookLabel = currentBook === 'ALL'
        ? (currentTestament === 'ot' ? 'Old Testament' : currentTestament === 'nt' ? 'New Testament' : 'All Books')
        : currentBook;
      const sourceLabel = currentQuizMode === 'book' && currentBook && currentCategory
        ? `${bookLabel} • ${currentCategory}`
        : currentDifficulty.toUpperCase();
      document.getElementById('results-sub').textContent =
        `${sourceLabel} • ${data.room.question_count} Questions • Multiplayer`;
      renderPodium(sorted);
      renderResultsTable(sorted, data.room.question_count);
      if (sorted[0] && sorted[0].score > 0 && App.startConfetti) App.startConfetti();
    } catch (e) {
      console.error('Failed to render multiplayer results:', e);
    }

    const playAgainBtn = document.getElementById('results-play-again-btn');
    if (playAgainBtn) {
      if (isHost) {
        playAgainBtn.textContent = '🏠 Host Again';
        playAgainBtn.onclick = () => App.goHostGame();
      } else {
        playAgainBtn.textContent = '🔑 Join Again';
        playAgainBtn.onclick = () => App.goJoinGame();
      }
    }
  }

  function renderPodium(sorted) {
    const podium = document.getElementById('podium');
    podium.innerHTML = '';
    const order = [1, 0, 2];
    order.forEach(i => {
      const p = sorted[i];
      if (!p) return;
      const place = i === 0 ? 1 : i === 1 ? 2 : 3;
      const div = document.createElement('div');
      div.className = `podium-place podium-${place}`;
      const avatarHtml = (p.avatar && p.avatar.startsWith('data:'))
        ? `<img src="${p.avatar}" style="width:2.5rem;height:2.5rem;border-radius:50%;object-fit:cover;">`
        : `<span class="podium-avatar">${p.avatar}</span>`;
      div.innerHTML = `
        ${avatarHtml}
        <span class="podium-name">${escapeHtml(p.name)}</span>
        <span class="podium-score">${p.score}</span>
        <div class="podium-block">${place}</div>
      `;
      podium.appendChild(div);
    });
  }

  function renderResultsTable(sorted, qCount) {
    const tbody = document.getElementById('results-tbody');
    tbody.innerHTML = '';
    sorted.forEach((p, i) => {
      const accuracy = qCount > 0 ? Math.round((p.correct / qCount) * 100) : 0;
      const answered = p.correct + p.wrong;
      const avgTime = answered > 0 ? p.total_time / answered : 0;
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${i + 1}</td>
        <td>${escapeHtml(p.name)}</td>
        <td>${p.score}</td>
        <td>${p.correct}</td>
        <td>${accuracy}%</td>
        <td>${avgTime ? avgTime.toFixed(1) + 's' : '-'}</td>
        <td>${p.best_streak >= 2 ? '🔥' + p.best_streak : (p.best_streak || 0)}</td>
      `;
      tbody.appendChild(tr);
    });
  }

  function saveMatchHistory(sorted, room) {
    const champion = sorted[0];
    const record = {
      date: new Date().toISOString(),
      difficulty: room.difficulty,
      quizMode: room.quiz_mode,
      book: room.book,
      category: room.category,
      testament: room.testament,
      mode: isHost ? 'host' : 'join',
      questionCount: room.question_count,
      players: sorted.map(p => ({
        name: p.name, avatar: p.avatar, score: p.score, correct: p.correct, wrong: p.wrong,
        accuracy: room.question_count > 0 ? Math.round((p.correct / room.question_count) * 100) : 0,
        avgResponseTime: (p.correct + p.wrong) > 0 ? p.total_time / (p.correct + p.wrong) : 0
      })),
      champion: champion ? { name: champion.name, avatar: champion.avatar, score: champion.score } : null
    };
    const hist = JSON.parse(localStorage.getItem('bca_history') || '[]');
    hist.unshift(record);
    if (hist.length > 50) hist.splice(50);
    localStorage.setItem('bca_history', JSON.stringify(hist));
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  return {
    start,
    stop,
    poll,
    usePowerup,
    openFreezeTargetPicker,
    closeFreezeTargetPicker,
    toggleSocialPanel,
    sendReaction,
    sendChat,
    get roomCode() { return roomCode; },
    get deviceId() { return deviceId; },
    get isHost() { return isHost; }
  };
})();
