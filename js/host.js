/* ============================================================
   Bible Challenge Arena - Host Game Module
   Creates a room on api/create_room.php, then hands control to
   Multiplayer.start(code, true) for lobby/question sync. Exposes
   the host-only controls (start, difficulty/count pickers,
   remove player, force reveal, next question, end game) that
   multiplayer.js wires into the shared screens.
   ============================================================ */
const HostGame = (function () {
  const API = 'api/';
  const SHARE_IP_KEY = 'bca_hotspot_ip';
  let roomCode = null;
  let gameFormat = 'classic';
  let quizMode = 'difficulty';
  let selectedDifficulty = 'easy';
  let selectedBook = null;
  let selectedCategory = null;
  let selectedTestament = 'all';

  function api(path, body) {
    return fetch(API + path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    }).then(r => r.json());
  }

  function action(act, extra) {
    if (!roomCode) return Promise.resolve({ success: false });
    return api('host_action.php', Object.assign({
      room_code: roomCode,
      device_id: Profile.getDeviceId(),
      action: act
    }, extra || {}));
  }

  function createRoom() {
    const profile = Profile.get();
    if (!profile) { App.goTo('profile'); return; }

    api('create_room.php', {
      device_id: profile.deviceId,
      name: profile.name,
      avatar: profile.avatar
    }).then(res => {
      if (!res.success) {
        App.showToast(res.error || 'Could not create room', 'error');
        return;
      }
      roomCode = res.room_code;
      gameFormat = 'classic';
      quizMode = 'difficulty';
      selectedDifficulty = 'easy';
      selectedBook = null;
      selectedCategory = null;
      selectedTestament = 'all';
      App.goTo('host-lobby');
      Multiplayer.start(roomCode, true);
    }).catch(err => App.showToast('Could not reach the host server: ' + err.message, 'error', 5000));
  }

  function onEnterHostLobby() {
    const formatSelect = document.getElementById('host-format-select');
    if (formatSelect) formatSelect.value = gameFormat;
    if (typeof GameInstructions !== 'undefined') GameInstructions.render(gameFormat, 'host-instructions-box');

    const modeSelect = document.getElementById('host-mode-select');
    if (modeSelect) modeSelect.value = quizMode;

    const testamentSelect = document.getElementById('host-testament-select');
    if (testamentSelect) testamentSelect.value = selectedTestament;

    populateBookSelect();

    const categorySelect = document.getElementById('host-category-select');
    if (categorySelect && typeof BookQuestions !== 'undefined' && !categorySelect.options.length) {
      BookQuestions.ANSWER_CATEGORIES.forEach(cat => {
        const opt = document.createElement('option');
        opt.value = cat.id;
        opt.textContent = cat.label;
        categorySelect.appendChild(opt);
      });
    }

    toggleBookRows();
    toggleLobbySettingsForFormat();
    renderShare();

    // Admin-uploaded CSV questions load async; re-render once they're in so
    // pool counts/hints and the server-side pool_size reflect the full bank.
    if (typeof CustomQuestions !== 'undefined') {
      CustomQuestions.ready().then(() => {
        updatePoolHint();
        if (quizMode === 'book') syncBookCategory();
      });
    }
  }

  // Returns the host's LAN-reachable hostname when the host's own browser
  // is already loaded from one (i.e. not localhost) — other devices on the
  // same hotspot/WiFi can reach that same address. Falls back to null when
  // the host loaded the app via localhost/127.0.0.1, which only resolves
  // back to the host's own device for everyone else.
  function detectAutoHost() {
    const h = window.location.hostname;
    return (h && h !== 'localhost' && h !== '127.0.0.1') ? h : null;
  }

  function buildShareLink(host) {
    if (!host || !roomCode) return '';
    const port = window.location.port ? ':' + window.location.port : '';
    return window.location.protocol + '//' + host + port + window.location.pathname + '?code=' + roomCode;
  }

  function renderShare() {
    const autoHost = detectAutoHost();
    const ipRow = document.getElementById('share-ip-row');
    const ipHint = document.getElementById('share-ip-hint');
    const ipInput = document.getElementById('share-ip-input');

    if (ipRow) ipRow.style.display = autoHost ? 'none' : '';
    if (ipHint) ipHint.style.display = autoHost ? 'none' : '';
    if (ipInput && !autoHost && !ipInput.value) {
      ipInput.value = localStorage.getItem(SHARE_IP_KEY) || '';
    }

    const manualHost = ipInput ? ipInput.value.trim() : '';
    const link = buildShareLink(autoHost || manualHost);

    const linkInput = document.getElementById('share-link-input');
    if (linkInput) linkInput.value = link || 'Enter your hotspot IP above to generate a link';

    renderShareQr(link);
  }

  function renderShareQr(link) {
    const box = document.getElementById('share-qr-box');
    if (!box) return;
    box.innerHTML = '';
    if (!link || typeof qrcode === 'undefined') return;
    const qr = qrcode(0, 'M');
    qr.addData(link);
    qr.make();
    box.innerHTML = qr.createSvgTag(5);
  }

  function setShareIp(value) {
    localStorage.setItem(SHARE_IP_KEY, value.trim());
    renderShare();
  }

  function copyShareLink() {
    const linkInput = document.getElementById('share-link-input');
    if (!linkInput || !linkInput.value.startsWith('http')) {
      App.showToast('Enter your hotspot IP first', 'error');
      return;
    }
    navigator.clipboard.writeText(linkInput.value).then(() => {
      App.showToast('Link copied!', 'success');
    }).catch(() => {
      linkInput.select();
      App.showToast('Select and copy the link manually', 'error');
    });
  }

  // Rebuilds the Book dropdown for the current testament scope, always
  // offering "All Books" first so a host can pool across books when a
  // single book's category pool is too small.
  function populateBookSelect() {
    const bookSelect = document.getElementById('host-book-select');
    if (!bookSelect || typeof BookQuestions === 'undefined') return;
    const prevValue = selectedBook || bookSelect.value;
    bookSelect.innerHTML = '';

    const allOpt = document.createElement('option');
    allOpt.value = 'ALL';
    allOpt.textContent = 'All Books';
    bookSelect.appendChild(allOpt);

    const books = selectedTestament === 'ot' ? BookQuestions.OT_BOOKS
      : selectedTestament === 'nt' ? BookQuestions.NT_BOOKS
      : BookQuestions.BIBLE_BOOKS;
    books.forEach(book => {
      const opt = document.createElement('option');
      opt.value = book;
      opt.textContent = book;
      bookSelect.appendChild(opt);
    });

    bookSelect.value = (prevValue === 'ALL' || books.includes(prevValue)) ? prevValue : 'ALL';
    selectedBook = bookSelect.value;
  }

  function toggleBookRows() {
    const bookRow = document.getElementById('host-book-row');
    const categoryRow = document.getElementById('host-category-row');
    const testamentRow = document.getElementById('host-testament-row');
    const display = quizMode === 'book' ? '' : 'none';
    if (bookRow) bookRow.style.display = display;
    if (categoryRow) categoryRow.style.display = display;
    if (testamentRow) testamentRow.style.display = display;
    updatePoolHint();
  }

  function scopeLabel() {
    if (selectedBook !== 'ALL') return selectedBook;
    return selectedTestament === 'ot' ? 'Old Testament (All Books)'
      : selectedTestament === 'nt' ? 'New Testament (All Books)'
      : 'the whole Bible (All Books)';
  }

  // Identifies the current pool for "already asked" tracking purposes -
  // see js/question_tracker.js. Same shape regardless of quiz mode.
  function currentPoolKey() {
    return QuestionTracker.poolKey({
      mode: quizMode,
      testament: selectedTestament,
      book: selectedBook,
      category: selectedCategory,
      difficulty: selectedDifficulty
    });
  }

  function renderPoolHint(hint, pool, label) {
    hint.style.display = '';
    if (!pool.length) {
      hint.textContent = `No questions available for ${label} — try another combination`;
      return;
    }
    const asked = typeof QuestionTracker !== 'undefined' ? QuestionTracker.getAsked(currentPoolKey()) : new Set();
    const fresh = pool.filter(q => !asked.has(q.question)).length;
    if (fresh > 0) {
      hint.textContent = `${fresh} of ${pool.length} fresh question${pool.length === 1 ? '' : 's'} available for ${label}` +
        (fresh < pool.length ? ` (${pool.length - fresh} already played)` : '');
    } else {
      hint.textContent = `You've played all ${pool.length} question${pool.length === 1 ? '' : 's'} for ${label}. Try a different book, category, or difficulty — or tap Clear All Progress below.`;
    }
  }

  function updatePoolHint() {
    const hint = document.getElementById('host-book-pool-hint');
    if (hint) {
      if (quizMode !== 'book' || !selectedBook || !selectedCategory || typeof BookQuestions === 'undefined') {
        hint.style.display = 'none';
      } else {
        renderPoolHint(hint, BookQuestions.getPool(selectedBook, selectedCategory, selectedDifficulty, selectedTestament), `${scopeLabel()} • ${selectedCategory}`);
      }
    }
    updateDiffPoolHint();
  }

  function updateDiffPoolHint() {
    const hint = document.getElementById('host-diff-pool-hint');
    if (!hint) return;
    if (quizMode !== 'difficulty' || typeof QUESTION_DB === 'undefined') {
      hint.style.display = 'none';
      return;
    }
    renderPoolHint(hint, QUESTION_DB[selectedDifficulty] || [], `${selectedDifficulty} difficulty`);
  }

  function syncBookCategory() {
    if (!selectedBook || !selectedCategory) return;
    const poolSize = typeof BookQuestions !== 'undefined' ? BookQuestions.getCount(selectedBook, selectedCategory, selectedDifficulty, selectedTestament) : 0;
    updatePoolHint();
    action('set_book_category', { book: selectedBook, category: selectedCategory, pool_size: poolSize, testament: selectedTestament });
  }

  function setGameFormat(format) {
    gameFormat = ['truefalse', 'scramble', 'survival', 'memory', 'twotruths', 'higherlower', 'versefill', 'emojiclue', 'impostor', 'draw', 'scrab'].includes(format) ? format : 'classic';
    if (typeof GameInstructions !== 'undefined') GameInstructions.render(gameFormat, 'host-instructions-box');
    toggleLobbySettingsForFormat();
    action('set_game_format', { value: gameFormat });
  }

  // Word Impostor and Sketch & Guess have no question pool/difficulty/timer
  // settings at all, so the trivia-only lobby controls (source/difficulty/
  // count/CSV upload) hide as a single block instead of being shown but meaningless.
  function toggleLobbySettingsForFormat() {
    const isImpostor = gameFormat === 'impostor';
    const isDraw = gameFormat === 'draw';
    const isScrab = gameFormat === 'scrab';
    const triviaSettings = document.getElementById('host-trivia-settings');
    const csvBox = document.getElementById('host-csv-upload-box');
    const impHint = document.getElementById('host-impostor-hint');
    const drawHint = document.getElementById('host-draw-hint');
    const drawRoundsRow = document.getElementById('host-draw-rounds-row');
    const scrabHint = document.getElementById('host-scrab-hint');
    const scrabTimeRow = document.getElementById('host-scrab-time-row');
    if (triviaSettings) triviaSettings.style.display = (isImpostor || isDraw || isScrab) ? 'none' : '';
    if (csvBox) csvBox.style.display = (isImpostor || isDraw || isScrab) ? 'none' : '';
    if (impHint) impHint.style.display = isImpostor ? '' : 'none';
    if (drawHint) drawHint.style.display = isDraw ? '' : 'none';
    if (drawRoundsRow) drawRoundsRow.style.display = isDraw ? '' : 'none';
    if (scrabHint) scrabHint.style.display = isScrab ? '' : 'none';
    if (scrabTimeRow) scrabTimeRow.style.display = isScrab ? '' : 'none';
  }

  function setScrabTimeLimit(seconds) {
    action('set_scrab_time_limit', { value: seconds });
  }

  function scrabForceSkip() {
    action('scrab_force_skip', {});
  }

  function scrabEndGame() {
    if (!confirm('End the Scrabble game now and tally final scores?')) return;
    action('scrab_end_game', {});
  }

  function setDrawRounds(rounds) {
    action('set_draw_rounds', { value: parseInt(rounds, 10) === 2 ? 2 : 1 });
  }

  function setDifficulty(diff) {
    selectedDifficulty = diff;
    action('set_difficulty', { value: diff });
    if (quizMode === 'book') syncBookCategory();
    else updatePoolHint();
  }

  function setQuestionCount(count) {
    action('set_question_count', { value: count });
  }

  function setQuizMode(mode) {
    quizMode = (mode === 'book') ? 'book' : 'difficulty';
    action('set_quiz_mode', { value: quizMode });
    toggleBookRows();
    if (quizMode === 'book') {
      populateBookSelect();
      const categorySelect = document.getElementById('host-category-select');
      if (!selectedCategory && categorySelect) selectedCategory = categorySelect.value;
      syncBookCategory();
    }
  }

  function setTestament(value) {
    selectedTestament = (value === 'ot' || value === 'nt') ? value : 'all';
    populateBookSelect();
    syncBookCategory();
  }

  function setBook(book) {
    selectedBook = book;
    syncBookCategory();
  }

  function setCategory(category) {
    selectedCategory = category;
    syncBookCategory();
  }

  // Looks up the exact pool the server will index into for this game, and
  // returns the positions of any questions this browser already played in
  // that pool, so start_game can exclude them and avoid repeats.
  function computeExcludeIndices() {
    if (typeof QuestionTracker === 'undefined') return [];
    const pool = quizMode === 'book'
      ? (typeof BookQuestions !== 'undefined' ? BookQuestions.getPool(selectedBook, selectedCategory, selectedDifficulty, selectedTestament) : [])
      : (typeof QUESTION_DB !== 'undefined' ? (QUESTION_DB[selectedDifficulty] || []) : []);
    if (!pool.length) return [];
    const asked = QuestionTracker.getAsked(currentPoolKey());
    const excluded = [];
    pool.forEach((q, i) => { if (asked.has(q.question)) excluded.push(i); });
    return excluded;
  }

  function startGame() {
    // Word Impostor and Sketch & Guess have no question pool to track
    // "already played" against, so they skip straight past the
    // CSV-ready/exclude-indices dance entirely.
    if (gameFormat === 'impostor' || gameFormat === 'draw') {
      action('start_game', {}).then(res => {
        if (!res.success) App.showToast(res.error || 'Could not start game', 'error', 5000);
      });
      return;
    }
    const run = () => {
      action('start_game', { exclude_indices: computeExcludeIndices() }).then(res => {
        if (!res.success) App.showToast(res.error || 'Could not start game', 'error', 5000);
      });
    };
    if (typeof CustomQuestions !== 'undefined') CustomQuestions.ready().then(run);
    else run();
  }

  // ---- Word Impostor host controls (no timer - every transition here is explicit) ----
  function startImpostorVoting() {
    action('impostor_start_voting');
  }

  function nextImpostorRound() {
    action('impostor_next_round');
  }

  function forceAdvanceImpostor() {
    action('impostor_force_advance').then(res => {
      if (!res.success) App.showToast(res.error || 'Nothing to advance', 'error');
    });
  }

  function resolveImpostorTiebreak(targetDeviceId) {
    action('impostor_resolve_tiebreak', { target_device_id: targetDeviceId || '' });
  }

  // ---- Sketch & Guess host controls ----
  function nextDrawTurn() {
    action('draw_next_turn').then(res => {
      if (!res.success) App.showToast(res.error || 'Could not advance', 'error');
    });
  }

  function forceAdvanceDraw() {
    action('draw_force_advance').then(res => {
      if (!res.success) App.showToast(res.error || 'Nothing to advance', 'error');
    });
  }

  function clearAllProgress() {
    if (!window.confirm('Clear all question progress? Every question across every book, category, and difficulty will be eligible to repeat again.')) return;
    if (typeof QuestionTracker !== 'undefined') QuestionTracker.clearAll();
    updatePoolHint();
    App.showToast('Progress cleared! All questions are fresh again.', 'success');
  }

  function downloadCsvTemplate() {
    const header = ['book', 'category', 'difficulty', 'question', 'choice1', 'choice2', 'choice3', 'choice4', 'answer', 'reference'];
    const example = ['Genesis', 'character', 'easy', 'Who was the first man created by God?', 'Adam', 'Noah', 'Abraham', 'David', 'Adam', 'Genesis 2:7'];
    const csv = [header, example].map(row =>
      row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
    ).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'bible-challenge-questions-template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function handleCsvFileSelected(event) {
    const file = event.target.files && event.target.files[0];
    event.target.value = '';
    if (!file) return;

    const resultEl = document.getElementById('host-csv-result');
    if (resultEl) resultEl.textContent = 'Uploading…';

    const reader = new FileReader();
    reader.onload = () => {
      api('upload_questions.php', { admin_passcode: Admin.getPasscode(), csv_text: reader.result })
        .then(res => {
          if (!res.success) {
            if (resultEl) resultEl.textContent = res.error || 'Upload failed';
            App.showToast(res.error || 'Upload failed', 'error');
            return;
          }
          const msg = `${res.inserted} question${res.inserted === 1 ? '' : 's'} added` +
            (res.failed ? `, ${res.failed} row${res.failed === 1 ? '' : 's'} skipped` : '');
          if (resultEl) {
            resultEl.textContent = msg + (res.errors && res.errors.length ? ' — ' + res.errors.slice(0, 3).join('; ') : '');
          }
          App.showToast(msg, res.inserted > 0 ? 'success' : 'error', 4000);
          if (res.inserted > 0 && typeof CustomQuestions !== 'undefined') {
            CustomQuestions.refresh().then(() => {
              populateBookSelect();
              updatePoolHint();
            });
          }
        })
        .catch(err => {
          if (resultEl) resultEl.textContent = 'Upload failed: ' + err.message;
          App.showToast('Could not reach the host server: ' + err.message, 'error', 5000);
        });
    };
    reader.readAsText(file);
  }

  function nextQuestion() {
    action('next_question').then(res => {
      if (!res.success) App.showToast(res.error || 'Could not advance', 'error');
    });
  }

  function forceReveal() {
    action('force_reveal');
  }

  function endGame() {
    action('end_game').then(() => Multiplayer.poll());
  }

  function removePlayer(targetDeviceId) {
    action('remove_player', { target_device_id: targetDeviceId });
  }

  function setCustomRoomCode() {
    const input = document.getElementById('host-custom-code-input');
    const error = document.getElementById('host-custom-code-error');
    const newCode = input ? input.value.trim() : '';
    if (error) error.textContent = '';

    if (!/^\d{1,6}$/.test(newCode)) {
      if (error) error.textContent = 'Enter up to 6 digits.';
      return;
    }
    if (!roomCode) return;

    api('set_room_code.php', {
      room_code: roomCode,
      device_id: Profile.getDeviceId(),
      new_code: newCode
    }).then(res => {
      if (!res.success) {
        if (error) error.textContent = res.error || 'Could not change the room code.';
        return;
      }
      roomCode = res.room_code;
      Multiplayer.setRoomCode(roomCode);
      if (input) input.value = '';
      renderShare();
      App.showToast('Room code updated!', 'success');
    }).catch(err => {
      if (error) error.textContent = 'Could not reach the host server: ' + err.message;
    });
  }

  function leaveLobby() {
    Multiplayer.stop();
    roomCode = null;
    App.goTo('home');
  }

  return {
    createRoom,
    onEnterHostLobby,
    setGameFormat,
    setDifficulty,
    setQuestionCount,
    setQuizMode,
    setTestament,
    setBook,
    setCategory,
    startGame,
    clearAllProgress,
    downloadCsvTemplate,
    handleCsvFileSelected,
    nextQuestion,
    forceReveal,
    endGame,
    removePlayer,
    setCustomRoomCode,
    leaveLobby,
    setShareIp,
    copyShareLink,
    startImpostorVoting,
    nextImpostorRound,
    forceAdvanceImpostor,
    resolveImpostorTiebreak,
    setDrawRounds,
    nextDrawTurn,
    forceAdvanceDraw,
    setScrabTimeLimit,
    scrabForceSkip,
    scrabEndGame,
    get roomCode() { return roomCode; }
  };
})();
