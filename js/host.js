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
      App.goTo('host-lobby');
      Multiplayer.start(roomCode, true);
    }).catch(err => App.showToast('Could not reach the host server: ' + err.message, 'error', 5000));
  }

  function onEnterHostLobby() {
    const modeSelect = document.getElementById('host-mode-select');
    if (modeSelect) modeSelect.value = quizMode;

    const bookSelect = document.getElementById('host-book-select');
    if (bookSelect && window.BookQuestions && !bookSelect.options.length) {
      BookQuestions.BIBLE_BOOKS.forEach(book => {
        const opt = document.createElement('option');
        opt.value = book;
        opt.textContent = book;
        bookSelect.appendChild(opt);
      });
    }

    const categorySelect = document.getElementById('host-category-select');
    if (categorySelect && window.BookQuestions && !categorySelect.options.length) {
      BookQuestions.ANSWER_CATEGORIES.forEach(cat => {
        const opt = document.createElement('option');
        opt.value = cat.id;
        opt.textContent = cat.label;
        categorySelect.appendChild(opt);
      });
    }

    toggleBookRows();
  }

  function toggleBookRows() {
    const bookRow = document.getElementById('host-book-row');
    const categoryRow = document.getElementById('host-category-row');
    const display = quizMode === 'book' ? '' : 'none';
    if (bookRow) bookRow.style.display = display;
    if (categoryRow) categoryRow.style.display = display;
    updatePoolHint();
  }

  function updatePoolHint() {
    const hint = document.getElementById('host-book-pool-hint');
    if (!hint) return;
    if (quizMode !== 'book' || !selectedBook || !selectedCategory || !window.BookQuestions) {
      hint.style.display = 'none';
      return;
    }
    const count = BookQuestions.getCount(selectedBook, selectedCategory, selectedDifficulty);
    hint.style.display = '';
    hint.textContent = count > 0
      ? `${count} question${count === 1 ? '' : 's'} available for ${selectedBook} • ${selectedCategory}`
      : `No questions yet for ${selectedBook} • ${selectedCategory} at this difficulty — try another combination`;
  }

  function syncBookCategory() {
    if (!selectedBook || !selectedCategory) return;
    const poolSize = window.BookQuestions ? BookQuestions.getCount(selectedBook, selectedCategory, selectedDifficulty) : 0;
    updatePoolHint();
    action('set_book_category', { book: selectedBook, category: selectedCategory, pool_size: poolSize });
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
      const bookSelect = document.getElementById('host-book-select');
      const categorySelect = document.getElementById('host-category-select');
      if (!selectedBook && bookSelect) selectedBook = bookSelect.value;
      if (!selectedCategory && categorySelect) selectedCategory = categorySelect.value;
      syncBookCategory();
    }
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
