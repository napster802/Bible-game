/* ============================================================
   Bible Challenge Arena - Join Game Module
   Validates a room code against api/join_room.php, then hands
   control to Multiplayer.start(code, false) for lobby/question
   sync. Players never see host-only controls.
   ============================================================ */
const JoinGame = (function () {
  const API = 'api/';
  const ROOM_LIST_POLL_MS = 3000;

  const FORMAT_INFO = {
    classic:     { icon: '📚', label: 'Classic' },
    truefalse:   { icon: '⚡', label: 'Lightning True/False' },
    scramble:    { icon: '🔤', label: 'Word Scramble' },
    survival:    { icon: '💀', label: 'Sudden Death Survival' },
    memory:      { icon: '🧠', label: 'Memory Match' },
    twotruths:   { icon: '🤥', label: 'Two Truths and a Lie' },
    higherlower: { icon: '📊', label: 'Higher or Lower' },
    versefill:   { icon: '📖', label: 'Verse Fill-in-the-Blank' },
    emojiclue:   { icon: '🌊', label: 'Emoji Story Clue' },
    impostor:    { icon: '🕵️', label: 'Word Impostor' },
    draw:        { icon: '🎨', label: 'Sketch & Guess' }
  };

  let roomListTimer = null;

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
    const pendingCode = sessionStorage.getItem('bca_pending_join_code');
    sessionStorage.removeItem('bca_pending_join_code');
    if (input) input.value = pendingCode || '';
    if (error) error.textContent = '';
    if (pendingCode) {
      attemptJoin();
      return;
    }
    startRoomListPoll();
  }

  function startRoomListPoll() {
    stopRoomListPoll();
    loadRoomList();
    roomListTimer = setInterval(loadRoomList, ROOM_LIST_POLL_MS);
  }

  function stopRoomListPoll() {
    if (roomListTimer) { clearInterval(roomListTimer); roomListTimer = null; }
  }

  function loadRoomList() {
    fetch(API + 'list_rooms.php')
      .then(r => r.json())
      .then(res => {
        if (res && res.success) renderRoomList(res.rooms || []);
      })
      .catch(() => { /* keep showing the last known list on a blip */ });
  }

  function renderRoomList(rooms) {
    const list = document.getElementById('join-room-list');
    const empty = document.getElementById('join-room-list-empty');
    if (!list) return;
    list.innerHTML = '';
    if (empty) empty.style.display = rooms.length ? 'none' : '';
    rooms.forEach(room => {
      const info = FORMAT_INFO[room.game_format] || FORMAT_INFO.classic;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'room-list-item';
      btn.innerHTML = `
        <span class="room-list-item-icon">${info.icon}</span>
        <span class="room-list-item-info">
          <span class="room-list-item-host">${escapeHtml(room.host_name || 'Host')}'s Room</span>
          <span class="room-list-item-meta">${info.label} • ${room.player_count} player${room.player_count === 1 ? '' : 's'} waiting</span>
        </span>
        <span class="room-list-item-arrow">›</span>
      `;
      btn.onclick = () => joinRoom(room.code);
      list.appendChild(btn);
    });
  }

  function joinRoom(code) {
    const profile = Profile.get();
    if (!profile) { App.goTo('profile'); return; }

    const error = document.getElementById('join-error');
    if (error) error.textContent = '';

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
      stopRoomListPoll();
      App.goTo('join-wait');
      Multiplayer.start(code, false);
    }).catch(err => {
      if (error) error.textContent = 'Could not reach the host server: ' + err.message;
    });
  }

  function attemptJoin() {
    const input = document.getElementById('join-code-input');
    const error = document.getElementById('join-error');
    const code = input ? input.value.trim().toUpperCase() : '';

    if (!/^\d{6}$/.test(code)) {
      if (error) error.textContent = 'Enter the 6-digit room code.';
      return;
    }
    joinRoom(code);
  }

  function leaveJoinEntry() {
    stopRoomListPoll();
    App.goTo('home');
  }

  function leaveLobby() {
    stopRoomListPoll();
    Multiplayer.stop();
    App.goTo('home');
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  return {
    onEnterJoinEntry,
    attemptJoin,
    leaveJoinEntry,
    leaveLobby
  };
})();
