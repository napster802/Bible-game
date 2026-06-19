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
  let roomCode = null;
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

    // Admin-uploaded CSV questions load async; re-render once they're in so
    // pool counts/hints and the server-side pool_size reflect the full bank.
    if (typeof CustomQuestions !== 'undefined') {
      CustomQuestions.ready().then(() => {
        updatePoolHint();
        if (quizMode === 'book') syncBookCategory();
      });
    }
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
    const run = () => {
      action('start_game', { exclude_indices: computeExcludeIndices() }).then(res => {
        if (!res.success) App.showToast(res.error || 'Could not start game', 'error', 5000);
      });
    };
    if (typeof CustomQuestions !== 'undefined') CustomQuestions.ready().then(run);
    else run();
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

  function leaveLobby() {
    Multiplayer.stop();
    roomCode = null;
    App.goTo('home');
  }

  return {
    createRoom,
    onEnterHostLobby,
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
    leaveLobby,
    get roomCode() { return roomCode; }
  };
})();
