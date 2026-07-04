/* ============================================================
   Bible Challenge Arena - Admin Dashboard
   Requires Admin (admin.js) for login gate.
   ============================================================ */
const AdminDash = (function () {

  let allPlayers = [];
  let ptsTarget   = null; // { device_id, name }

  // ── Helpers ──────────────────────────────────────────────
  function api(action, extra) {
    return fetch('api/admin.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(Object.assign({ passcode: '12345678', action }, extra))
    }).then(r => r.json());
  }

  function fmtNum(n) {
    if (n == null) return '0';
    if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
    if (n >= 1000)    return (n / 1000).toFixed(1) + 'k';
    return String(n);
  }

  function timeAgo(ms) {
    if (!ms) return 'never';
    const diff = Date.now() - ms;
    if (diff < 60000)   return 'just now';
    if (diff < 3600000) return Math.floor(diff / 60000) + 'm ago';
    if (diff < 86400000)return Math.floor(diff / 3600000) + 'h ago';
    return Math.floor(diff / 86400000) + 'd ago';
  }

  function escHtml(str) {
    const d = document.createElement('div');
    d.textContent = str || '';
    return d.innerHTML;
  }

  // ── Open / Close ─────────────────────────────────────────
  function open() {
    Admin.requireAdmin(function () {
      document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
      document.getElementById('screen-admin-dash').classList.add('active');
      refresh();
    });
  }

  function close() {
    document.getElementById('screen-admin-dash').classList.remove('active');
    document.getElementById('screen-home').classList.add('active');
  }

  // ── Load data ─────────────────────────────────────────────
  function refresh() {
    loadStats();
    loadPlayers();
  }

  function loadStats() {
    api('get_stats').then(res => {
      if (!res.success) return;
      document.getElementById('adm-online').textContent  = fmtNum(res.online_players);
      document.getElementById('adm-players').textContent = fmtNum(res.total_players);
      document.getElementById('adm-games').textContent   = fmtNum(res.total_games);
      document.getElementById('adm-pts').textContent     = fmtNum(res.total_wallet);
    });
  }

  function loadPlayers() {
    const list = document.getElementById('admin-player-list');
    list.innerHTML = '<div style="text-align:center;opacity:0.5;padding:2rem;">Loading…</div>';
    api('get_players').then(res => {
      if (!res.success) { list.innerHTML = '<div style="color:#e74c3c;padding:1rem;">Failed to load.</div>'; return; }
      allPlayers = res.players || [];
      renderList(allPlayers);
    });
  }

  function filterPlayers(q) {
    const lq = q.toLowerCase();
    renderList(allPlayers.filter(p => p.name.toLowerCase().includes(lq)));
  }

  function renderList(players) {
    const now = Date.now();
    const list = document.getElementById('admin-player-list');
    if (!players.length) {
      list.innerHTML = '<div style="text-align:center;opacity:0.5;padding:2rem;">No players found.</div>';
      return;
    }
    list.innerHTML = players.map(p => {
      const online = p.last_ping && (now - p.last_ping) < 30000;
      const avatarHtml = p.avatar_type === 'photo'
        ? `<img src="${escHtml(p.avatar)}" style="width:2rem;height:2rem;border-radius:50%;object-fit:cover;">`
        : `<span style="font-size:1.6rem;">${escHtml(p.avatar || '👤')}</span>`;
      return `
      <div class="admin-player-row${online ? ' is-online' : ''}" id="adm-row-${escHtml(p.device_id)}">
        <div class="admin-player-avatar">${avatarHtml}</div>
        <div class="admin-player-info">
          <div class="admin-player-name">${escHtml(p.name)}</div>
          <div class="admin-player-meta">${p.total_games || 0} games · ${timeAgo(p.last_ping)}</div>
        </div>
        ${online ? '<div class="admin-online-dot" title="Online"></div>' : ''}
        <div class="admin-player-pts">💰 ${(p.wallet || 0).toLocaleString()}</div>
        <div class="admin-player-actions">
          <button class="admin-action-btn add" onclick="AdminDash.openPtsModal('${escHtml(p.device_id)}','${escHtml(p.name)}')" title="Adjust points">±</button>
          <button class="admin-action-btn del" onclick="AdminDash.confirmDelete('${escHtml(p.device_id)}','${escHtml(p.name)}')" title="Delete player">🗑</button>
        </div>
      </div>`;
    }).join('');
  }

  // ── Points modal ─────────────────────────────────────────
  function openPtsModal(deviceId, name) {
    ptsTarget = { device_id: deviceId, name };
    document.getElementById('admin-pts-modal-title').textContent = 'Adjust Points';
    document.getElementById('admin-pts-modal-sub').textContent   = name;
    document.getElementById('admin-pts-amount').value = '1000';
    document.getElementById('admin-pts-modal').style.display = 'flex';
    document.getElementById('admin-pts-amount').focus();
    document.getElementById('admin-pts-amount').select();
  }

  function closePtsModal() {
    document.getElementById('admin-pts-modal').style.display = 'none';
    ptsTarget = null;
  }

  function applyPts(sign) {
    if (!ptsTarget) return;
    const raw = parseInt(document.getElementById('admin-pts-amount').value, 10);
    if (!raw || raw < 1) { App.showToast('Enter a valid amount.', 'error'); return; }
    const amount = sign * raw;
    api('adjust_points', { device_id: ptsTarget.device_id, amount }).then(res => {
      if (!res.success) { App.showToast(res.error || 'Failed', 'error'); return; }
      App.showToast(`${ptsTarget.name}: now ${res.wallet.toLocaleString()} pts`, 'success');
      closePtsModal();
      // Update row in-place
      const row = document.getElementById('adm-row-' + ptsTarget.device_id);
      if (row) {
        const ptsEl = row.querySelector('.admin-player-pts');
        if (ptsEl) ptsEl.textContent = '💰 ' + res.wallet.toLocaleString();
      }
      // Update allPlayers cache
      const p = allPlayers.find(x => x.device_id === ptsTarget.device_id);
      if (p) p.wallet = res.wallet;
    });
  }

  // ── Delete player ─────────────────────────────────────────
  function confirmDelete(deviceId, name) {
    if (!confirm(`Delete player "${name}"?\nThis removes their profile and all game history.`)) return;
    api('delete_player', { device_id: deviceId }).then(res => {
      if (!res.success) { App.showToast(res.error || 'Failed', 'error'); return; }
      App.showToast(`${name} deleted.`, 'success');
      allPlayers = allPlayers.filter(p => p.device_id !== deviceId);
      const row = document.getElementById('adm-row-' + deviceId);
      if (row) row.remove();
    });
  }

  return { open, close, refresh, filterPlayers, openPtsModal, closePtsModal, applyPts, confirmDelete };
})();
