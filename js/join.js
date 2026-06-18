/* ============================================================
   Bible Challenge Arena - Join Game Module
   Validates a room code against api/join_room.php, then hands
   control to Multiplayer.start(code, false) for lobby/question
   sync. Players never see host-only controls.
   ============================================================ */
const JoinGame = (function () {
  const API = 'api/';

  function api(path, body) {
    return fetch(API + path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    }).then(r => r.json());
  }

  function onEnterJoinEntry() {
    const input = document.getElementById('join-code-input');
    const error = document.getElementById('join-error');
    if (input) input.value = '';
    if (error) error.textContent = '';
  }

  function attemptJoin() {
    const profile = Profile.get();
    if (!profile) { App.goTo('profile'); return; }

    const input = document.getElementById('join-code-input');
    const error = document.getElementById('join-error');
    const code = input ? input.value.trim().toUpperCase() : '';

    if (!/^\d{6}$/.test(code)) {
      if (error) error.textContent = 'Enter the 6-digit room code.';
      return;
    }

    api('join_room.php', {
      room_code: code,
      device_id: profile.deviceId,
      name: profile.name,
      avatar: profile.avatar
    }).then(res => {
      if (!res.success) {
        if (error) error.textContent = res.error || 'Could not join room.';
        return;
      }
      App.goTo('join-wait');
      Multiplayer.start(code, false);
    }).catch(() => {
      if (error) error.textContent = 'Could not reach the host server.';
    });
  }

  function leaveLobby() {
    Multiplayer.stop();
    App.goTo('home');
  }

  return {
    onEnterJoinEntry,
    attemptJoin,
    leaveLobby
  };
})();
