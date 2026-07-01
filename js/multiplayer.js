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

  // Re-poll immediately when the host/player switches back to this tab.
  // Browsers throttle setInterval heavily in hidden tabs (sometimes to once
  // per minute), so without this the host's last_ping can go stale and
  // cleanAbandonedLobbies() removes the room while they're briefly away.
  (function attachVisibilityListener() {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && roomCode && deviceId) {
        poll();
      }
    });
  })();

  let lastStatus = null;
  let lastQIdx = -1;
  let lastImpRound = -1;
  let lastDrawRound = -1;
  let lastStrokeId = 0;
  let drawCanDraw = false;
  // Scrabble state
  let lastScrabRound = -1;
  let scrabSelectedRackIdx = null;
  let scrabPendingCells = [];  // [{row,col,letter,pts,rackIdx,isBlank}]
  let scrabBoardData = null;
  let scrabMyRack = [];
  let scrabIsMyTurn = false;
  let scrabTimerInterval = null;
  let scrabDidInitialScroll = false;
  // Word Hunt state
  let lastWordhuntRound = -1;
  let wordhuntGrid = [];
  let wordhuntFound = {};
  let wordhuntUnclaimed = [];
  let wordhuntIsMyTurn = false;
  let wordhuntTouchStart = null;   // {row, col} of swipe start cell
  let wordhuntTouchDir = null;     // {dr, dc} locked direction, or null
  let wordhuntTouchCells = [];
  let wordhuntTouchStartX = 0;     // pixel coords at touchstart
  let wordhuntTouchStartY = 0;
  let wordhuntLastScrollY = 0;
  let wordhuntScrolling = false;   // true when the touch is panning the grid
  let wordhuntTimerInterval = null;
  let wordhuntTouchBound = false;
  let drawPointerBound = false;
  let drawDrawing = false;
  let drawColor = '#1a1a1a';
  let drawLineWidth = 5;
  let answeredThisQuestion = false;
  let lastEventId = 0;
  let lastData = null;
  // A single dropped/failed poll (e.g. a momentary SQLite write-lock under
  // concurrent submissions) used to kick the player straight to home. Now we
  // tolerate a few consecutive failures before giving up, since the room is
  // almost always still fine by the very next 1.5s poll.
  let consecutiveFailures = 0;
  const MAX_CONSECUTIVE_FAILURES = 3;

  let sync = { serverElapsedMs: 0, clientTimeAtSync: 0, timeLimitSec: 30 };
  let currentGameFormat = 'classic';
  let currentDifficulty = 'easy';
  let currentQuizMode = 'difficulty';
  let currentBook = null;
  let currentCategory = null;
  let currentTestament = 'all';
  let currentDbIndex = 0;
  let currentTimeTaken = 0;
  let memoryPairsFound = 0;
  let memoryTotalPairs = 0;
  let memoryFlipped = [];
  let memoryBoardCards = [];
  let memoryLocked = false;

  const POWERUP_COSTS = { fifty: 800, double: 1500, freeze: 1000, steal: 2000 };
  const POWERUP_LABELS = { fifty: '50/50', double: '2x Points', freeze: 'Freeze', steal: 'Steal' };

  function api(path, body) {
    const opts = body
      ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
      : { method: 'GET' };
    return fetch(API + path, opts).then(r => r.json());
  }

  function isTransientServerError(message) {
    return typeof message === 'string' && /^(server|fatal server) error:/i.test(message);
  }

  // Submits an answer with built-in recovery, mirroring the pattern already
  // used by submitImpostorClue/submitImpostorVote below. A transient SQLite
  // busy_timeout (surfaced by db.php's global handler as "Server error: ...")
  // or a dropped fetch gets one silent retry before the player ever sees it.
  // A real rejection (round already moved on, duplicate submit, etc.) re-opens
  // the UI via unlockFn so the player can retry by hand instead of being stuck
  // "answer locked" until the timer runs out with no feedback.
  function submitAnswerWithRecovery(payload, unlockFn, onSuccess, attempt) {
    attempt = attempt || 1;
    api('submit_answer.php', payload).then(res => {
      if (res.success) {
        onSuccess(res);
      } else if (res.error === 'Already answered') {
        // A duplicate of a request that already succeeded server-side -
        // leave the UI locked, the next poll brings in the real result.
      } else if (isTransientServerError(res.error) && attempt < 2) {
        setTimeout(() => submitAnswerWithRecovery(payload, unlockFn, onSuccess, attempt + 1), 300);
      } else {
        answeredThisQuestion = false;
        unlockFn();
        App.showToast(res.error || 'Could not submit your answer - try again.', 'error');
      }
    }).catch(err => {
      if (attempt < 2) {
        setTimeout(() => submitAnswerWithRecovery(payload, unlockFn, onSuccess, attempt + 1), 300);
        return;
      }
      console.error('Answer submit failed:', err);
      answeredThisQuestion = false;
      unlockFn();
      App.showToast('Could not reach the host - try again.', 'error');
    });
  }

  function start(code, host) {
    roomCode = code;
    deviceId = Profile.getDeviceId();
    isHost = !!host;
    lastStatus = null;
    lastQIdx = -1;
    lastDrawRound = -1;
    lastStrokeId = 0;
    answeredThisQuestion = false;
    lastEventId = 0;
    lastData = null;
    consecutiveFailures = 0;
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
    api(`room_state.php?code=${roomCode}&device_id=${deviceId}&since_event_id=${lastEventId}&since_stroke_id=${lastStrokeId}`)
      .then(handleState)
      .catch(err => {
        console.error('Room sync failed:', err);
        giveUpOrRetry('Connection lost. Retrying…');
      });
  }

  // Bails out to home (or, for non-host players, straight back into the
  // join flow so they can seamlessly rejoin) only after several consecutive
  // failed polls in a row - a single dropped/locked request shouldn't end
  // the game for someone who is still very much in the room.
  function giveUpOrRetry(toastMsg) {
    consecutiveFailures++;
    if (consecutiveFailures < MAX_CONSECUTIVE_FAILURES) {
      App.showToast(toastMsg, 'error', 1500);
      return;
    }
    App.showToast('Lost connection to the host.', 'error');
    const rejoinCode = roomCode;
    const wasHost = isHost;
    stop();
    if (!wasHost && rejoinCode) {
      sessionStorage.setItem('bca_pending_join_code', rejoinCode);
      App.goTo('join-entry');
    } else {
      App.goTo('home');
    }
  }

  function handleState(data) {
    if (!data || !data.success) {
      giveUpOrRetry(data && data.error ? data.error : 'Room error');
      return;
    }
    consecutiveFailures = 0;

    lastData = data;
    processEvents(data.events);
    isHost = data.is_host;
    if (data.my_wallet !== null && data.my_wallet !== undefined && typeof Profile !== 'undefined' && Profile.setWalletCache) {
      Profile.setWalletCache(data.my_wallet);
    }
    currentGameFormat = data.room.game_format || 'classic';
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
    } else if (status === 'imp_clue') {
      if (lastStatus !== 'imp_clue' || lastImpRound !== data.room.impostor_round) {
        enterImpClue(data);
      }
      updateImpClueProgress(data);
    } else if (status === 'imp_reveal') {
      if (lastStatus !== 'imp_reveal' || lastImpRound !== data.room.impostor_round) {
        enterImpReveal(data);
      }
    } else if (status === 'imp_vote') {
      if (lastStatus !== 'imp_vote' || lastImpRound !== data.room.impostor_round) {
        enterImpVote(data);
      }
      updateImpVoteProgress(data);
    } else if (status === 'imp_elim') {
      if (lastStatus !== 'imp_elim' || lastImpRound !== data.room.impostor_round) {
        enterImpElim(data);
      }
    } else if (status === 'imp_tiebreak') {
      if (lastStatus !== 'imp_tiebreak' || lastImpRound !== data.room.impostor_round) {
        enterImpTiebreak(data);
      }
    } else if (status === 'draw_choose') {
      if (lastStatus !== 'draw_choose' || lastDrawRound !== data.room.draw_round) {
        enterDrawChoose(data);
      }
    } else if (status === 'draw_active') {
      if (lastStatus !== 'draw_active' || lastDrawRound !== data.room.draw_round) {
        enterDrawActive(data);
      } else {
        updateDrawActive(data);
      }
    } else if (status === 'draw_reveal') {
      if (lastStatus !== 'draw_reveal' || lastDrawRound !== data.room.draw_round) {
        enterDrawReveal(data);
      }
    } else if (status === 'scrab_place') {
      if (lastStatus !== 'scrab_place' || lastScrabRound !== data.scrab_round) {
        enterScrabPlace(data);
      } else {
        updateScrabPlace(data);
      }
    } else if (status === 'scrab_word_result') {
      if (lastStatus !== 'scrab_word_result') {
        enterScrabWordResult(data);
      }
    } else if (status === 'wordhunt_active') {
      if (lastStatus !== 'wordhunt_active' || lastWordhuntRound !== data.wordhunt_round) {
        enterWordhuntActive(data);
      } else {
        updateWordhuntActive(data);
      }
    } else if (status === 'wordhunt_round_result') {
      if (lastStatus !== 'wordhunt_round_result') {
        enterWordhuntRoundResult(data);
      }
    } else if (status === 'finished') {
      if (lastStatus !== 'finished') {
        enterResults(data);
      }
    }

    lastStatus = status;
    lastQIdx = qIdx;
    lastImpRound = data.room.impostor_round;
    lastDrawRound = data.room.draw_round;
    lastScrabRound = data.scrab_round || 1;
    lastWordhuntRound = data.wordhunt_round || 0;
  }

  // ---------------- LOBBY ----------------
  function renderLobby(data) {
    const codeEls = [document.getElementById('host-room-code'), document.getElementById('join-wait-code')];
    codeEls.forEach(el => { if (el) el.textContent = roomCode; });

    const countEl = document.getElementById('host-player-count');
    if (countEl) countEl.textContent = `${data.player_count}/20`;

    // The custom code rewrites every player row's room_code server-side, so it's
    // only offered while the host is still alone in the lobby.
    const customCodeRow = document.getElementById('host-custom-code-row');
    if (customCodeRow) customCodeRow.style.display = (isHost && data.player_count <= 1) ? '' : 'none';

    renderPlayerList('host-player-list', data.players, true);
    renderPlayerList('join-wait-player-list', data.players, false);

    if (!isHost && typeof GameInstructions !== 'undefined') {
      GameInstructions.render(data.room.game_format || 'classic', 'join-instructions-box');
    }
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
    const tfGrid = document.getElementById('tf-grid');
    const scrambleBox = document.getElementById('scramble-box');
    const memoryBox = document.getElementById('memory-box');
    const twotruthsBox = document.getElementById('twotruths-box');
    const higherlowerBox = document.getElementById('higherlower-box');
    const versefillBox = document.getElementById('versefill-box');
    const emojiclueBox = document.getElementById('emojiclue-box');
    const hostMonitor = document.getElementById('host-monitor');
    const powerupBar = document.getElementById('powerup-bar');

    if (qBox) qBox.style.display = '';
    if (choicesGrid) choicesGrid.style.display = 'none';
    if (tfGrid) tfGrid.style.display = 'none';
    if (scrambleBox) scrambleBox.style.display = 'none';
    if (memoryBox) memoryBox.style.display = 'none';
    if (twotruthsBox) twotruthsBox.style.display = 'none';
    if (higherlowerBox) higherlowerBox.style.display = 'none';
    if (versefillBox) versefillBox.style.display = 'none';
    if (emojiclueBox) emojiclueBox.style.display = 'none';
    const elimBannerReset = document.getElementById('eliminated-banner');
    if (elimBannerReset) elimBannerReset.style.display = 'none';

    const QTEXT_OVERRIDES = {
      memory: 'Match each name card to its verse reference card!',
      twotruths: 'Two of these are true. One is a lie. Tap the lie!',
      higherlower: 'Tap the fact you think has the bigger number!',
      versefill: 'Fill in the missing word from the verse!',
      emojiclue: 'What Bible story or character do these emojis represent?'
    };
    document.getElementById('q-text').textContent = QTEXT_OVERRIDES[currentGameFormat] || q.question;

    let tfState = null;
    if (currentGameFormat === 'truefalse') {
      tfState = buildTrueFalseStatement(q, data.current_question.q_idx);
      const stEl = document.getElementById('tf-statement');
      if (stEl) stEl.textContent = `Proposed answer: ${tfState.statement}`;
      if (tfGrid) tfGrid.style.display = 'flex';
    } else if (currentGameFormat === 'scramble') {
      const wordEl = document.getElementById('scramble-word');
      if (wordEl) wordEl.textContent = scrambleWord(q.answer, `${roomCode}-${data.current_question.q_idx}`);
      const resultEl = document.getElementById('scramble-result');
      if (resultEl) resultEl.style.display = 'none';
      if (scrambleBox) scrambleBox.style.display = 'block';
    } else if (currentGameFormat === 'memory') {
      if (memoryBox) memoryBox.style.display = 'block';
    } else if (currentGameFormat === 'twotruths') {
      if (twotruthsBox) twotruthsBox.style.display = 'block';
    } else if (currentGameFormat === 'higherlower') {
      if (higherlowerBox) higherlowerBox.style.display = 'block';
    } else if (currentGameFormat === 'versefill') {
      const round = getVerseFillRound(data.current_question.db_index);
      const verseEl = document.getElementById('versefill-verse');
      if (verseEl) verseEl.textContent = round.verse;
      const resultEl = document.getElementById('versefill-result');
      if (resultEl) resultEl.style.display = 'none';
      if (versefillBox) versefillBox.style.display = 'block';
    } else if (currentGameFormat === 'emojiclue') {
      const round = getEmojiClueRound(data.current_question.db_index);
      const emojiEl = document.getElementById('emojiclue-emojis');
      if (emojiEl) emojiEl.textContent = round.emojis;
      const hintEl = document.getElementById('emojiclue-hint');
      const EMOJI_HINT_LABELS = { character: '🧍 Character', thing: '📦 Thing', place: '🗺️ Place', animal: '🐾 Animal' };
      if (hintEl) hintEl.textContent = `${EMOJI_HINT_LABELS[round.type] || '🧍 Character'} — answer in ONE word`;
      const resultEl = document.getElementById('emojiclue-result');
      if (resultEl) resultEl.style.display = 'none';
      if (emojiclueBox) emojiclueBox.style.display = 'block';
    } else {
      q.choices.forEach((c, i) => { document.getElementById(`c${i}-txt`).textContent = c; });
      if (choicesGrid) choicesGrid.style.display = '';
    }

    if (isHost) {
      if (ptsBar) ptsBar.style.display = 'none';
      if (hostMonitor) hostMonitor.style.display = 'flex';
      if (powerupBar) powerupBar.style.display = 'none';

      if (currentGameFormat === 'truefalse') {
        ['tf-true', 'tf-false'].forEach(id => {
          const btn = document.getElementById(id);
          if (btn) { btn.classList.remove('correct', 'wrong', 'reveal-correct'); btn.disabled = true; btn.onclick = null; }
        });
      } else if (currentGameFormat === 'scramble') {
        const input = document.getElementById('scramble-input');
        const submitBtn = document.getElementById('scramble-submit-btn');
        if (input) input.disabled = true;
        if (submitBtn) submitBtn.disabled = true;
      } else if (currentGameFormat === 'memory') {
        // The host doesn't play - they just watch boards get submitted via the monitor below.
      } else if (currentGameFormat === 'twotruths' || currentGameFormat === 'higherlower') {
        // The host doesn't play - they just watch the monitor below.
      } else if (currentGameFormat === 'versefill') {
        const input = document.getElementById('versefill-input');
        const submitBtn = document.getElementById('versefill-submit-btn');
        if (input) input.disabled = true;
        if (submitBtn) submitBtn.disabled = true;
      } else if (currentGameFormat === 'emojiclue') {
        const input = document.getElementById('emojiclue-input');
        const submitBtn = document.getElementById('emojiclue-submit-btn');
        if (input) input.disabled = true;
        if (submitBtn) submitBtn.disabled = true;
      } else {
        if (choicesGrid) choicesGrid.classList.add('host-view');
        for (let i = 0; i < 4; i++) {
          const btn = document.getElementById(`c${i}`);
          btn.className = `choice choice-${'abcd'[i]}`;
          btn.disabled = true;
          btn.onclick = null;
        }
      }

      renderHostMonitor(data);
    } else {
      if (ptsBar) ptsBar.style.display = '';
      if (hostMonitor) hostMonitor.style.display = 'none';

      if (currentGameFormat === 'truefalse') {
        const trueBtn = document.getElementById('tf-true');
        const falseBtn = document.getElementById('tf-false');
        [trueBtn, falseBtn].forEach(b => { if (b) { b.classList.remove('correct', 'wrong', 'reveal-correct'); b.disabled = false; } });
        if (trueBtn) trueBtn.onclick = () => submitTrueFalse(true, tfState, q);
        if (falseBtn) falseBtn.onclick = () => submitTrueFalse(false, tfState, q);
        if (data.my_answer) {
          answeredThisQuestion = true;
          lockTrueFalse(data.my_answer.choice_idx === 1, tfState);
        }
      } else if (currentGameFormat === 'scramble') {
        const input = document.getElementById('scramble-input');
        const submitBtn = document.getElementById('scramble-submit-btn');
        if (input) { input.value = ''; input.disabled = false; }
        if (submitBtn) { submitBtn.disabled = false; submitBtn.onclick = () => submitScramble(q); }
        if (data.my_answer) {
          answeredThisQuestion = true;
          lockScramble(data.my_answer.is_correct, q, null);
        }
      } else if (currentGameFormat === 'memory') {
        if (data.my_answer) answeredThisQuestion = true;
        buildMemoryBoard(data.current_question.q_idx, data.current_question.db_index, data.my_answer);
      } else if (currentGameFormat === 'twotruths') {
        if (data.my_answer) answeredThisQuestion = true;
        buildTwoTruthsRound(data.current_question.q_idx, data.current_question.db_index, data.my_answer);
      } else if (currentGameFormat === 'higherlower') {
        if (data.my_answer) answeredThisQuestion = true;
        buildHigherLowerRound(data.current_question.q_idx, data.current_question.db_index, data.my_answer);
      } else if (currentGameFormat === 'versefill') {
        const input = document.getElementById('versefill-input');
        const submitBtn = document.getElementById('versefill-submit-btn');
        if (input) { input.value = ''; input.disabled = false; }
        const round = getVerseFillRound(data.current_question.db_index);
        if (submitBtn) { submitBtn.disabled = false; submitBtn.onclick = () => submitVerseFill(data.current_question.q_idx, round); }
        if (data.my_answer) {
          answeredThisQuestion = true;
          lockVerseFill(data.my_answer.is_correct, round);
        }
      } else if (currentGameFormat === 'emojiclue') {
        const input = document.getElementById('emojiclue-input');
        const submitBtn = document.getElementById('emojiclue-submit-btn');
        if (input) { input.value = ''; input.disabled = false; }
        const round = getEmojiClueRound(data.current_question.db_index);
        if (submitBtn) { submitBtn.disabled = false; submitBtn.onclick = () => submitEmojiClue(data.current_question.q_idx, round); }
        if (data.my_answer) {
          answeredThisQuestion = true;
          lockEmojiClue(data.my_answer.is_correct, round);
        }
      } else {
        const myPlayer = data.players.find(p => p.device_id === deviceId);
        const eliminated = currentGameFormat === 'survival' && !!(myPlayer && myPlayer.eliminated) && !data.my_answer;

        if (choicesGrid) choicesGrid.classList.remove('host-view');
        for (let i = 0; i < 4; i++) {
          const btn = document.getElementById(`c${i}`);
          btn.className = `choice choice-${'abcd'[i]}`;
          btn.disabled = eliminated;
          btn.onclick = eliminated ? null : () => submitAnswer(i, q);
        }
        if (eliminated) answeredThisQuestion = true;
        if (data.my_answer) {
          answeredThisQuestion = true;
          lockChoices(data.my_answer.choice_idx, q);
        }

        const elimBanner = document.getElementById('eliminated-banner');
        if (elimBanner) elimBanner.style.display = eliminated ? 'block' : 'none';
      }

      const myPlayer = data.players.find(p => p.device_id === deviceId);
      document.getElementById('pts-val').textContent = myPlayer ? myPlayer.score : 0;

      renderPowerupBar(data);
      applyFreezeState(data);
    }

    setMpStatusBadge(data);
    startLocalTicker();
  }

  // ---------------- LIGHTNING TRUE/FALSE ----------------
  // Deterministic pure function of (room, question index, question text) so
  // every polling client - host and all players - derives the exact same
  // proposed statement and ground truth without any extra server storage.
  function seededHash(str) {
    let h = 0;
    for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
    return h;
  }

  function buildTrueFalseStatement(q, qIdx) {
    const seed = `${roomCode}-${qIdx}-${q.question}`;
    const useCorrect = seededHash(seed) % 2 === 0;
    let statement;
    if (useCorrect) {
      statement = q.answer;
    } else {
      const wrongChoices = q.choices.filter(c => c !== q.answer);
      statement = wrongChoices[seededHash(seed + '-w') % wrongChoices.length];
    }
    return { statement, isTrue: useCorrect };
  }

  function submitTrueFalse(selectedBool, tf, question) {
    if (answeredThisQuestion) return;
    answeredThisQuestion = true;
    const elapsedMs = sync.serverElapsedMs + (Date.now() - sync.clientTimeAtSync);
    currentTimeTaken = Math.min(sync.timeLimitSec, elapsedMs / 1000);
    const isCorrect = selectedBool === tf.isTrue;

    lockTrueFalse(selectedBool, tf);

    submitAnswerWithRecovery({
      room_code: roomCode,
      device_id: deviceId,
      q_idx: lastQIdx,
      choice_idx: selectedBool ? 1 : 0,
      is_correct: isCorrect,
      time_taken: currentTimeTaken
    }, () => unlockTrueFalse(tf, question), res => {
      playLocalFeedbackSound(isCorrect);
      showWaitingFeedback(isCorrect, res.points, question, res.streak, res.doubled);
    });
  }

  function lockTrueFalse(selectedBool, tf) {
    const trueBtn = document.getElementById('tf-true');
    const falseBtn = document.getElementById('tf-false');
    [trueBtn, falseBtn].forEach(b => { if (b) { b.disabled = true; b.onclick = null; } });
    const selectedBtn = selectedBool ? trueBtn : falseBtn;
    if (selectedBtn) selectedBtn.classList.add(selectedBool === tf.isTrue ? 'correct' : 'wrong');
  }

  function unlockTrueFalse(tf, question) {
    const trueBtn = document.getElementById('tf-true');
    const falseBtn = document.getElementById('tf-false');
    [trueBtn, falseBtn].forEach(b => { if (b) b.classList.remove('correct', 'wrong'); });
    if (trueBtn) { trueBtn.disabled = false; trueBtn.onclick = () => submitTrueFalse(true, tf, question); }
    if (falseBtn) { falseBtn.disabled = false; falseBtn.onclick = () => submitTrueFalse(false, tf, question); }
  }

  // ---------------- WORD SCRAMBLE ----------------
  // Scrambles letters within each word (seeded by room + question index) so
  // every client shows the same puzzle while word boundaries stay visible.
  function scrambleWord(answer, seedStr) {
    let seed = seededHash(seedStr);
    function rand() { seed = (seed * 1103515245 + 12345) >>> 0; return seed / 4294967296; }
    return answer.split(' ').map(word => {
      const letters = word.split('');
      for (let i = letters.length - 1; i > 0; i--) {
        const j = Math.floor(rand() * (i + 1));
        [letters[i], letters[j]] = [letters[j], letters[i]];
      }
      if (letters.length > 1 && letters.join('') === word) letters.reverse();
      return letters.join('');
    }).join(' ').toUpperCase();
  }

  function normalizeAnswer(s) {
    return s.toLowerCase().trim().replace(/[^a-z0-9]/g, '');
  }

  function submitScramble(question) {
    if (answeredThisQuestion) return;
    const input = document.getElementById('scramble-input');
    const typed = input ? input.value.trim() : '';
    if (!typed) { App.showToast('Type an answer first', 'error'); return; }

    answeredThisQuestion = true;
    const elapsedMs = sync.serverElapsedMs + (Date.now() - sync.clientTimeAtSync);
    currentTimeTaken = Math.min(sync.timeLimitSec, elapsedMs / 1000);
    const isCorrect = normalizeAnswer(typed) === normalizeAnswer(question.answer);

    lockScramble(isCorrect, question, typed);

    submitAnswerWithRecovery({
      room_code: roomCode,
      device_id: deviceId,
      q_idx: lastQIdx,
      choice_idx: 0,
      is_correct: isCorrect,
      time_taken: currentTimeTaken
    }, () => unlockScramble(typed), res => {
      playLocalFeedbackSound(isCorrect);
      showWaitingFeedback(isCorrect, res.points, question, res.streak, res.doubled);
    });
  }

  function lockScramble(isCorrect, question, typed) {
    const input = document.getElementById('scramble-input');
    const submitBtn = document.getElementById('scramble-submit-btn');
    if (input) input.disabled = true;
    if (submitBtn) submitBtn.disabled = true;
    const resultEl = document.getElementById('scramble-result');
    if (resultEl) {
      resultEl.style.display = 'block';
      resultEl.textContent = isCorrect
        ? `✓ Correct! "${typed !== null ? typed : question.answer}"`
        : `✗ Correct answer: ${question.answer}`;
      resultEl.className = 'scramble-result ' + (isCorrect ? 'correct' : 'wrong');
    }
  }

  function unlockScramble(typed) {
    const input = document.getElementById('scramble-input');
    const submitBtn = document.getElementById('scramble-submit-btn');
    const resultEl = document.getElementById('scramble-result');
    if (input) { input.disabled = false; input.value = typed; }
    if (submitBtn) submitBtn.disabled = false;
    if (resultEl) resultEl.style.display = 'none';
  }

  // ---------------- MEMORY MATCH ----------------
  // Every poll resolves the same pool the current difficulty/book/category
  // is already using elsewhere (lookupQuestion), so a board can be built
  // from several pool entries without any new server-side question data.
  function getCurrentPool() {
    if (currentQuizMode === 'book' && currentBook && currentCategory && typeof BookQuestions !== 'undefined') {
      return BookQuestions.getPool(currentBook, currentCategory, currentDifficulty, currentTestament);
    }
    return QUESTION_DB[currentDifficulty];
  }

  // Builds a deterministic board (same seed everywhere) of up to 6 pairs
  // drawn from consecutive pool entries starting at this round's db_index,
  // so no new server storage is needed - same trick as scrambleWord/buildTrueFalseStatement.
  function buildMemoryBoard(qIdx, dbIndex, myAnswer) {
    const pool = getCurrentPool();
    const totalPairs = Math.max(1, Math.min(6, pool.length));
    memoryTotalPairs = totalPairs;

    const foundEl = document.getElementById('memory-pairs-found');
    const board = document.getElementById('memory-board');

    if (myAnswer) {
      if (foundEl) foundEl.textContent = `✓ Submitted: ${myAnswer.choice_idx}/${totalPairs} pairs found`;
      if (board) board.innerHTML = '';
      return;
    }

    const pairs = [];
    for (let i = 0; i < totalPairs; i++) {
      const entry = pool[(dbIndex + i) % pool.length];
      pairs.push({ pairId: i, name: entry.answer, ref: entry.reference || entry.answer });
    }

    const cards = [];
    pairs.forEach(p => {
      cards.push({ pairId: p.pairId, text: p.name });
      cards.push({ pairId: p.pairId, text: p.ref });
    });

    let seed = seededHash(`${roomCode}-${qIdx}-memory`);
    function rand() { seed = (seed * 1103515245 + 12345) >>> 0; return seed / 4294967296; }
    for (let i = cards.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [cards[i], cards[j]] = [cards[j], cards[i]];
    }

    memoryBoardCards = cards;
    memoryFlipped = [];
    memoryPairsFound = 0;
    memoryLocked = false;
    if (foundEl) foundEl.textContent = `0/${totalPairs}`;

    if (board) {
      board.innerHTML = cards.map((c, i) => `<button class="memory-card" id="mem-card-${i}"></button>`).join('');
      cards.forEach((c, i) => {
        const btn = document.getElementById(`mem-card-${i}`);
        if (btn) btn.onclick = () => flipMemoryCard(i, qIdx);
      });
    }
  }

  function flipMemoryCard(idx, qIdx) {
    if (memoryLocked || answeredThisQuestion) return;
    if (memoryFlipped.includes(idx)) return;
    if (memoryFlipped.length >= 2) return;

    const card = memoryBoardCards[idx];
    const btn = document.getElementById(`mem-card-${idx}`);
    if (btn) { btn.classList.add('flipped'); btn.textContent = card.text; }
    memoryFlipped.push(idx);

    if (memoryFlipped.length === 2) {
      const [i1, i2] = memoryFlipped;
      const isMatch = memoryBoardCards[i1].pairId === memoryBoardCards[i2].pairId;
      memoryLocked = true;
      setTimeout(() => {
        const b1 = document.getElementById(`mem-card-${i1}`);
        const b2 = document.getElementById(`mem-card-${i2}`);
        if (isMatch) {
          [b1, b2].forEach(b => { if (b) { b.classList.remove('flipped'); b.classList.add('matched'); b.disabled = true; b.onclick = null; } });
          memoryPairsFound++;
          const foundEl = document.getElementById('memory-pairs-found');
          if (foundEl) foundEl.textContent = `${memoryPairsFound}/${memoryTotalPairs}`;
          if (memoryPairsFound >= memoryTotalPairs) submitMemoryResult(qIdx);
        } else {
          [b1, b2].forEach(b => { if (b) { b.classList.remove('flipped'); b.textContent = ''; } });
        }
        memoryFlipped = [];
        memoryLocked = false;
      }, 700);
    }
  }

  // Also called from the local countdown ticker when time runs out before
  // every pair is found, so a partial board still scores instead of nothing.
  function submitMemoryResult(qIdx) {
    if (answeredThisQuestion) return;
    answeredThisQuestion = true;
    const elapsedMs = sync.serverElapsedMs + (Date.now() - sync.clientTimeAtSync);
    currentTimeTaken = Math.min(sync.timeLimitSec, elapsedMs / 1000);
    const isCorrect = memoryPairsFound >= memoryTotalPairs;

    document.querySelectorAll('#memory-board .memory-card').forEach(b => { b.disabled = true; b.onclick = null; });
    const foundEl = document.getElementById('memory-pairs-found');
    if (foundEl) {
      foundEl.textContent = isCorrect
        ? `✓ All ${memoryTotalPairs} pairs found!`
        : `Time's up — ${memoryPairsFound}/${memoryTotalPairs} pairs found`;
    }

    submitAnswerWithRecovery({
      room_code: roomCode,
      device_id: deviceId,
      q_idx: qIdx,
      choice_idx: memoryPairsFound,
      is_correct: isCorrect,
      time_taken: currentTimeTaken,
      total_pairs: memoryTotalPairs
    }, () => {}, res => {
      playLocalFeedbackSound(isCorrect);
      showWaitingFeedback(isCorrect, res.points, { answer: `${memoryPairsFound}/${memoryTotalPairs} pairs found`, reference: '' }, res.streak, res.doubled);
    });
  }

  // ---------------- TWO TRUTHS AND A LIE ----------------
  // Curated rounds (js/twotruths_data.js) always author the lie at index 2;
  // shuffle the display order per room+question so the lie's position isn't
  // predictable across rounds, same seeded-RNG trick as scrambleWord.
  function getTwoTruthsRound(dbIndex) {
    return TwoTruthsData.ROUNDS[dbIndex % TwoTruthsData.ROUNDS.length];
  }

  function shuffledStatementOrder(qIdx) {
    let seed = seededHash(`${roomCode}-${qIdx}-twotruths`);
    function rand() { seed = (seed * 1103515245 + 12345) >>> 0; return seed / 4294967296; }
    const order = [0, 1, 2];
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
    return order;
  }

  function buildTwoTruthsRound(qIdx, dbIndex, myAnswer) {
    const round = getTwoTruthsRound(dbIndex);
    const order = shuffledStatementOrder(qIdx);
    const lieDisplayPos = order.indexOf(round.lieIndex);

    const subjectEl = document.getElementById('twotruths-subject');
    if (subjectEl) subjectEl.textContent = round.subject;

    const list = document.getElementById('twotruths-list');
    if (!list) return;
    list.innerHTML = order.map((origIdx, pos) =>
      `<button class="tt-statement" id="tt-stmt-${pos}">${round.statements[origIdx]}</button>`
    ).join('');

    if (myAnswer) {
      order.forEach((origIdx, pos) => {
        const btn = document.getElementById(`tt-stmt-${pos}`);
        if (!btn) return;
        btn.disabled = true;
        if (pos === lieDisplayPos) btn.classList.add('correct');
        else if (pos === myAnswer.choice_idx) btn.classList.add('wrong');
      });
      return;
    }

    order.forEach((origIdx, pos) => {
      const btn = document.getElementById(`tt-stmt-${pos}`);
      if (btn) btn.onclick = () => submitTwoTruths(qIdx, pos, lieDisplayPos, round);
    });
  }

  function submitTwoTruths(qIdx, pickedPos, lieDisplayPos, round) {
    if (answeredThisQuestion) return;
    answeredThisQuestion = true;
    const elapsedMs = sync.serverElapsedMs + (Date.now() - sync.clientTimeAtSync);
    currentTimeTaken = Math.min(sync.timeLimitSec, elapsedMs / 1000);
    const isCorrect = pickedPos === lieDisplayPos;

    document.querySelectorAll('#twotruths-list .tt-statement').forEach((btn, pos) => {
      btn.disabled = true;
      btn.onclick = null;
      if (pos === lieDisplayPos) btn.classList.add('correct');
      else if (pos === pickedPos) btn.classList.add('wrong');
    });

    submitAnswerWithRecovery({
      room_code: roomCode,
      device_id: deviceId,
      q_idx: qIdx,
      choice_idx: pickedPos,
      is_correct: isCorrect,
      time_taken: currentTimeTaken
    }, () => unlockTwoTruths(qIdx, lieDisplayPos, round), res => {
      playLocalFeedbackSound(isCorrect);
      showWaitingFeedback(isCorrect, res.points, { answer: round.statements[round.lieIndex], reference: round.reference }, res.streak, res.doubled);
    });
  }

  function unlockTwoTruths(qIdx, lieDisplayPos, round) {
    document.querySelectorAll('#twotruths-list .tt-statement').forEach((btn, pos) => {
      btn.disabled = false;
      btn.classList.remove('correct', 'wrong');
      btn.onclick = () => submitTwoTruths(qIdx, pos, lieDisplayPos, round);
    });
  }

  // ---------------- HIGHER OR LOWER ----------------
  // Curated numeric pairs (js/higherlower_data.js); seeded coin flip decides
  // which side renders left/right so the bigger value isn't always in the
  // same slot. Values stay hidden until the player answers.
  function getHigherLowerPair(dbIndex) {
    return HigherLowerData.PAIRS[dbIndex % HigherLowerData.PAIRS.length];
  }

  function higherLowerSides(qIdx, pair) {
    const flip = seededHash(`${roomCode}-${qIdx}-higherlower`) % 2 === 1;
    return flip
      ? [{ label: pair.rightLabel, value: pair.rightValue }, { label: pair.leftLabel, value: pair.leftValue }]
      : [{ label: pair.leftLabel, value: pair.leftValue }, { label: pair.rightLabel, value: pair.rightValue }];
  }

  function buildHigherLowerRound(qIdx, dbIndex, myAnswer) {
    const pair = getHigherLowerPair(dbIndex);
    const sides = higherLowerSides(qIdx, pair);
    const correctSide = sides[0].value > sides[1].value ? 0 : 1;

    [0, 1].forEach(i => {
      const labelEl = document.getElementById(`hl-label-${i}`);
      const valueEl = document.getElementById(`hl-value-${i}`);
      if (labelEl) labelEl.textContent = sides[i].label;
      if (valueEl) valueEl.textContent = '';
      const card = document.getElementById(`hl-card-${i}`);
      if (card) { card.classList.remove('hl-correct', 'hl-wrong'); card.disabled = false; }
    });

    if (myAnswer) {
      [0, 1].forEach(i => {
        const card = document.getElementById(`hl-card-${i}`);
        const valueEl = document.getElementById(`hl-value-${i}`);
        if (valueEl) valueEl.textContent = sides[i].value.toLocaleString();
        if (!card) return;
        card.disabled = true;
        card.onclick = null;
        if (i === correctSide) card.classList.add('hl-correct');
        else if (i === myAnswer.choice_idx) card.classList.add('hl-wrong');
      });
      return;
    }

    [0, 1].forEach(i => {
      const card = document.getElementById(`hl-card-${i}`);
      if (card) card.onclick = () => submitHigherLower(qIdx, i, correctSide, sides, pair);
    });
  }

  function submitHigherLower(qIdx, pickedSide, correctSide, sides, pair) {
    if (answeredThisQuestion) return;
    answeredThisQuestion = true;
    const elapsedMs = sync.serverElapsedMs + (Date.now() - sync.clientTimeAtSync);
    currentTimeTaken = Math.min(sync.timeLimitSec, elapsedMs / 1000);
    const isCorrect = pickedSide === correctSide;

    [0, 1].forEach(i => {
      const card = document.getElementById(`hl-card-${i}`);
      const valueEl = document.getElementById(`hl-value-${i}`);
      if (valueEl) valueEl.textContent = sides[i].value.toLocaleString();
      if (!card) return;
      card.disabled = true;
      card.onclick = null;
      if (i === correctSide) card.classList.add('hl-correct');
      else if (i === pickedSide) card.classList.add('hl-wrong');
    });

    submitAnswerWithRecovery({
      room_code: roomCode,
      device_id: deviceId,
      q_idx: qIdx,
      choice_idx: pickedSide,
      is_correct: isCorrect,
      time_taken: currentTimeTaken
    }, () => unlockHigherLower(qIdx, correctSide, sides, pair), res => {
      playLocalFeedbackSound(isCorrect);
      showWaitingFeedback(isCorrect, res.points, { answer: `${sides[correctSide].label}: ${sides[correctSide].value.toLocaleString()}`, reference: pair.reference }, res.streak, res.doubled);
    });
  }

  function unlockHigherLower(qIdx, correctSide, sides, pair) {
    [0, 1].forEach(i => {
      const card = document.getElementById(`hl-card-${i}`);
      const valueEl = document.getElementById(`hl-value-${i}`);
      if (valueEl) valueEl.textContent = '';
      if (!card) return;
      card.disabled = false;
      card.classList.remove('hl-correct', 'hl-wrong');
      card.onclick = () => submitHigherLower(qIdx, i, correctSide, sides, pair);
    });
  }

  // ---------------- VERSE FILL-IN-THE-BLANK ----------------
  // Curated verses (js/versefill_data.js) with one word blanked out; no
  // choices shown, so scoring reuses the same normalizeAnswer compare as
  // Word Scramble - exact match required (one accepted spelling per round).
  function getVerseFillRound(dbIndex) {
    return VerseFillData.ROUNDS[dbIndex % VerseFillData.ROUNDS.length];
  }

  function submitVerseFill(qIdx, round) {
    if (answeredThisQuestion) return;
    const input = document.getElementById('versefill-input');
    const typed = input ? input.value.trim() : '';
    if (!typed) { App.showToast('Type the missing word first', 'error'); return; }

    answeredThisQuestion = true;
    const elapsedMs = sync.serverElapsedMs + (Date.now() - sync.clientTimeAtSync);
    currentTimeTaken = Math.min(sync.timeLimitSec, elapsedMs / 1000);
    const isCorrect = normalizeAnswer(typed) === normalizeAnswer(round.answer);

    lockVerseFill(isCorrect, round, typed);

    submitAnswerWithRecovery({
      room_code: roomCode,
      device_id: deviceId,
      q_idx: qIdx,
      choice_idx: 0,
      is_correct: isCorrect,
      time_taken: currentTimeTaken
    }, () => unlockVerseFill(typed), res => {
      playLocalFeedbackSound(isCorrect);
      showWaitingFeedback(isCorrect, res.points, { answer: round.answer, reference: round.reference }, res.streak, res.doubled);
    });
  }

  function lockVerseFill(isCorrect, round, typed) {
    const input = document.getElementById('versefill-input');
    const submitBtn = document.getElementById('versefill-submit-btn');
    if (input) input.disabled = true;
    if (submitBtn) submitBtn.disabled = true;
    const resultEl = document.getElementById('versefill-result');
    if (resultEl) {
      resultEl.style.display = 'block';
      resultEl.textContent = isCorrect
        ? `✓ Correct! "${typed != null ? typed : round.answer}"`
        : `✗ Correct answer: ${round.answer}`;
      resultEl.className = 'versefill-result ' + (isCorrect ? 'correct' : 'wrong');
    }
  }

  function unlockVerseFill(typed) {
    const input = document.getElementById('versefill-input');
    const submitBtn = document.getElementById('versefill-submit-btn');
    const resultEl = document.getElementById('versefill-result');
    if (input) { input.disabled = false; input.value = typed; }
    if (submitBtn) submitBtn.disabled = false;
    if (resultEl) resultEl.style.display = 'none';
  }

  // ---------------- EMOJI STORY CLUE ----------------
  // Curated emoji sequences (js/emojiclue_data.js); each round lists every
  // accepted phrasing in `answers`, matched via the same normalizeAnswer
  // compare used elsewhere so spacing/punctuation/case don't matter.
  function getEmojiClueRound(dbIndex) {
    return EmojiClueData.ROUNDS[dbIndex % EmojiClueData.ROUNDS.length];
  }

  function matchesAnyAnswer(typed, answers) {
    const norm = normalizeAnswer(typed);
    if (!norm) return false;
    return answers.some(a => normalizeAnswer(a) === norm);
  }

  function submitEmojiClue(qIdx, round) {
    if (answeredThisQuestion) return;
    const input = document.getElementById('emojiclue-input');
    const typed = input ? input.value.trim() : '';
    if (!typed) { App.showToast('Type your guess first', 'error'); return; }

    const wordCount = typed.split(/\s+/).filter(Boolean).length;
    if (wordCount !== 1) {
      App.showToast('Answers are one word only', 'error');
      return;
    }

    answeredThisQuestion = true;
    const elapsedMs = sync.serverElapsedMs + (Date.now() - sync.clientTimeAtSync);
    currentTimeTaken = Math.min(sync.timeLimitSec, elapsedMs / 1000);
    const isCorrect = matchesAnyAnswer(typed, round.answers);

    lockEmojiClue(isCorrect, round, typed);

    submitAnswerWithRecovery({
      room_code: roomCode,
      device_id: deviceId,
      q_idx: qIdx,
      choice_idx: 0,
      is_correct: isCorrect,
      time_taken: currentTimeTaken
    }, () => unlockEmojiClue(typed), res => {
      playLocalFeedbackSound(isCorrect);
      showWaitingFeedback(isCorrect, res.points, { answer: round.display, reference: round.reference }, res.streak, res.doubled);
    });
  }

  function lockEmojiClue(isCorrect, round, typed) {
    const input = document.getElementById('emojiclue-input');
    const submitBtn = document.getElementById('emojiclue-submit-btn');
    if (input) input.disabled = true;
    if (submitBtn) submitBtn.disabled = true;
    const resultEl = document.getElementById('emojiclue-result');
    if (resultEl) {
      resultEl.style.display = 'block';
      resultEl.textContent = isCorrect
        ? `✓ Correct! "${typed != null ? typed : round.display}"`
        : `✗ Correct answer: ${round.display}`;
      resultEl.className = 'emojiclue-result ' + (isCorrect ? 'correct' : 'wrong');
    }
  }

  function unlockEmojiClue(typed) {
    const input = document.getElementById('emojiclue-input');
    const submitBtn = document.getElementById('emojiclue-submit-btn');
    const resultEl = document.getElementById('emojiclue-result');
    if (input) { input.disabled = false; input.value = typed; }
    if (submitBtn) submitBtn.disabled = false;
    if (resultEl) resultEl.style.display = 'none';
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
      if (p.eliminated) {
        statusClass = 'eliminated';
        statusText = '💀 Eliminated';
      } else if (p.has_answered) {
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

  // ---------------- WORD IMPOSTOR ----------------
  // No timer in this mode - every screen either auto-advances once every
  // alive contestant has acted (tracked server-side via impostor_clue_count
  // / impostor_vote_count) or waits on the host (HostGame.xxx calls below).
  function lookupImpostorWord(data) {
    const pair = ImpostorData.PAIRS[data.room.impostor_word_pair_idx];
    if (!pair) return '—';
    return data.am_i_impostor ? pair.wordB : pair.wordA;
  }

  function avatarHtmlFor(p) {
    return (p.avatar && p.avatar.startsWith('data:'))
      ? `<img src="${p.avatar}" style="width:1.8rem;height:1.8rem;border-radius:50%;object-fit:cover;">`
      : `<span class="player-avatar-badge">${p.avatar}</span>`;
  }

  // Tells a contestant which side they're on - the word card alone only
  // implies it (crew get wordA, the impostor gets wordB).
  function renderImpRoleBadge(elId, data) {
    const el = document.getElementById(elId);
    if (!el) return;
    el.textContent = data.am_i_impostor ? '🕵️ You are the IMPOSTOR' : '👥 You are CREW';
    el.className = 'imp-role-badge' + (data.am_i_impostor ? ' impostor' : ' crew');
  }

  // Host-only answer key: both secret words plus the full crew/impostor
  // breakdown - room_state.php only populates impostor_crew_list /
  // impostor_impostor_list for the host, so this is safe to call unconditionally.
  function renderImpHostAnswerKey(elId, data) {
    const el = document.getElementById(elId);
    if (!el) return;
    const pair = ImpostorData.PAIRS[data.room.impostor_word_pair_idx];
    const crewWord = pair ? pair.wordA : '—';
    const impostorWord = pair ? pair.wordB : '—';
    const crewList = data.impostor_crew_list || [];
    const impostorList = data.impostor_impostor_list || [];
    const rowHtml = p => `
      <div class="imp-answerkey-row${p.eliminated ? ' eliminated' : ''}">
        ${avatarHtmlFor(p)}<span>${escapeHtml(p.name)}</span>${p.eliminated ? '<span class="imp-answerkey-elim-tag">💀</span>' : ''}
      </div>`;
    el.innerHTML = `
      <div class="imp-answerkey-words">
        <div><span class="imp-answerkey-label">👥 Crew Word</span><span class="imp-answerkey-word">${escapeHtml(crewWord)}</span></div>
        <div><span class="imp-answerkey-label">🕵️ Impostor Word</span><span class="imp-answerkey-word">${escapeHtml(impostorWord)}</span></div>
      </div>
      <div class="imp-answerkey-lists">
        <div class="imp-answerkey-col">
          <p class="imp-answerkey-col-title">👥 Crew (${crewList.length})</p>
          ${crewList.map(rowHtml).join('') || '<p class="hint-text">—</p>'}
        </div>
        <div class="imp-answerkey-col">
          <p class="imp-answerkey-col-title">🕵️ Impostor${impostorList.length > 1 ? 's' : ''} (${impostorList.length})</p>
          ${impostorList.map(rowHtml).join('') || '<p class="hint-text">—</p>'}
        </div>
      </div>
    `;
  }

  function renderImpClueList(containerId, data) {
    const list = document.getElementById(containerId);
    if (!list) return;
    list.innerHTML = (data.impostor_clues || []).map(c => `
      <div class="imp-clue-item">
        <span class="imp-clue-name">${avatarHtmlFor(c)} ${escapeHtml(c.name)}</span>
        <span class="imp-clue-text">"${escapeHtml(c.clue)}"</span>
      </div>
    `).join('');
  }

  function renderImpActedMonitor(listId, data, actedLabel) {
    const list = document.getElementById(listId);
    if (!list) return;
    const contestants = data.players.filter(p => !p.is_host);
    list.innerHTML = contestants.map(p => {
      let statusClass = '';
      let statusText = 'Waiting…';
      if (p.eliminated) {
        statusClass = 'eliminated';
        statusText = '💀 Eliminated';
      } else if (p.impostor_acted) {
        statusClass = 'answered';
        statusText = actedLabel;
      }
      return `
        <div class="host-monitor-item ${statusClass}">
          ${avatarHtmlFor(p)}
          <span class="host-monitor-name">${escapeHtml(p.name)}</span>
          <span class="host-monitor-status">${statusText}</span>
        </div>
      `;
    }).join('');
  }

  function submitImpostorClue(round) {
    const input = document.getElementById('imp-clue-input');
    const clue = input ? input.value.trim() : '';
    if (!clue) { App.showToast('Type a clue first', 'error'); return; }
    const submitBtn = document.getElementById('imp-clue-submit-btn');
    if (input) input.disabled = true;
    if (submitBtn) submitBtn.disabled = true;
    api('submit_impostor_clue.php', {
      room_code: roomCode,
      device_id: deviceId,
      round: round,
      clue: clue
    }).then(res => {
      if (res.success) {
        const submittedText = document.getElementById('imp-clue-submitted-text');
        if (submittedText) submittedText.style.display = 'block';
        poll();
      } else {
        App.showToast(res.error || 'Could not submit clue', 'error');
        if (input) input.disabled = false;
        if (submitBtn) submitBtn.disabled = false;
      }
    }).catch(err => {
      console.error('Clue submit failed:', err);
      App.showToast('Could not reach the host - try again.', 'error');
      if (input) input.disabled = false;
      if (submitBtn) submitBtn.disabled = false;
    });
  }

  function submitImpostorVote(round, targetDeviceId) {
    api('submit_impostor_vote.php', {
      room_code: roomCode,
      device_id: deviceId,
      round: round,
      target_device_id: targetDeviceId
    }).then(res => {
      if (res.success) {
        poll();
      } else {
        App.showToast(res.error || 'Could not submit vote', 'error');
      }
    }).catch(err => {
      console.error('Vote submit failed:', err);
      App.showToast('Could not reach the host - try again.', 'error');
    });
  }

  function enterImpClue(data) {
    App.goTo('imp-clue');
    const round = data.room.impostor_round;
    const wordCard = document.getElementById('imp-clue-word-card');
    const form = document.getElementById('imp-clue-form');
    const elimBanner = document.getElementById('imp-clue-eliminated-banner');
    const hostMonitor = document.getElementById('imp-clue-host-monitor');
    const statusBadge = document.getElementById('imp-clue-status-badge');

    if (isHost) {
      if (wordCard) wordCard.style.display = 'none';
      if (form) form.style.display = 'none';
      if (elimBanner) elimBanner.style.display = 'none';
      if (hostMonitor) hostMonitor.style.display = 'block';
      if (statusBadge) statusBadge.style.display = 'none';
      renderImpHostAnswerKey('imp-clue-answerkey', data);
      renderImpActedMonitor('imp-clue-host-monitor-list', data, '✓ Clue in');
      return;
    }

    if (hostMonitor) hostMonitor.style.display = 'none';

    const myPlayer = data.players.find(p => p.device_id === deviceId);
    const eliminated = !!(myPlayer && myPlayer.eliminated);

    if (wordCard) wordCard.style.display = eliminated ? 'none' : '';
    if (elimBanner) elimBanner.style.display = eliminated ? 'block' : 'none';
    if (form) form.style.display = eliminated ? 'none' : '';
    if (statusBadge) statusBadge.style.display = eliminated ? 'none' : 'flex';

    if (eliminated) return;

    const wordEl = document.getElementById('imp-clue-word');
    if (wordEl) wordEl.textContent = lookupImpostorWord(data);
    renderImpRoleBadge('imp-clue-role-badge', data);

    const input = document.getElementById('imp-clue-input');
    const submitBtn = document.getElementById('imp-clue-submit-btn');
    const submittedText = document.getElementById('imp-clue-submitted-text');

    if (data.my_impostor_clue !== null) {
      if (input) { input.value = data.my_impostor_clue; input.disabled = true; }
      if (submitBtn) submitBtn.disabled = true;
      if (submittedText) submittedText.style.display = 'block';
    } else {
      if (input) { input.value = ''; input.disabled = false; }
      if (submitBtn) { submitBtn.disabled = false; submitBtn.onclick = () => submitImpostorClue(round); }
      if (submittedText) submittedText.style.display = 'none';
    }
  }

  function updateImpClueProgress(data) {
    const statusBadge = document.getElementById('imp-clue-status-badge');
    if (statusBadge && !isHost) statusBadge.textContent = `👥 ${data.impostor_clue_count}/${data.impostor_alive_count} submitted`;
    if (isHost) renderImpActedMonitor('imp-clue-host-monitor-list', data, '✓ Clue in');
  }

  function enterImpReveal(data) {
    App.goTo('imp-reveal');
    const wordCard = document.getElementById('imp-reveal-word-card');
    const hostControls = document.getElementById('imp-reveal-host-controls');
    const waitingText = document.getElementById('imp-reveal-waiting-text');
    const myPlayer = data.players.find(p => p.device_id === deviceId);
    const eliminated = !!(myPlayer && myPlayer.eliminated);

    if (isHost || eliminated) {
      if (wordCard) wordCard.style.display = 'none';
    } else {
      if (wordCard) wordCard.style.display = '';
      const wordEl = document.getElementById('imp-reveal-word');
      if (wordEl) wordEl.textContent = lookupImpostorWord(data);
      renderImpRoleBadge('imp-reveal-role-badge', data);
    }

    renderImpClueList('imp-reveal-clue-list', data);

    if (isHost) renderImpHostAnswerKey('imp-reveal-answerkey', data);
    if (hostControls) hostControls.style.display = isHost ? 'block' : 'none';
    if (waitingText) waitingText.style.display = isHost ? 'none' : 'block';
  }

  function enterImpVote(data) {
    App.goTo('imp-vote');
    renderImpClueList('imp-vote-clue-list', data);
    renderImpVotedAvatars(data);

    const elimBanner = document.getElementById('imp-vote-eliminated-banner');
    const voteList = document.getElementById('imp-vote-list');
    const submittedText = document.getElementById('imp-vote-submitted-text');
    const hostMonitor = document.getElementById('imp-vote-host-monitor');
    const statusBadge = document.getElementById('imp-vote-status-badge');

    if (isHost) {
      if (elimBanner) elimBanner.style.display = 'none';
      if (voteList) voteList.style.display = 'none';
      if (submittedText) submittedText.style.display = 'none';
      if (hostMonitor) hostMonitor.style.display = 'block';
      if (statusBadge) statusBadge.style.display = 'none';
      renderImpHostAnswerKey('imp-vote-answerkey', data);
      renderImpActedMonitor('imp-vote-host-monitor-list', data, '✓ Vote in');
      updateImpVoteProceedBtn(data);
      return;
    }

    if (hostMonitor) hostMonitor.style.display = 'none';
    if (statusBadge) statusBadge.style.display = 'flex';

    const myPlayer = data.players.find(p => p.device_id === deviceId);
    const eliminated = !!(myPlayer && myPlayer.eliminated);

    if (elimBanner) elimBanner.style.display = eliminated ? 'block' : 'none';
    if (voteList) voteList.style.display = eliminated ? 'none' : 'flex';

    if (eliminated) {
      if (submittedText) submittedText.style.display = 'none';
      return;
    }

    renderImpVoteButtons(data);
  }

  // Visible to every player (not just the host monitor) so everyone can see,
  // at a glance, who has already cast their vote this round.
  function renderImpVotedAvatars(data) {
    const row = document.getElementById('imp-vote-voted-avatars');
    if (!row) return;
    const voters = data.players.filter(p => !p.is_host && p.impostor_acted);
    row.innerHTML = voters.map(p => `<span class="imp-voted-avatar-badge">${avatarHtmlFor(p)}</span>`).join('');
  }

  function updateImpVoteProceedBtn(data) {
    const btn = document.getElementById('imp-vote-proceed-btn');
    if (!btn) return;
    const allVoted = data.impostor_vote_count >= data.impostor_alive_count;
    btn.textContent = allVoted ? '▶ Proceed' : '⏭ Force Advance (skip stragglers)';
    btn.className = 'btn ' + (allVoted ? 'btn-success' : 'btn-secondary');
  }

  function renderImpVoteButtons(data) {
    const voteList = document.getElementById('imp-vote-list');
    const submittedText = document.getElementById('imp-vote-submitted-text');
    if (!voteList) return;
    const round = data.room.impostor_round;
    const alreadyVoted = data.my_impostor_vote !== null;
    const targets = data.players.filter(p => !p.is_host && !p.eliminated && p.device_id !== deviceId);
    voteList.innerHTML = '';
    targets.forEach(p => {
      const isMyVote = data.my_impostor_vote === p.device_id;
      const btn = document.createElement('button');
      btn.className = 'imp-vote-btn' + (isMyVote ? ' voted' : '');
      btn.innerHTML = `${avatarHtmlFor(p)}<span class="imp-vote-name">${escapeHtml(p.name)}</span>`;
      btn.disabled = alreadyVoted;
      if (!alreadyVoted) btn.onclick = () => submitImpostorVote(round, p.device_id);
      voteList.appendChild(btn);
    });
    if (submittedText) submittedText.style.display = alreadyVoted ? 'block' : 'none';
  }

  function updateImpVoteProgress(data) {
    const statusBadge = document.getElementById('imp-vote-status-badge');
    if (statusBadge && !isHost) statusBadge.textContent = `👥 ${data.impostor_vote_count}/${data.impostor_alive_count} voted`;
    renderImpVotedAvatars(data);
    if (isHost) {
      renderImpActedMonitor('imp-vote-host-monitor-list', data, '✓ Vote in');
      updateImpVoteProceedBtn(data);
    }
  }

  function enterImpElim(data) {
    App.goTo('imp-elim');
    const banner = document.getElementById('imp-elim-banner');
    const hostControls = document.getElementById('imp-elim-host-controls');
    const waitingText = document.getElementById('imp-elim-waiting-text');

    if (banner) {
      if (data.room.impostor_last_skipped) {
        banner.textContent = '🤷 No one was eliminated this round.';
      } else if (data.impostor_last_elim) {
        banner.textContent = data.impostor_last_elim.was_impostor
          ? `💀 ${data.impostor_last_elim.name} was voted out — they were an Impostor! Keep watch for the rest.`
          : `💀 ${data.impostor_last_elim.name} was voted out. The Impostor is still among you!`;
      } else {
        banner.textContent = '';
      }
    }

    if (isHost) renderImpHostAnswerKey('imp-elim-answerkey', data);
    if (hostControls) hostControls.style.display = isHost ? 'block' : 'none';
    if (waitingText) waitingText.style.display = isHost ? 'none' : 'block';
  }

  function enterImpTiebreak(data) {
    App.goTo('imp-tiebreak');
    const list = document.getElementById('imp-tiebreak-list');
    const hostControls = document.getElementById('imp-tiebreak-host-controls');
    const waitingText = document.getElementById('imp-tiebreak-waiting-text');

    if (list) {
      list.innerHTML = '';
      (data.impostor_vote_tally || []).forEach(t => {
        const el = document.createElement(isHost ? 'button' : 'div');
        el.className = 'imp-vote-btn';
        el.innerHTML = `${avatarHtmlFor(t)}<span class="imp-vote-name">${escapeHtml(t.name)}</span><span class="imp-vote-count">${t.cnt} votes</span>`;
        if (isHost) el.onclick = () => HostGame.resolveImpostorTiebreak(t.target_device_id);
        list.appendChild(el);
      });
    }

    if (isHost) renderImpHostAnswerKey('imp-tiebreak-answerkey', data);
    if (hostControls) hostControls.style.display = isHost ? 'block' : 'none';
    if (waitingText) waitingText.style.display = isHost ? 'none' : 'block';
  }

  function renderImpostorResultBanner(data) {
    const banner = document.getElementById('results-imp-banner');
    if (!banner) return;
    const reveals = data.impostor_reveal;
    if (data.room.game_format !== 'impostor' || !reveals || !reveals.length) {
      banner.style.display = 'none';
      return;
    }
    const plural = reveals.length > 1;
    const names = reveals.map(r => r.name).join(' & ');
    banner.textContent = data.room.impostor_result === 'crew_win'
      ? `🎉 The Crew Wins! The Impostor${plural ? 's were' : ' was'} ${names} and got caught.`
      : `🕵️ The Impostor${plural ? 's' : ''} Win${plural ? '' : 's'}! ${names} survived undetected.`;
    banner.style.display = 'block';
  }

  // ---------------- SKETCH & GUESS ----------------
  const DRAW_GUESS_POINTS = [300, 200, 100];

  function drawWordText(idx) {
    const entry = typeof DrawingWords !== 'undefined' ? DrawingWords.WORDS[idx] : null;
    return entry ? entry.word : '—';
  }

  function clearDrawCanvas(canvas) {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  function drawStrokeOnCanvas(canvas, stroke) {
    if (!canvas || !stroke.points || stroke.points.length < 2) return;
    const ctx = canvas.getContext('2d');
    ctx.strokeStyle = stroke.color || '#000000';
    ctx.lineWidth = stroke.line_width || 4;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
    for (let i = 1; i < stroke.points.length; i++) ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
    ctx.stroke();
  }

  function canvasPointFromEvent(canvas, evt) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return { x: (evt.clientX - rect.left) * scaleX, y: (evt.clientY - rect.top) * scaleY };
  }

  // Pointer handlers stay bound to #draw-canvas for the lifetime of the page;
  // drawCanDraw (re-set every time enterDrawActive/enterDrawChoose runs) is
  // what actually gates whether this device's pointer input does anything,
  // since who's allowed to draw changes every turn.
  function bindDrawCanvasPointerEvents() {
    if (drawPointerBound) return;
    drawPointerBound = true;
    const canvas = document.getElementById('draw-canvas');
    const colorInput = document.getElementById('draw-color-input');
    if (colorInput) {
      drawColor = colorInput.value;
      colorInput.addEventListener('input', () => { drawColor = colorInput.value; });
    }
    document.querySelectorAll('.draw-thickness-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        drawLineWidth = parseInt(btn.dataset.width, 10);
        document.querySelectorAll('.draw-thickness-btn').forEach(b => b.classList.toggle('active', b === btn));
      });
    });
    if (!canvas) return;
    let currentStroke = null;

    canvas.addEventListener('pointerdown', (evt) => {
      if (!drawCanDraw) return;
      drawDrawing = true;
      currentStroke = [canvasPointFromEvent(canvas, evt)];
      canvas.setPointerCapture(evt.pointerId);
    });
    canvas.addEventListener('pointermove', (evt) => {
      if (!drawCanDraw || !drawDrawing || !currentStroke) return;
      const pt = canvasPointFromEvent(canvas, evt);
      const prev = currentStroke[currentStroke.length - 1];
      currentStroke.push(pt);
      const ctx = canvas.getContext('2d');
      ctx.strokeStyle = drawColor;
      ctx.lineWidth = drawLineWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(prev.x, prev.y);
      ctx.lineTo(pt.x, pt.y);
      ctx.stroke();
    });
    const finishStroke = () => {
      if (!drawDrawing) return;
      drawDrawing = false;
      if (currentStroke && currentStroke.length >= 2) {
        submitDrawingStroke(currentStroke);
      }
      currentStroke = null;
    };
    canvas.addEventListener('pointerup', finishStroke);
    canvas.addEventListener('pointercancel', finishStroke);
    canvas.addEventListener('pointerleave', finishStroke);
  }

  function submitDrawWordChoice(round, choiceIdx, onFail) {
    api('submit_draw_word_choice.php', {
      room_code: roomCode,
      device_id: deviceId,
      round: round,
      choice_idx: choiceIdx
    }).then(res => {
      if (res.success) poll();
      else { App.showToast(res.error || 'Could not pick that word', 'error'); if (onFail) onFail(); }
    }).catch(err => {
      console.error('Word choice failed:', err);
      App.showToast('Could not reach the host - try again.', 'error');
      if (onFail) onFail();
    });
  }

  function submitDrawingStroke(points) {
    api('submit_drawing_stroke.php', {
      room_code: roomCode,
      device_id: deviceId,
      round: lastDrawRound,
      points: points,
      color: drawColor,
      line_width: drawLineWidth
    }).catch(err => console.error('Stroke submit failed:', err));
  }

  function submitDrawingGuess() {
    const input = document.getElementById('draw-guess-input');
    const guess = input ? input.value.trim() : '';
    if (!guess) return;
    // draw_word_idx is hidden from guessers while drawing is active, so
    // correctness can't be judged here - the server checks it against
    // api/drawing_words.php and returns the verdict in res.is_correct.
    api('submit_drawing_guess.php', {
      room_code: roomCode,
      device_id: deviceId,
      round: lastDrawRound,
      guess_text: guess
    }).then(res => {
      if (!res.success) { App.showToast(res.error || 'Could not submit guess', 'error'); return; }
      if (input) input.value = '';
      if (res.is_correct) {
        const correctText = document.getElementById('draw-guess-correct-text');
        if (correctText) correctText.style.display = 'block';
        const form = document.getElementById('draw-guess-form');
        if (form) form.querySelectorAll('input, button').forEach(el => el.disabled = true);
        App.showToast(`✓ Correct! +${res.points || 0} points`, 'success');
      } else {
        App.showToast('Not quite — try again!', 'error', 1200);
      }
      poll();
    }).catch(err => {
      console.error('Guess submit failed:', err);
      App.showToast('Could not reach the host - try again.', 'error');
    });
  }

  function renderDrawGuessLog(data) {
    const log = document.getElementById('draw-guess-log');
    if (!log) return;
    const entries = data.draw_guess_log || [];
    const wasAtBottom = log.scrollTop + log.clientHeight >= log.scrollHeight - 4;
    log.innerHTML = entries.map(g => `
      <div class="draw-guess-log-row${g.is_correct ? ' correct' : ''}">
        ${avatarHtmlFor(g)}
        <span class="draw-guess-log-name">${escapeHtml(g.name)}:</span>
        <span class="draw-guess-log-text">${g.is_correct ? `${escapeHtml(g.text)} ✓` : escapeHtml(g.text)}</span>
      </div>
    `).join('') || '<p class="hint-text">No guesses yet…</p>';
    if (wasAtBottom) log.scrollTop = log.scrollHeight;
  }

  function renderDrawCorrectAvatars(containerId, guesses, withRank) {
    const row = document.getElementById(containerId);
    if (!row) return;
    row.innerHTML = guesses.map(g => `
      <span class="draw-correct-avatar-badge">${avatarHtmlFor(g)}${withRank ? `<span class="draw-rank-tag">${g.rank}</span>` : ''}</span>
    `).join('');
  }

  function enterDrawChoose(data) {
    App.goTo('draw-choose');
    lastStrokeId = 0;
    const turnBadge = document.getElementById('draw-choose-turn-badge');
    if (turnBadge) turnBadge.textContent = `Turn ${data.draw_turn_number}/${data.draw_total_turns}`;

    const drawerBox = document.getElementById('draw-choose-drawer-box');
    const waitingBox = document.getElementById('draw-choose-waiting-box');
    const hostMonitor = document.getElementById('draw-choose-host-monitor');
    const drawerName = data.draw_current_drawer ? data.draw_current_drawer.name : 'someone';

    if (data.am_i_drawer) {
      if (drawerBox) drawerBox.style.display = '';
      if (waitingBox) waitingBox.style.display = 'none';
      if (hostMonitor) hostMonitor.style.display = 'none';
      const choicesBox = document.getElementById('draw-word-choices');
      if (choicesBox) {
        choicesBox.innerHTML = '';
        (data.my_draw_word_choices || []).forEach(idx => {
          const btn = document.createElement('button');
          btn.className = 'draw-word-choice-btn';
          btn.textContent = drawWordText(idx);
          btn.onclick = () => {
            choicesBox.querySelectorAll('button').forEach(b => b.disabled = true);
            submitDrawWordChoice(data.room.draw_round, idx, () => {
              // Submission failed (e.g. a transient server error) - re-enable
              // so the drawer isn't left stuck looking at unclickable buttons.
              choicesBox.querySelectorAll('button').forEach(b => b.disabled = false);
            });
          };
          choicesBox.appendChild(btn);
        });
      }
    } else if (isHost) {
      if (drawerBox) drawerBox.style.display = 'none';
      if (waitingBox) waitingBox.style.display = 'none';
      if (hostMonitor) hostMonitor.style.display = 'block';
      const hostText = document.getElementById('draw-choose-host-text');
      if (hostText) hostText.textContent = `Waiting for ${drawerName} to pick a word…`;
    } else {
      if (drawerBox) drawerBox.style.display = 'none';
      if (hostMonitor) hostMonitor.style.display = 'none';
      if (waitingBox) waitingBox.style.display = 'block';
      const waitingText = document.getElementById('draw-choose-waiting-text');
      if (waitingText) waitingText.textContent = `${drawerName} is picking a word to draw…`;
    }
  }

  function enterDrawActive(data) {
    App.goTo('draw-active');
    lastStrokeId = 0;
    drawCanDraw = !!data.am_i_drawer;
    bindDrawCanvasPointerEvents();

    const canvas = document.getElementById('draw-canvas');
    clearDrawCanvas(canvas);
    (data.draw_strokes || []).forEach(s => {
      drawStrokeOnCanvas(canvas, s);
      lastStrokeId = Math.max(lastStrokeId, s.id);
    });

    const title = document.getElementById('draw-active-title');
    const turnBadge = document.getElementById('draw-active-turn-badge');
    const hostWord = document.getElementById('draw-active-host-word');
    const hostMonitor = document.getElementById('draw-active-host-monitor');
    const guessForm = document.getElementById('draw-guess-form');
    const correctText = document.getElementById('draw-guess-correct-text');
    const guessInput = document.getElementById('draw-guess-input');
    const guessBtn = document.getElementById('draw-guess-submit-btn');
    const colorPicker = document.getElementById('draw-color-picker');

    if (turnBadge) turnBadge.textContent = `Turn ${data.draw_turn_number}/${data.draw_total_turns}`;
    if (correctText) correctText.style.display = 'none';
    if (guessInput) { guessInput.value = ''; guessInput.disabled = false; }
    if (guessBtn) { guessBtn.disabled = false; guessBtn.onclick = submitDrawingGuess; }
    if (colorPicker) colorPicker.style.display = data.am_i_drawer ? 'flex' : 'none';

    if (data.am_i_drawer) {
      if (title) title.textContent = `🎨 Draw: ${drawWordText(data.draw_word_idx)}`;
      if (guessForm) guessForm.style.display = 'none';
      if (hostWord) hostWord.style.display = 'none';
      if (hostMonitor) hostMonitor.style.display = 'none';
    } else if (isHost) {
      if (title) title.textContent = '🎨 Sketch & Guess';
      if (guessForm) guessForm.style.display = 'none';
      if (hostWord) { hostWord.style.display = 'block'; hostWord.textContent = `Secret word: ${drawWordText(data.draw_word_idx)}`; }
      if (hostMonitor) hostMonitor.style.display = 'block';
    } else {
      if (title) title.textContent = '🎨 Sketch & Guess';
      if (hostWord) hostWord.style.display = 'none';
      if (hostMonitor) hostMonitor.style.display = 'none';
      if (guessForm) guessForm.style.display = '';
      if (data.draw_my_guessed_correctly) {
        if (correctText) correctText.style.display = 'block';
        if (guessInput) guessInput.disabled = true;
        if (guessBtn) guessBtn.disabled = true;
      }
    }

    renderDrawCorrectAvatars('draw-correct-avatars', data.draw_guesses || [], true);
    renderDrawGuessLog(data);
  }

  function updateDrawActive(data) {
    const canvas = document.getElementById('draw-canvas');
    (data.draw_strokes || []).forEach(s => {
      if (s.id > lastStrokeId) {
        drawStrokeOnCanvas(canvas, s);
        lastStrokeId = Math.max(lastStrokeId, s.id);
      }
    });
    renderDrawCorrectAvatars('draw-correct-avatars', data.draw_guesses || [], true);
    renderDrawGuessLog(data);
    if (!isHost && !data.am_i_drawer && data.draw_my_guessed_correctly) {
      const correctText = document.getElementById('draw-guess-correct-text');
      const guessInput = document.getElementById('draw-guess-input');
      const guessBtn = document.getElementById('draw-guess-submit-btn');
      if (correctText) correctText.style.display = 'block';
      if (guessInput) guessInput.disabled = true;
      if (guessBtn) guessBtn.disabled = true;
    }
  }

  function enterDrawReveal(data) {
    App.goTo('draw-reveal');
    const canvas = document.getElementById('draw-reveal-canvas');
    clearDrawCanvas(canvas);
    (data.draw_strokes || []).forEach(s => drawStrokeOnCanvas(canvas, s));

    const wordText = document.getElementById('draw-reveal-word-text');
    if (wordText) wordText.textContent = `The word was: ${drawWordText(data.draw_word_idx)}`;

    const list = document.getElementById('draw-reveal-correct-list');
    if (list) {
      const guesses = data.draw_guesses || [];
      list.innerHTML = guesses.length ? guesses.map(g => `
        <span class="draw-correct-avatar-badge">${avatarHtmlFor(g)}<span class="draw-rank-tag">+${DRAW_GUESS_POINTS[g.rank - 1] || 0}</span></span>
      `).join('') : '<p class="hint-text">No one guessed it this round.</p>';
    }

    const hostControls = document.getElementById('draw-reveal-host-controls');
    const waitingText = document.getElementById('draw-reveal-waiting-text');
    if (hostControls) hostControls.style.display = isHost ? 'block' : 'none';
    if (waitingText) waitingText.style.display = isHost ? 'none' : 'block';
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
    if (timeLeft <= 0) {
      // Memory Match scores partial credit for pairs found - submit
      // whatever was found so far instead of letting it default to 0
      // when the server records a silent timeout.
      if (!isHost && currentGameFormat === 'memory' && !answeredThisQuestion) submitMemoryResult(lastQIdx);
      if (localTickTimer) { clearInterval(localTickTimer); localTickTimer = null; }
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
    if (currentGameFormat !== 'classic' && currentGameFormat !== 'survival') { bar.style.display = 'none'; return; }
    const me = data.players.find(p => p.device_id === deviceId);
    if (currentGameFormat === 'survival' && me && me.eliminated) { bar.style.display = 'none'; return; }
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
    if (currentGameFormat !== 'classic' && currentGameFormat !== 'survival') { banner.style.display = 'none'; return; }
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

    submitAnswerWithRecovery({
      room_code: roomCode,
      device_id: deviceId,
      q_idx: lastQIdx,
      choice_idx: choiceIdx,
      is_correct: isCorrect,
      time_taken: currentTimeTaken
    }, unlockChoices, res => {
      playLocalFeedbackSound(isCorrect);
      showWaitingFeedback(isCorrect, res.points, question, res.streak, res.doubled);
    });
  }

  function lockChoices(selectedIdx, question) {
    for (let i = 0; i < 4; i++) {
      const btn = document.getElementById(`c${i}`);
      btn.disabled = true;
      if (i === selectedIdx) btn.classList.add(question.choices[i] === question.answer ? 'correct' : 'wrong');
    }
  }

  function unlockChoices() {
    for (let i = 0; i < 4; i++) {
      const btn = document.getElementById(`c${i}`);
      if (btn) { btn.disabled = false; btn.classList.remove('correct', 'wrong'); }
    }
  }

  function playLocalFeedbackSound(isCorrect) {
    if (typeof App !== 'undefined' && App.playSound) App.playSound(isCorrect ? 'correct' : 'wrong');
  }

  function showWaitingFeedback(isCorrect, points, question, streak, doubled) {
    App.goTo('feedback');
    // Memory Match awards partial credit for pairs found even on an
    // incomplete board, so "wrong but scored points" needs its own label
    // instead of looking like a flat zero-point miss.
    const partial = !isCorrect && points > 0;
    document.getElementById('fb-icon').className = 'feedback-icon ' + (isCorrect ? 'correct' : partial ? 'partial' : 'wrong');
    document.getElementById('fb-icon').textContent = isCorrect ? '✓' : partial ? '½' : '✗';
    document.getElementById('fb-verdict').textContent = isCorrect ? 'Correct!' : partial ? 'Partial Credit!' : 'Incorrect!';
    document.getElementById('fb-pts').textContent = points > 0 ? `+${points}` : '0 pts';
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

  // Resolves the "correct answer" text shown to a player who timed out
  // without answering. Classic/truefalse/scramble share q.answer, but
  // Two Truths and Higher or Lower derive their content client-side.
  function timeoutAnswerInfo(q, qIdx, dbIndex) {
    if (currentGameFormat === 'twotruths') {
      const round = getTwoTruthsRound(dbIndex);
      return { answer: round.statements[round.lieIndex], reference: round.reference || '' };
    }
    if (currentGameFormat === 'higherlower') {
      const pair = getHigherLowerPair(dbIndex);
      const sides = higherLowerSides(qIdx, pair);
      const correctSide = sides[0].value > sides[1].value ? 0 : 1;
      return { answer: `${sides[correctSide].label}: ${sides[correctSide].value.toLocaleString()}`, reference: pair.reference || '' };
    }
    if (currentGameFormat === 'versefill') {
      const round = getVerseFillRound(dbIndex);
      return { answer: round.answer, reference: round.reference || '' };
    }
    if (currentGameFormat === 'emojiclue') {
      const round = getEmojiClueRound(dbIndex);
      return { answer: round.display, reference: round.reference || '' };
    }
    return { answer: q.answer, reference: q.reference || '' };
  }

  // ---------------- ANSWER REVEAL ----------------
  function enterReveal(data) {
    const q = lookupQuestion(data.current_question);
    if (isHost) {
      // Host stays on the question screen, sees the correct answer highlighted
      // alongside the live monitor of everyone's final answers.
      if (currentGameFormat === 'truefalse') {
        const tf = buildTrueFalseStatement(q, data.current_question.q_idx);
        const btn = document.getElementById(tf.isTrue ? 'tf-true' : 'tf-false');
        if (btn) btn.classList.add('reveal-correct');
      } else if (currentGameFormat === 'classic' || currentGameFormat === 'survival') {
        const correctIdx = q.choices.indexOf(q.answer);
        for (let i = 0; i < 4; i++) {
          const btn = document.getElementById(`c${i}`);
          if (i === correctIdx) btn.classList.add('reveal-correct');
        }
      }
      renderHostMonitor(data);
      return;
    }
    // If I never answered (timeout), still show feedback with 0 points
    if (!document.getElementById('screen-feedback').classList.contains('active')) {
      const myPlayer = data.players.find(p => p.device_id === deviceId);
      const wasEliminated = currentGameFormat === 'survival' && !!(myPlayer && myPlayer.eliminated);
      App.goTo('feedback');
      document.getElementById('fb-icon').className = 'feedback-icon wrong';
      document.getElementById('fb-icon').textContent = wasEliminated ? '💀' : '✗';
      document.getElementById('fb-verdict').textContent = wasEliminated ? 'Spectating' : 'Time\'s Up!';
      document.getElementById('fb-pts').textContent = '0 pts';
      const fallbackInfo = timeoutAnswerInfo(q, data.current_question.q_idx, data.current_question.db_index);
      document.getElementById('fb-answer').textContent = fallbackInfo.answer;
      document.getElementById('fb-reference').textContent = fallbackInfo.reference;
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
    const reveal = (currentGameFormat === 'classic' || currentGameFormat === 'survival') ? data.answer_reveal : null;
    renderDistribution('fb-distribution', reveal);
    renderDistribution('host-distribution', reveal);
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
      const eliminatedBadge = p.eliminated ? `<span class="lb-eliminated">💀</span>` : '';
      item.innerHTML = `
        <span class="lb-rank">${rank}</span>
        ${avatarHtml}
        <span class="lb-name">${escapeHtml(p.name)}</span>
        ${streakBadge}${eliminatedBadge}
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
      if (currentGameFormat === 'impostor') {
        document.getElementById('results-sub').textContent = `🕵️ Word Impostor • ${data.room.impostor_round} Round${data.room.impostor_round > 1 ? 's' : ''} • Multiplayer`;
      } else if (currentGameFormat === 'draw') {
        document.getElementById('results-sub').textContent = `🎨 Sketch & Guess • ${data.room.draw_round} Turn${data.room.draw_round > 1 ? 's' : ''} • Multiplayer`;
      } else if (currentGameFormat === 'scrab') {
        const rounds = Math.max(1, (data.room.scrab_round || 1));
        document.getElementById('results-sub').textContent = `🕎 Bible Scrabble • ${rounds} Turn${rounds !== 1 ? 's' : ''} • Multiplayer`;
      } else {
        const bookLabel = currentBook === 'ALL'
          ? (currentTestament === 'ot' ? 'Old Testament' : currentTestament === 'nt' ? 'New Testament' : 'All Books')
          : currentBook;
        const sourceLabel = currentQuizMode === 'book' && currentBook && currentCategory
          ? `${bookLabel} • ${currentCategory}`
          : currentDifficulty.toUpperCase();
        document.getElementById('results-sub').textContent =
          `${sourceLabel} • ${data.room.question_count} Questions • Multiplayer`;
      }
      renderImpostorResultBanner(data);
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
      game_format: room.game_format || 'classic',
      difficulty: room.difficulty,
      quizMode: room.quiz_mode,
      book: room.book,
      category: room.category,
      testament: room.testament,
      mode: isHost ? 'host' : 'join',
      questionCount: room.question_count,
      players: sorted.map(p => ({
        name: p.name, avatar: p.avatar, score: p.score, correct: p.correct || 0, wrong: p.wrong || 0,
        accuracy: room.question_count > 0 ? Math.round(((p.correct || 0) / room.question_count) * 100) : 0,
        avgResponseTime: ((p.correct || 0) + (p.wrong || 0)) > 0 ? (p.total_time || 0) / ((p.correct || 0) + (p.wrong || 0)) : 0
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

  // ============================================================
  // BIBLE SCRABBLE
  // ============================================================
  const PREMIUM_LABELS = { tw:'Covenant\n×3W', dw:'Prophet\n×2W', tl:'Scroll\n×3L', dl:'Lamp\n×2L', star:'⭐', '':'' };
  const PREMIUM_CLASSES = { tw:'sq-tw', dw:'sq-dw', tl:'sq-tl', dl:'sq-dl', star:'sq-star', '':'' };

  function enterScrabPlace(data) {
    scrabPendingCells = [];
    scrabSelectedRackIdx = null;
    scrabDidInitialScroll = false;
    scrabBoardData = data.scrab_board ? [...data.scrab_board] : Array(121).fill(null);
    scrabMyRack = data.my_scrab_rack ? [...data.my_scrab_rack] : [];
    scrabIsMyTurn = !!data.am_i_scrab_turn;
    App.goTo('scrab-place');
    renderScrabScoreBar(data);
    renderScrabBoard();
    renderScrabRack();
    updateScrabStatusBar(data);
    renderScrabPlaysFeed(data.scrab_recent_plays || []);
    const actionsEl = document.getElementById('scrab-actions');
    if (actionsEl) actionsEl.style.display = scrabIsMyTurn ? 'flex' : 'none';
    const hostCtrl = document.getElementById('scrab-host-controls');
    if (hostCtrl) hostCtrl.style.display = isHost ? 'flex' : 'none';
    startScrabTimer(data);
  }

  function updateScrabPlace(data) {
    if (!scrabIsMyTurn) {
      scrabBoardData = data.scrab_board ? [...data.scrab_board] : scrabBoardData;
    }
    scrabIsMyTurn = !!data.am_i_scrab_turn;
    if (scrabIsMyTurn && data.my_scrab_rack) scrabMyRack = [...data.my_scrab_rack];
    renderScrabBoard();
    renderScrabRack();
    renderScrabScoreBar(data);
    updateScrabStatusBar(data);
    renderScrabPlaysFeed(data.scrab_recent_plays || []);
    const actionsEl = document.getElementById('scrab-actions');
    if (actionsEl) actionsEl.style.display = scrabIsMyTurn ? 'flex' : 'none';
    startScrabTimer(data);
  }

  function enterScrabWordResult(data) {
    stopScrabTimer();
    App.goTo('scrab-word-result');
    const wr = data.scrab_word_result;
    if (!wr) return;
    const wordEl = document.getElementById('scrab-result-word');
    const scoreEl = document.getElementById('scrab-result-score');
    const bonusEl = document.getElementById('scrab-result-bonus');
    const noteEl  = document.getElementById('scrab-result-note');
    if (wordEl) wordEl.textContent = wr.word;
    if (scoreEl) scoreEl.textContent = `+${wr.score} points`;
    if (bonusEl) bonusEl.textContent = wr.bonus ? `🎉 ${wr.bonus}` : '';
    // Look up the note from the local word list
    let note = '';
    if (typeof ScrabbleWords !== 'undefined') {
      const info = ScrabbleWords.getInfo(wr.word);
      if (info) note = info.note;
    }
    if (noteEl) noteEl.textContent = note;
  }

  function renderScrabBoard() {
    const table = document.getElementById('scrab-board');
    if (!table) return;
    const SQ = (typeof ScrabbleWords !== 'undefined') ? ScrabbleWords.PREMIUM_GRID : Array(121).fill('');
    const pendingMap = {};
    scrabPendingCells.forEach(c => { pendingMap[c.row * 11 + c.col] = c; });

    let html = '';
    for (let r = 0; r < 11; r++) {
      html += '<tr>';
      for (let c = 0; c < 11; c++) {
        const idx = r * 11 + c;
        const sq  = SQ[idx] || '';
        const boardLetter = scrabBoardData ? scrabBoardData[idx] : null;
        const pending = pendingMap[idx];

        if (pending) {
          const pts = (typeof ScrabbleWords !== 'undefined') ? ScrabbleWords.letterValue(pending.letter) : 0;
          html += `<td class="pending-tile" data-row="${r}" data-col="${c}" onclick="Scrabble.cellTap(${r},${c})">
            ${escapeHtml(pending.letter)}<span class="tile-pts">${pts}</span></td>`;
        } else if (boardLetter) {
          const pts = (typeof ScrabbleWords !== 'undefined') ? ScrabbleWords.letterValue(boardLetter) : 0;
          html += `<td class="placed-tile" data-row="${r}" data-col="${c}">
            ${escapeHtml(boardLetter)}<span class="tile-pts">${pts}</span></td>`;
        } else {
          const sqClass = PREMIUM_CLASSES[sq] || '';
          const sqLabel = sq && sq !== 'star' ? `<span class="sq-label">${(PREMIUM_LABELS[sq]||'').replace('\n','<br>')}</span>` : '';
          html += `<td class="${sqClass}" data-row="${r}" data-col="${c}" onclick="Scrabble.cellTap(${r},${c})">${sqLabel}</td>`;
        }
      }
      html += '</tr>';
    }
    table.innerHTML = html;

    // Scroll to center (5,5) only once when first entering the screen
    if (!scrabDidInitialScroll) {
      scrabDidInitialScroll = true;
      const td = table.querySelector('[data-row="5"][data-col="5"]');
      if (td) td.scrollIntoView({ block: 'center', inline: 'center' });
    }
  }

  function renderScrabRack(exchangeMode) {
    const rackId = exchangeMode ? 'scrab-exchange-rack' : 'scrab-rack';
    const container = document.getElementById(rackId);
    if (!container) return;
    const LV = (typeof ScrabbleWords !== 'undefined') ? ScrabbleWords.LETTER_VALUES : {};
    const pendingRackIndices = new Set(scrabPendingCells.map(c => c.rackIdx));

    container.innerHTML = '';
    scrabMyRack.forEach((letter, idx) => {
      const isBlank = letter === '';
      const displayLetter = isBlank ? '?' : letter;
      const pts = LV[letter] ?? 0;
      const isSelected = scrabSelectedRackIdx === idx;
      const isUsed = pendingRackIndices.has(idx);
      const btn = document.createElement('button');
      btn.className = 'scrab-tile' +
        (isBlank ? ' blank-tile' : '') +
        (isSelected ? ' selected' : '') +
        (isUsed ? ' used' : '');
      btn.disabled = (!exchangeMode && !scrabIsMyTurn) || isUsed;
      btn.innerHTML = `${escapeHtml(displayLetter)}<span class="tile-pts">${pts}</span>`;
      if (exchangeMode) {
        btn.onclick = () => toggleExchangeTile(idx);
      } else {
        btn.onclick = () => Scrabble.selectRackTile(idx);
      }
      container.appendChild(btn);
    });
  }

  let scrabExchangeIndices = new Set();
  function toggleExchangeTile(idx) {
    if (scrabExchangeIndices.has(idx)) scrabExchangeIndices.delete(idx);
    else scrabExchangeIndices.add(idx);
    const container = document.getElementById('scrab-exchange-rack');
    if (!container) return;
    container.querySelectorAll('.scrab-tile').forEach((btn, i) => {
      btn.classList.toggle('selected', scrabExchangeIndices.has(i));
    });
  }

  function renderScrabScoreBar(data) {
    const bar = document.getElementById('scrab-score-bar');
    if (!bar || !data.players) return;
    const currentId = data.scrab_current_player ? data.scrab_current_player.device_id : null;
    bar.innerHTML = (data.players || [])
      .filter(p => !p.is_host)
      .map(p => `<div class="scrab-player-score ${p.device_id === currentId ? 'active-turn' : ''}">
        <span class="ps-avatar">${p.avatar || '👤'}</span>
        <span class="ps-name">${escapeHtml(p.name)}</span>
        <span class="ps-pts">${p.score || 0}</span>
      </div>`)
      .join('');
  }

  function updateScrabStatusBar(data) {
    const turnEl  = document.getElementById('scrab-turn-badge');
    const bagEl   = document.getElementById('scrab-bag-badge');
    if (turnEl) {
      const cp = data.scrab_current_player;
      turnEl.textContent = data.am_i_scrab_turn
        ? '🎯 Your turn!'
        : cp ? `${cp.avatar || '👤'} ${cp.name}'s turn` : '';
    }
    if (bagEl) bagEl.textContent = `🎒 ${data.scrab_tiles_in_bag ?? '?'} tiles`;
  }

  function startScrabTimer(data) {
    stopScrabTimer();
    const limit = (data.scrab_time_limit || 90) * 1000;
    const elapsed = data.scrab_turn_elapsed_ms || 0;
    let remaining = Math.max(0, limit - elapsed);
    const timerEl = document.getElementById('scrab-timer-badge');
    if (!timerEl) return;
    const tick = () => {
      const secs = Math.ceil(remaining / 1000);
      timerEl.textContent = `⏱ ${secs}s`;
      timerEl.classList.toggle('urgent', secs <= 15);
      if (remaining <= 0) { stopScrabTimer(); return; }
      remaining -= 500;
    };
    tick();
    scrabTimerInterval = setInterval(tick, 500);
  }

  function stopScrabTimer() {
    if (scrabTimerInterval) { clearInterval(scrabTimerInterval); scrabTimerInterval = null; }
  }

  function renderScrabPlaysFeed(plays) {
    const feed = document.getElementById('scrab-plays-feed');
    if (!feed) return;
    if (!plays.length) { feed.innerHTML = ''; return; }
    feed.innerHTML = plays.map(p => `
      <div class="scrab-play-row">
        <span>${p.avatar || '👤'}</span>
        <span><strong>${escapeHtml(p.name)}</strong></span>
        <span class="scrab-play-word">${escapeHtml(p.word)}</span>
        <span class="scrab-play-score">+${p.score}pts</span>
        ${p.bonus ? `<span class="scrab-play-bonus">🎉${escapeHtml(p.bonus)}</span>` : ''}
      </div>`).join('');
    feed.scrollTop = feed.scrollHeight;
  }

  // Public Scrabble namespace
  const Scrabble = {
    selectRackTile(idx) {
      if (!scrabIsMyTurn) return;
      if (scrabSelectedRackIdx === idx) {
        scrabSelectedRackIdx = null;
      } else {
        scrabSelectedRackIdx = idx;
      }
      renderScrabRack();
    },

    cellTap(row, col) {
      if (!scrabIsMyTurn) return;
      const idx = row * 11 + col;

      // Check if this cell has a pending tile → return to rack
      const pendingIdx = scrabPendingCells.findIndex(c => c.row === row && c.col === col);
      if (pendingIdx !== -1) {
        scrabPendingCells.splice(pendingIdx, 1);
        if (scrabSelectedRackIdx === null) scrabSelectedRackIdx = null;
        renderScrabBoard();
        renderScrabRack();
        updateSubmitBtn();
        return;
      }

      // Must have a tile selected
      if (scrabSelectedRackIdx === null) return;
      // Cell must be empty on the real board
      if (scrabBoardData && scrabBoardData[idx] !== null) return;

      const letter = scrabMyRack[scrabSelectedRackIdx];
      const isBlank = letter === '';

      if (isBlank) {
        // Prompt for letter assignment
        const assigned = (prompt('Blank tile — which letter?') || '').toUpperCase().trim();
        if (!assigned || !/^[A-Z]$/.test(assigned)) return;
        scrabPendingCells.push({ row, col, letter: assigned, rackIdx: scrabSelectedRackIdx, isBlank: true });
      } else {
        scrabPendingCells.push({ row, col, letter: letter.toUpperCase(), rackIdx: scrabSelectedRackIdx, isBlank: false });
      }

      scrabSelectedRackIdx = null;
      renderScrabBoard();
      renderScrabRack();
      updateSubmitBtn();
    },

    clearPending() {
      scrabPendingCells = [];
      scrabSelectedRackIdx = null;
      renderScrabBoard();
      renderScrabRack();
      updateSubmitBtn();
    },

    async submitWord() {
      if (!scrabPendingCells.length) return;
      const btn = document.getElementById('scrab-submit-btn');
      if (btn) btn.disabled = true;
      try {
        const res = await api('scrab_submit_word.php', {
          room_code: roomCode,
          device_id: deviceId,
          cells: scrabPendingCells.map(c => ({
            row: c.row, col: c.col, letter: c.letter, rack_idx: c.rackIdx, is_blank: c.isBlank
          }))
        });
        if (!res.success) {
          App.showToast(res.error || 'Invalid placement', 'error');
          if (btn) btn.disabled = false;
          return;
        }
        scrabPendingCells = [];
        scrabSelectedRackIdx = null;
        // Update rack locally before next poll
        scrabMyRack = res.new_rack || [];
        renderScrabRack();
      } catch (e) {
        App.showToast('Network error', 'error');
        if (btn) btn.disabled = false;
      }
    },

    async passTurn() {
      if (!confirm('Pass your turn?')) return;
      await api('scrab_pass_turn.php', { room_code: roomCode, device_id: deviceId });
      scrabPendingCells = [];
      scrabSelectedRackIdx = null;
    },

    openExchange() {
      scrabExchangeIndices = new Set();
      renderScrabRack(true);
      App.goTo('scrab-exchange');
    },

    async confirmExchange() {
      if (!scrabExchangeIndices.size) { App.showToast('Select at least one tile', 'error'); return; }
      const res = await api('scrab_exchange_tiles.php', {
        room_code: roomCode,
        device_id: deviceId,
        indices: [...scrabExchangeIndices]
      });
      if (!res.success) { App.showToast(res.error || 'Exchange failed', 'error'); return; }
      scrabMyRack = res.new_rack || [];
      scrabExchangeIndices = new Set();
      App.goTo('scrab-place');
      renderScrabRack();
    },

    _helpTimer: null,
    _helpPinned: false,

    openHelp() {
      clearTimeout(Scrabble._helpTimer);
      const ov = document.getElementById('scrab-help-overlay');
      if (ov) ov.style.display = 'flex';
    },

    scheduleCloseHelp() {
      if (Scrabble._helpPinned) return;
      Scrabble._helpTimer = setTimeout(() => {
        const ov = document.getElementById('scrab-help-overlay');
        if (ov) ov.style.display = 'none';
      }, 300);
    },

    toggleHelp() {
      const ov = document.getElementById('scrab-help-overlay');
      if (!ov) return;
      if (Scrabble._helpPinned) {
        Scrabble._helpPinned = false;
        clearTimeout(Scrabble._helpTimer);
        ov.style.display = 'none';
      } else {
        Scrabble._helpPinned = true;
        Scrabble.openHelp();
      }
    },

    closeHelp(event) {
      if (event && event.target !== document.getElementById('scrab-help-overlay')) return;
      Scrabble.forceCloseHelp();
    },

    forceCloseHelp() {
      Scrabble._helpPinned = false;
      clearTimeout(Scrabble._helpTimer);
      const ov = document.getElementById('scrab-help-overlay');
      if (ov) ov.style.display = 'none';
    },
  };

  function updateSubmitBtn() {
    const btn = document.getElementById('scrab-submit-btn');
    if (btn) btn.disabled = scrabPendingCells.length === 0;
  }

  // ─────────────────────────────────────────────────────────
  //  BIBLE WORD HUNT
  // ─────────────────────────────────────────────────────────

  // Player color palette for found-word highlighting (up to 10 players)
  const WH_COLORS = ['#1a6b3a','#1a3a8b','#8b1a1a','#7a4a00','#4a1a6b','#00586b','#5c6b00','#6b005a','#00456b','#6b3000'];

  function enterWordhuntActive(data) {
    wordhuntGrid = data.wordhunt_grid || [];
    wordhuntFound = data.wordhunt_found || {};
    wordhuntIsMyTurn = !!data.am_i_wordhunt_turn;
    wordhuntTouchStart = null;
    wordhuntTouchDir = null;
    wordhuntTouchCells = [];
    // Reset binding flag each round so new containers get listeners
    wordhuntTouchBound = false;
    App.goTo('wordhunt-active');
    renderWordhuntGrid();
    renderWordhuntScoreBar(data);
    renderWordhuntFeed(data.wordhunt_recent_claims || []);
    updateWordhuntBadges(data);
    updateWordhuntTurnBanner(data);
    renderWordhuntDirHint(data);
    const hc = document.getElementById('wordhunt-host-controls');
    if (hc) hc.style.display = isHost ? 'flex' : 'none';
    bindWordhuntTouch();
    startWordhuntTimer(data);
  }

  function updateWordhuntActive(data) {
    const newFound = data.wordhunt_found || {};
    const foundChanged = Object.keys(newFound).length !== Object.keys(wordhuntFound).length;
    wordhuntFound = newFound;
    wordhuntIsMyTurn = !!data.am_i_wordhunt_turn;
    // Only re-render grid cells when found-word set actually changed
    if (foundChanged) applyWordhuntFoundColors();
    renderWordhuntScoreBar(data);
    renderWordhuntFeed(data.wordhunt_recent_claims || []);
    updateWordhuntBadges(data);
    updateWordhuntTurnBanner(data);
    renderWordhuntDirHint(data);
    startWordhuntTimer(data);
  }

  function enterWordhuntRoundResult(data) {
    stopWordhuntTimer();
    wordhuntUnclaimed = data.wordhunt_unclaimed || [];
    App.goTo('wordhunt-round-result');

    const titleEl  = document.getElementById('wordhunt-round-result-title');
    const scoresEl = document.getElementById('wordhunt-round-scores');
    const revealSec = document.getElementById('wordhunt-reveal-section');
    const hostCtrl  = document.getElementById('wordhunt-round-host-controls');
    const waitEl    = document.getElementById('wordhunt-round-waiting');
    const proceedBtn = document.getElementById('wordhunt-proceed-btn');

    const round = data.wordhunt_round || 1;
    const total = data.wordhunt_rounds_total || 3;
    const isLastRound = round >= total;

    if (titleEl) titleEl.textContent = `Round ${round} of ${total} — Results`;

    if (scoresEl) {
      const scores = data.wordhunt_round_scores || [];
      if (scores.length === 0) {
        scoresEl.innerHTML = '<p class="hint-text" style="text-align:center">No words found this round.</p>';
      } else {
        scoresEl.innerHTML = scores.map((s, i) => `
          <div class="wh-result-row">
            <span class="wh-result-rank">#${i + 1}</span>
            <span class="wh-result-avatar">${escapeHtml(s.avatar)}</span>
            <span class="wh-result-name">${escapeHtml(s.name)}</span>
            <span class="wh-result-words">${s.words_found} word${s.words_found !== 1 ? 's' : ''}</span>
            <span class="wh-result-pts">+${s.round_pts} pts</span>
          </div>`).join('');
      }
    }

    // Reset reveal section
    if (revealSec) revealSec.style.display = 'none';

    // Host controls vs waiting message
    if (hostCtrl) hostCtrl.style.display = isHost ? 'flex' : 'none';
    if (waitEl) waitEl.style.display = isHost ? 'none' : '';
    if (proceedBtn) proceedBtn.textContent = isLastRound ? '🏁 View Final Scores' : '▶ Next Round';

    // Show reveal section immediately if there are unclaimed words
    if (wordhuntUnclaimed.length > 0 && revealSec) {
      // Keep hidden until host clicks Reveal, but pre-fill the list
      renderWordhuntUnclaimedList();
    }
  }

  function renderWordhuntUnclaimedList() {
    const listEl = document.getElementById('wordhunt-unclaimed-list');
    if (!listEl) return;
    listEl.innerHTML = wordhuntUnclaimed.map(w =>
      `<span class="wh-unclaimed-word">${escapeHtml(w.word)}</span>`
    ).join('');
  }

  function revealWordhuntWords() {
    const revealSec = document.getElementById('wordhunt-reveal-section');
    if (revealSec) {
      renderWordhuntUnclaimedList();
      revealSec.style.display = '';
    }
    // Also highlight unclaimed cells on the grid (grid is still in memory)
    const table = document.getElementById('wordhunt-grid');
    if (table && wordhuntUnclaimed.length > 0) {
      wordhuntUnclaimed.forEach(w => {
        for (let i = 0; i < w.len; i++) {
          const r = w.row + i * w.dr;
          const c = w.col + i * w.dc;
          const cell = table.querySelector(`td[data-row="${r}"][data-col="${c}"]`);
          if (cell) cell.classList.add('wh-unclaimed');
        }
      });
    }
  }

  function renderWordhuntGrid() {
    const table = document.getElementById('wordhunt-grid');
    if (!table || wordhuntGrid.length !== 200) return;
    let html = '';
    for (let r = 0; r < 20; r++) {
      html += '<tr>';
      for (let c = 0; c < 10; c++) {
        const letter = wordhuntGrid[r * 10 + c] || '';
        html += `<td data-row="${r}" data-col="${c}">${escapeHtml(letter)}</td>`;
      }
      html += '</tr>';
    }
    table.innerHTML = html;
    applyWordhuntFoundColors();
  }

  // Color cells of found words using dr/dc direction vectors from the server.
  // wordhuntFound[word] = { row, col, dr, dc, len, color_idx }
  function applyWordhuntFoundColors() {
    const table = document.getElementById('wordhunt-grid');
    if (!table) return;
    Object.entries(wordhuntFound).forEach(([, info]) => {
      const { row, col, dr, dc, len, color_idx } = info;
      if (row === undefined || col === undefined || dr === undefined) return;
      const colorClass = `wh-c${color_idx || 0}`;
      for (let i = 0; i < len; i++) {
        const r = row + i * dr;
        const c = col + i * dc;
        const cell = table.querySelector(`td[data-row="${r}"][data-col="${c}"]`);
        if (cell) cell.classList.add('wh-found', colorClass);
      }
    });
  }

  function updateWordhuntBadges(data) {
    const roundBadge = document.getElementById('wordhunt-round-badge');
    const foundBadge = document.getElementById('wordhunt-found-badge');
    if (roundBadge) roundBadge.textContent = `Round ${data.wordhunt_round || 1}/${data.wordhunt_rounds_total || 3}`;
    if (foundBadge) foundBadge.textContent = `${data.wordhunt_found_count || 0}/${data.wordhunt_words_count || '?'} found`;
  }

  function updateWordhuntTurnBanner(data) {
    const banner = document.getElementById('wordhunt-turn-banner');
    if (!banner) return;
    if ((data.wordhunt_mode || 'race') === 'turn') {
      const cp = data.wordhunt_current_player;
      if (cp) {
        if (data.am_i_wordhunt_turn) {
          banner.innerHTML = `<strong>Your turn!</strong> Swipe a hidden word to claim it.`;
          banner.style.background = 'rgba(212,170,80,0.15)';
          banner.style.color = 'var(--gold)';
        } else {
          banner.innerHTML = `${escapeHtml(cp.avatar)} <strong>${escapeHtml(cp.name)}</strong> is searching…`;
          banner.style.background = '';
          banner.style.color = '';
        }
      }
      banner.style.display = '';
    } else {
      banner.style.display = 'none';
    }
  }

  function startWordhuntTimer(data) {
    stopWordhuntTimer();
    const badge = document.getElementById('wordhunt-timer-badge');
    if (!badge) return;
    const mode = data.wordhunt_mode || 'race';
    const limitMs = (data.wordhunt_time_limit || 180) * 1000;
    const elapsedMs = data.wordhunt_elapsed_ms || 0;
    const turnLimitMs = 45000;
    const turnElapsedMs = data.wordhunt_turn_elapsed_ms || 0;

    function tick() {
      const nowElapsed = elapsedMs + (Date.now() - tickStart);
      let remainMs;
      if (mode === 'turn') {
        remainMs = Math.max(0, turnLimitMs - (turnElapsedMs + (Date.now() - tickStart)));
      } else {
        remainMs = Math.max(0, limitMs - nowElapsed);
      }
      const secs = Math.ceil(remainMs / 1000);
      const m = Math.floor(secs / 60);
      const s = secs % 60;
      badge.textContent = `${m}:${String(s).padStart(2, '0')}`;
      badge.classList.toggle('urgent', secs <= 15);
    }
    const tickStart = Date.now();
    tick();
    wordhuntTimerInterval = setInterval(tick, 500);
  }

  function stopWordhuntTimer() {
    if (wordhuntTimerInterval) { clearInterval(wordhuntTimerInterval); wordhuntTimerInterval = null; }
  }

  function renderWordhuntScoreBar(data) {
    const bar = document.getElementById('wordhunt-score-bar');
    if (!bar) return;
    const players = (data.players || []).filter(p => !p.is_host);
    bar.innerHTML = players.map((p, i) => `
      <div class="wordhunt-player-score">
        <span class="wh-avatar" style="background:${WH_COLORS[i % 10]}20;border-color:${WH_COLORS[i % 10]}">${escapeHtml(p.avatar)}</span>
        <span class="wh-name">${escapeHtml(p.name.split(' ')[0])}</span>
        <span class="wh-pts">${p.score}</span>
      </div>`).join('');
  }

  function renderWordhuntFeed(claims) {
    const feed = document.getElementById('wordhunt-feed');
    if (!feed) return;
    feed.innerHTML = claims.map(c => `
      <div class="wh-feed-row">
        <span>${escapeHtml(c.avatar)}</span>
        <span class="wh-feed-word">${escapeHtml(c.word)}</span>
        <span class="wh-feed-pts">+${c.score}</span>
        ${c.bonus ? `<span class="wh-feed-bonus">${escapeHtml(c.bonus)}</span>` : ''}
      </div>`).join('') || '<p class="hint-text" style="font-size:0.75rem;margin:0.25rem">Swipe to find Bible words!</p>';
    feed.scrollTop = feed.scrollHeight;
  }

  const WH_DIR_LABELS = {
    '0_1': '→', '0_-1': '←', '1_0': '↓', '-1_0': '↑',
    '1_1': '↘', '1_-1': '↙', '-1_1': '↗', '-1_-1': '↖'
  };
  const WH_DIR_ORDER = ['0_1', '0_-1', '1_0', '-1_0', '1_1', '1_-1', '-1_1', '-1_-1'];

  function renderWordhuntDirHint(data) {
    const hint = document.getElementById('wordhunt-dir-hint');
    if (!hint) return;
    const counts = data.wordhunt_dir_counts || {};
    const parts = WH_DIR_ORDER
      .filter(key => counts[key])
      .map(key => `<span class="wh-dir-chip">${counts[key]}<span class="wh-dir-arrow">${WH_DIR_LABELS[key]}</span></span>`);
    hint.innerHTML = parts.length ? parts.join('') : '';
  }

  function bindWordhuntTouch() {
    if (wordhuntTouchBound) return;
    wordhuntTouchBound = true;
    const container = document.getElementById('wordhunt-grid-container');
    if (!container) return;

    container.addEventListener('touchstart', whTouchStart, { passive: false });
    container.addEventListener('touchmove',  whTouchMove,  { passive: false });
    container.addEventListener('touchend',   whTouchEnd,   { passive: false });
    container.addEventListener('touchcancel',whTouchCancel,{ passive: false });
  }

  function whCellFromPoint(x, y) {
    const table = document.getElementById('wordhunt-grid');
    if (!table) return null;
    const el = document.elementFromPoint(x, y);
    if (!el) return null;
    const td = el.closest('td[data-row]');
    if (!td) return null;
    return { row: parseInt(td.dataset.row, 10), col: parseInt(td.dataset.col, 10) };
  }

  function whHighlightCells(cells) {
    const table = document.getElementById('wordhunt-grid');
    if (!table) return;
    table.querySelectorAll('td.wh-swipe').forEach(td => td.classList.remove('wh-swipe'));
    cells.forEach(({ row, col }) => {
      const td = table.querySelector(`td[data-row="${row}"][data-col="${col}"]`);
      if (td) td.classList.add('wh-swipe');
    });
  }

  function whTouchStart(e) {
    const touch = e.touches[0];
    const cell = whCellFromPoint(touch.clientX, touch.clientY);
    if (!cell) return;
    e.preventDefault();
    wordhuntTouchStart = cell;
    wordhuntTouchStartX = touch.clientX;
    wordhuntTouchStartY = touch.clientY;
    wordhuntLastScrollY = touch.clientY;
    wordhuntTouchDir = null;
    wordhuntTouchCells = [cell];
    wordhuntScrolling = false;
    whHighlightCells([cell]);
  }

  function whTouchMove(e) {
    if (!wordhuntTouchStart) return;
    e.preventDefault();
    const touch = e.touches[0];
    const absDx = Math.abs(touch.clientX - wordhuntTouchStartX);
    const absDy = Math.abs(touch.clientY - wordhuntTouchStartY);

    // Decide scroll vs word-select on the first significant movement
    if (!wordhuntTouchDir && !wordhuntScrolling) {
      if (absDx < 4 && absDy < 4) return; // not moved enough yet
      // Primarily vertical with little horizontal → manual grid scroll
      if (absDy > absDx * 2.5 && absDy > 12) {
        wordhuntScrolling = true;
      }
    }

    if (wordhuntScrolling) {
      const container = document.getElementById('wordhunt-grid-container');
      if (container) container.scrollTop += wordhuntLastScrollY - touch.clientY;
      wordhuntLastScrollY = touch.clientY;
      return;
    }

    // Word-selection mode — determine / maintain direction
    const cell = whCellFromPoint(touch.clientX, touch.clientY);
    if (!cell) return;

    if (!wordhuntTouchDir) {
      // Haven't locked direction yet — try to lock on current cell
      if (cell.row === wordhuntTouchStart.row && cell.col === wordhuntTouchStart.col) return;
      const dRow = cell.row - wordhuntTouchStart.row;
      const dCol = cell.col - wordhuntTouchStart.col;
      const sR = Math.sign(dRow);
      const sC = Math.sign(dCol);
      const aR = Math.abs(dRow);
      const aC = Math.abs(dCol);
      if (aR === 0 && aC > 0)      wordhuntTouchDir = { dr: 0,  dc: sC };  // horizontal
      else if (aC === 0 && aR > 0) wordhuntTouchDir = { dr: sR, dc: 0  };  // vertical
      else if (aR === aC)          wordhuntTouchDir = { dr: sR, dc: sC };  // diagonal
      else return; // ambiguous — wait for cleaner direction
    }

    const { dr, dc } = wordhuntTouchDir;

    // How many steps from start to current cell in locked direction
    let steps;
    if (dr === 0)      steps = Math.abs(cell.col - wordhuntTouchStart.col);
    else if (dc === 0) steps = Math.abs(cell.row - wordhuntTouchStart.row);
    else               steps = Math.min(Math.abs(cell.row - wordhuntTouchStart.row),
                                        Math.abs(cell.col - wordhuntTouchStart.col));

    // Finger moved backward? clamp to zero (show only start cell)
    if (dr !== 0 && steps > 0 && Math.sign(cell.row - wordhuntTouchStart.row) !== dr) steps = 0;
    if (dc !== 0 && steps > 0 && Math.sign(cell.col - wordhuntTouchStart.col) !== dc) steps = 0;

    const cells = [];
    for (let i = 0; i <= steps; i++) {
      const r = wordhuntTouchStart.row + i * dr;
      const c = wordhuntTouchStart.col + i * dc;
      if (r < 0 || r >= 20 || c < 0 || c >= 10) break;
      cells.push({ row: r, col: c });
    }
    if (cells.length > 0) {
      wordhuntTouchCells = cells;
      whHighlightCells(cells);
    }
  }

  function whTouchEnd(e) {
    e.preventDefault();
    const cells = wordhuntTouchCells.slice();
    wordhuntTouchStart = null;
    wordhuntTouchDir = null;
    wordhuntTouchCells = [];
    wordhuntScrolling = false;
    whHighlightCells([]);
    if (cells.length < 3) return;
    submitWordhuntSwipe(cells);
  }

  function whTouchCancel(e) {
    wordhuntTouchStart = null;
    wordhuntTouchDir = null;
    wordhuntTouchCells = [];
    wordhuntScrolling = false;
    whHighlightCells([]);
  }

  function submitWordhuntSwipe(cells) {
    if (!roomCode || !deviceId) return;
    fetch('api/wordhunt_claim.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ room_code: roomCode, device_id: deviceId, cells })
    })
    .then(r => r.json())
    .then(res => {
      if (res.success) {
        App.showToast(`✅ ${res.word} — +${res.score} pts${res.bonus ? ' ' + res.bonus : ''}`, 'success');
        if (res.note) App.showToast(`📖 ${res.word}: ${res.note}`, 'info', 3000);
        poll();
      } else {
        if (res.error && res.error !== 'Not a Bible word — keep searching!') {
          App.showToast(res.error, 'error');
        } else {
          // Shake the grid briefly on invalid word
          const container = document.getElementById('wordhunt-grid-container');
          if (container) {
            container.classList.add('wh-shake');
            setTimeout(() => container.classList.remove('wh-shake'), 400);
          }
        }
      }
    })
    .catch(() => {});
  }

  const WordHunt = {
    forceNext()   { if (typeof HostGame !== 'undefined') HostGame.wordhuntForceNext(); },
    forceEnd()    { if (typeof HostGame !== 'undefined') HostGame.wordhuntForceEnd(); },
    revealWords() { revealWordhuntWords(); },
    proceed()     { if (typeof HostGame !== 'undefined') HostGame.wordhuntProceed(); }
  };
  window.WordHunt = WordHunt;

  // Expose Scrabble as global for onclick= handlers
  window.Scrabble = Scrabble;

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
    setRoomCode(code) { roomCode = code; },
    get roomCode() { return roomCode; },
    get deviceId() { return deviceId; },
    get isHost() { return isHost; }
  };
})();
