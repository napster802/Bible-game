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

  function updatePoolHint() {
    const hint = document.getElementById('host-book-pool-hint');
    if (!hint) return;
    if (quizMode !== 'book' || !selectedBook || !selectedCategory || typeof BookQuestions === 'undefined') {
      hint.style.display = 'none';
      return;
    }
    const count = BookQuestions.getCount(selectedBook, selectedCategory, selectedDifficulty, selectedTestament);
    const label = scopeLabel();
    hint.style.display = '';
    hint.textContent = count > 0
      ? `${count} question${count === 1 ? '' : 's'} available for ${label} • ${selectedCategory}`
      : `No questions yet for ${label} • ${selectedCategory} at this difficulty — try another combination`;
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

  function startGame() {
    action('start_game').then(res => {
      if (!res.success) App.showToast(res.error || 'Could not start game', 'error');
    });
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
    nextQuestion,
    forceReveal,
    endGame,
    removePlayer,
    leaveLobby,
    get roomCode() { return roomCode; }
  };
})();
