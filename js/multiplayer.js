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
      if (hintEl) hintEl.textContent = round.type === 'character'
        ? '🧍 Character — answer in ONE word'
        : '📖 Bible Event — answer in 2-3 words';
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

    api('submit_answer.php', {
      room_code: roomCode,
      device_id: deviceId,
      q_idx: lastQIdx,
      choice_idx: selectedBool ? 1 : 0,
      is_correct: isCorrect,
      time_taken: currentTimeTaken
    }).then(res => {
      if (res.success) {
        playLocalFeedbackSound(isCorrect);
        showWaitingFeedback(isCorrect, res.points, question, res.streak, res.doubled);
      }
    });
  }

  function lockTrueFalse(selectedBool, tf) {
    const trueBtn = document.getElementById('tf-true');
    const falseBtn = document.getElementById('tf-false');
    [trueBtn, falseBtn].forEach(b => { if (b) { b.disabled = true; b.onclick = null; } });
    const selectedBtn = selectedBool ? trueBtn : falseBtn;
    if (selectedBtn) selectedBtn.classList.add(selectedBool === tf.isTrue ? 'correct' : 'wrong');
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

    api('submit_answer.php', {
      room_code: roomCode,
      device_id: deviceId,
      q_idx: lastQIdx,
      choice_idx: 0,
      is_correct: isCorrect,
      time_taken: currentTimeTaken
    }).then(res => {
      if (res.success) {
        playLocalFeedbackSound(isCorrect);
        showWaitingFeedback(isCorrect, res.points, question, res.streak, res.doubled);
      }
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

    api('submit_answer.php', {
      room_code: roomCode,
      device_id: deviceId,
      q_idx: qIdx,
      choice_idx: memoryPairsFound,
      is_correct: isCorrect,
      time_taken: currentTimeTaken,
      total_pairs: memoryTotalPairs
    }).then(res => {
      if (res.success) {
        playLocalFeedbackSound(isCorrect);
        showWaitingFeedback(isCorrect, res.points, { answer: `${memoryPairsFound}/${memoryTotalPairs} pairs found`, reference: '' }, res.streak, res.doubled);
      }
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

    api('submit_answer.php', {
      room_code: roomCode,
      device_id: deviceId,
      q_idx: qIdx,
      choice_idx: pickedPos,
      is_correct: isCorrect,
      time_taken: currentTimeTaken
    }).then(res => {
      if (res.success) {
        playLocalFeedbackSound(isCorrect);
        showWaitingFeedback(isCorrect, res.points, { answer: round.statements[round.lieIndex], reference: round.reference }, res.streak, res.doubled);
      }
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

    api('submit_answer.php', {
      room_code: roomCode,
      device_id: deviceId,
      q_idx: qIdx,
      choice_idx: pickedSide,
      is_correct: isCorrect,
      time_taken: currentTimeTaken
    }).then(res => {
      if (res.success) {
        playLocalFeedbackSound(isCorrect);
        showWaitingFeedback(isCorrect, res.points, { answer: `${sides[correctSide].label}: ${sides[correctSide].value.toLocaleString()}`, reference: pair.reference }, res.streak, res.doubled);
      }
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

    api('submit_answer.php', {
      room_code: roomCode,
      device_id: deviceId,
      q_idx: qIdx,
      choice_idx: 0,
      is_correct: isCorrect,
      time_taken: currentTimeTaken
    }).then(res => {
      if (res.success) {
        playLocalFeedbackSound(isCorrect);
        showWaitingFeedback(isCorrect, res.points, { answer: round.answer, reference: round.reference }, res.streak, res.doubled);
      }
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
    if (round.type === 'character' && wordCount !== 1) {
      App.showToast('Character answers are one word only', 'error');
      return;
    }
    if (round.type === 'event' && (wordCount < 2 || wordCount > 3)) {
      App.showToast('Bible Event answers are 2-3 words', 'error');
      return;
    }

    answeredThisQuestion = true;
    const elapsedMs = sync.serverElapsedMs + (Date.now() - sync.clientTimeAtSync);
    currentTimeTaken = Math.min(sync.timeLimitSec, elapsedMs / 1000);
    const isCorrect = matchesAnyAnswer(typed, round.answers);

    lockEmojiClue(isCorrect, round, typed);

    api('submit_answer.php', {
      room_code: roomCode,
      device_id: deviceId,
      q_idx: qIdx,
      choice_idx: 0,
      is_correct: isCorrect,
      time_taken: currentTimeTaken
    }).then(res => {
      if (res.success) {
        playLocalFeedbackSound(isCorrect);
        showWaitingFeedback(isCorrect, res.points, { answer: round.display, reference: round.reference }, res.streak, res.doubled);
      }
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
