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
      App.goTo('host-lobby');
      Multiplayer.start(roomCode, true);
    }).catch(() => App.showToast('Could not reach the host server', 'error'));
  }

  function setDifficulty(diff) {
    action('set_difficulty', { value: diff });
  }

  function setQuestionCount(count) {
    action('set_question_count', { value: count });
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
    setDifficulty,
    setQuestionCount,
    startGame,
    nextQuestion,
    forceReveal,
    endGame,
    removePlayer,
    leaveLobby,
    get roomCode() { return roomCode; }
  };
})();
