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

  let sync = { serverElapsedMs: 0, clientTimeAtSync: 0, timeLimitSec: 30 };
  let currentDifficulty = 'easy';
  let currentDbIndex = 0;
  let currentTimeTaken = 0;

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
    stop();
    poll();
    pollTimer = setInterval(poll, POLL_MS);
  }

  function stop() {
    if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
    if (localTickTimer) { clearInterval(localTickTimer); localTickTimer = null; }
  }

  function poll() {
    if (!roomCode || !deviceId) return;
    api(`room_state.php?code=${roomCode}&device_id=${deviceId}`)
      .then(handleState)
      .catch(() => App.showToast('Connection lost. Retrying…', 'error', 1500));
  }

  function handleState(data) {
    if (!data || !data.success) {
      App.showToast(data && data.error ? data.error : 'Room error', 'error');
      stop();
      App.goTo('home');
      return;
    }

    isHost = data.is_host;
    currentDifficulty = data.room.difficulty;
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
    sync = {
      serverElapsedMs: data.room.time_elapsed_ms,
      clientTimeAtSync: Date.now(),
      timeLimitSec: data.room.time_limit
    };

    document.getElementById('q-number').textContent = `Q ${data.current_question.q_idx + 1}/${data.room.question_count}`;
    document.getElementById('q-category').textContent = q.category || '';
    document.getElementById('q-text').textContent = q.question;
    q.choices.forEach((c, i) => { document.getElementById(`c${i}-txt`).textContent = c; });

    for (let i = 0; i < 4; i++) {
      const btn = document.getElementById(`c${i}`);
      btn.className = `choice choice-${'abcd'[i]}`;
      btn.disabled = false;
      btn.onclick = () => submitAnswer(i, q);
    }

    document.getElementById('q-progress-fill').style.width =
      `${(data.current_question.q_idx / data.room.question_count) * 100}%`;

    const myPlayer = data.players.find(p => p.device_id === deviceId);
    document.getElementById('pts-val').textContent = myPlayer ? myPlayer.score : 0;

    const badge = document.getElementById('player-turn-badge');
    if (badge) badge.style.display = 'none';

    const adminBar = document.getElementById('admin-bar');
    if (adminBar) adminBar.style.display = isHost ? 'flex' : 'none';

    setMpStatusBadge(data);

    if (data.my_answer) {
      answeredThisQuestion = true;
      lockChoices(data.my_answer.choice_idx, q);
    }

    startLocalTicker();
  }

  function setMpStatusBadge(data) {
    const badge = document.getElementById('mp-status-badge');
    if (!badge) return;
    badge.style.display = 'flex';
    if (isHost) {
      badge.textContent = `👥 ${data.answered_count}/${data.player_count} answered`;
    } else {
      badge.textContent = answeredThisQuestion ? '✓ Answer locked' : '⏳ Answer now!';
    }
  }

  function lookupQuestion(qInfo) {
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
        showWaitingFeedback(isCorrect, res.points, question);
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
    if (window.App && App.playSound) App.playSound(isCorrect ? 'correct' : 'wrong');
  }

  function showWaitingFeedback(isCorrect, points, question) {
    App.goTo('feedback');
    document.getElementById('fb-icon').className = 'feedback-icon ' + (isCorrect ? 'correct' : 'wrong');
    document.getElementById('fb-icon').textContent = isCorrect ? '✓' : '✗';
    document.getElementById('fb-verdict').textContent = isCorrect ? 'Correct!' : 'Incorrect!';
    document.getElementById('fb-pts').textContent = isCorrect ? `+${points}` : '0 pts';
    document.getElementById('fb-answer').textContent = question.answer;
    document.getElementById('fb-reference').textContent = question.reference || '';

    document.getElementById('fb-next-player').style.display = 'none';
    document.getElementById('fb-leaderboard').style.display = 'none';

    let waitDiv = document.getElementById('fb-mp-waiting');
    if (!waitDiv) {
      waitDiv = document.createElement('div');
      waitDiv.id = 'fb-mp-waiting';
      document.querySelector('.fb-actions').appendChild(waitDiv);
    }
    waitDiv.style.display = 'block';
    waitDiv.innerHTML = isHost
      ? `<p>Waiting for all players to answer…</p><button class="btn btn-secondary" onclick="HostGame.forceReveal()">Reveal Now</button>`
      : `<p>Waiting for other players…</p>`;
  }

  // ---------------- ANSWER REVEAL ----------------
  function enterReveal(data) {
    const q = lookupQuestion(data.current_question);
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
      waitDiv.innerHTML = `<p>${data.answer_reveal.total_answers}/${data.player_count} answered • moving to rankings…</p>`;
    }
  }

  // ---------------- LEADERBOARD ----------------
  function enterLeaderboard(data) {
    App.goTo('leaderboard');
    document.getElementById('lb-sub').textContent = `After Q${data.current_question ? data.current_question.q_idx + 1 : ''}`;

    const list = document.getElementById('lb-list');
    list.innerHTML = '';
    data.players.forEach((p, i) => {
      const rank = i + 1;
      const item = document.createElement('div');
      item.className = `lb-item${rank <= 3 ? ' rank-' + rank : ''}`;
      const avatarHtml = (p.avatar && p.avatar.startsWith('data:'))
        ? `<img src="${p.avatar}" style="width:1.8rem;height:1.8rem;border-radius:50%;object-fit:cover;">`
        : `<span class="lb-avatar">${p.avatar}</span>`;
      item.innerHTML = `
        <span class="lb-rank">${rank}</span>
        ${avatarHtml}
        <span class="lb-name">${escapeHtml(p.name)}</span>
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
    App.goTo('results');
    document.getElementById('results-sub').textContent =
      `${currentDifficulty.toUpperCase()} • ${data.room.question_count} Questions • Multiplayer`;

    const sorted = data.players.slice().sort((a, b) => b.score - a.score);
    renderPodium(sorted);
    renderResultsTable(sorted, data.room.question_count);

    if (sorted[0] && sorted[0].score > 0 && App.startConfetti) App.startConfetti();

    saveMatchHistory(sorted, data.room);
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
      `;
      tbody.appendChild(tr);
    });
  }

  function saveMatchHistory(sorted, room) {
    const champion = sorted[0];
    const record = {
      date: new Date().toISOString(),
      difficulty: room.difficulty,
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
    get roomCode() { return roomCode; },
    get deviceId() { return deviceId; },
    get isHost() { return isHost; }
  };
})();
